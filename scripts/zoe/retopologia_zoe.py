"""
Retopología, texturizado y posturas de ZOE en Blender (4.5 LTS), sin interfaz.

El modelo que entrega Meshy trae la piel hecha de cientos de piezas sueltas (mechones,
solapas, huecos), así que al doblar una pata la malla se abre y se ven agujeros. Este script
reconstruye a ZOE como una sola superficie cerrada y la deja lista para la web:

  1. Remallado por vóxeles (cierra huecos y funde las piezas) y QuadriFlow (cuadros parejos
     que se doblan bien).
  2. UV nuevas y horneado del color y del relieve del pelaje desde el modelo original.
  3. Pesos de piel nuevos sobre el mismo esqueleto, suavizados y limitados a 4 huesos.
  4. Posturas «sit» (sentado) y «lie» (echado) calculadas con cinemática inversa: las patas
     se apoyan en el piso en vez de doblarse a ojo.
  5. Exporta un GLB con la caminata («walk») y las dos posturas.

Uso:
  blender -b --factory-startup --python scripts/zoe/retopologia_zoe.py -- \
      entrada.glb salida.glb [--renders carpeta] [--caras 16000] [--voxel 0.0026] [--pesos calor|transferencia]

Con --renders deja capturas de cada postura y de la caminata para revisarlas antes de publicar.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

# ─── Parámetros ─────────────────────────────────────────────────────────────

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def option(name, default):
    if name in ARGS:
        return type(default)(ARGS[ARGS.index(name) + 1])
    return default


SOURCE, TARGET = ARGS[0], ARGS[1]
RENDERS = option("--renders", "")
TARGET_FACES = option("--caras", 26000)
VOXEL = option("--voxel", 0.0018)  # metros, con ZOE a su tamaño real (~33 cm de alto): fino para conservar barba y cejas
WEIGHTS = option("--pesos", "calor")
TEXTURE_SIZE = option("--textura", 2048)

# El perro mira hacia -Y, el eje lateral es X y Z es arriba (convención de Blender).
LATERAL = Vector((1, 0, 0))
FORWARD = Vector((0, -1, 0))

# Posturas. Las alturas están en metros sobre el piso; los ángulos, en grados.
# Posturas tomadas de perros reales y de animación de referencia («PIP», «Andy: A Dog's Tale»,
# perro en cinta a cámara lenta). Alturas en metros sobre el piso (ZOE mide ~33 cm a la cruz).
SIT = {
    # Sentado: lomo a 40-55°, grupa en el piso, fémur hacia delante, rodilla al frente, corvejón
    # atrás apoyado y metatarso plano; manos verticales; cuello erguido y mirada al frente.
    "pitch": -50,  # se busca la mayor inclinación con la que las manos siguen verticales
    "hip_height": 0.055,
    "hock_back": 0.035,
    "hock_out": 0.016,
    "chest": 0.2,  # fracción de la inclinación que endereza el pecho
    "neck": 0.55,  # y la que reparten cuello y cabeza: así el rostro no se estira
    "head": 0.5,
    "tail": (-15, 10, 8),
    "foot_lift": 0.011,
}
LIE = {
    # Echado como esfinge: codos en el piso, antebrazos planos al frente, patas traseras plegadas
    # junto a la panza con el corvejón atrás; cabeza un poco baja, cola descansando.
    "pitch": -2,
    "hip_height": 0.05,
    "shoulder_height": 0.05,
    "hock_back": 0.045,
    "hock_out": 0.03,
    "neck": 8,  # grados
    "head": 8,
    "tail": (-25, 10, 10),
    "foot_lift": 0.011,
}


# ─── Utilidades ─────────────────────────────────────────────────────────────

def log(*parts):
    print("[ZOE]", *parts, flush=True)


def update():
    bpy.context.view_layer.update()


def activate(obj, *others):
    bpy.ops.object.select_all(action="DESELECT")
    for o in others:
        o.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def mesh_copy(source, name):
    """Copia estática de la malla tal como se ve (con modificadores), en coordenadas del mundo."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    data = bpy.data.meshes.new_from_object(source.evaluated_get(depsgraph))
    data.transform(source.matrix_world)
    copy = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(copy)
    return copy


# ─── 1. Cargar y normalizar ─────────────────────────────────────────────────

def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = next(o for o in bpy.data.objects if o.type == "MESH" and o.parent == arm)
    # El GLB trae una esfera suelta que no es parte del personaje.
    for obj in list(bpy.data.objects):
        if obj not in (arm, body):
            bpy.data.objects.remove(obj)
    # Meshy exporta a escala 0,01: se lleva a tamaño real para que vóxeles y pesos tengan sentido.
    # Se conserva su giro (viene como cuaternión): las posturas se calculan en el mundo y se
    # traducen al espacio de la armadura con ARM / ARM_INV.
    arm.scale = (1, 1, 1)
    arm.location = (0, 0, 0)
    arm.data.pose_position = "REST"
    walk = arm.animation_data.action if arm.animation_data else None
    if walk:
        walk.name = "walk"
        walk.use_fake_user = True
        arm.animation_data.action = None
    update()
    global ARM, ARM_INV
    ARM = arm.matrix_world.copy()
    ARM_INV = ARM.inverted()
    log("cargado:", len(body.data.vertices), "vértices; dimensiones", tuple(round(d, 3) for d in body.dimensions))
    return arm, body, walk


# ─── 2. Retopología ─────────────────────────────────────────────────────────

def keep_largest_shell(obj):
    """Deja solo la piel exterior: las burbujas internas y las migas sueltas se eliminan."""
    import bmesh

    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    mesh.verts.ensure_lookup_table()
    seen, shells = set(), []
    for start in mesh.verts:
        if start.index in seen:
            continue
        stack, shell = [start], []
        seen.add(start.index)
        while stack:
            vert = stack.pop()
            shell.append(vert)
            for edge in vert.link_edges:
                other = edge.other_vert(vert)
                if other.index not in seen:
                    seen.add(other.index)
                    stack.append(other)
        shells.append(shell)
    shells.sort(key=len, reverse=True)
    removed = [v for shell in shells[1:] for v in shell]
    bmesh.ops.delete(mesh, geom=removed, context="VERTS")
    mesh.to_mesh(obj.data)
    mesh.free()
    log("cascarones:", len(shells), "· se conserva el exterior de", len(shells[0]), "vértices")


def retopologize(body):
    high = mesh_copy(body, "zoe_alta")
    low = mesh_copy(body, "zoe")
    # Los vóxeles solo entienden volúmenes cerrados y la piel de Meshy son láminas abiertas:
    # se les da grosor primero para que ninguna quede fuera del remallado.
    thicken = low.modifiers.new("grosor", "SOLIDIFY")
    thicken.thickness = VOXEL * 1.6
    thicken.offset = 0
    thicken.use_even_offset = True
    remesh = low.modifiers.new("vóxeles", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = VOXEL
    remesh.adaptivity = 0
    welded = mesh_copy(low, "zoe_voxel")
    bpy.data.objects.remove(low)
    low = welded
    low.name = "zoe"
    log("vóxeles:", len(low.data.polygons), "caras")

    # QuadriFlow exige una superficie limpia: un solo cascarón, sin vértices duplicados ni
    # normales cruzadas. Los vóxeles dejan burbujas internas donde las láminas se tocaban.
    activate(low)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=VOXEL * 0.05)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    keep_largest_shell(low)
    # Donde dos láminas se rozaban quedan aristas compartidas por más de dos caras: se
    # quitan esos vértices y se tapan los agujeros que dejan.
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="VERT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_non_manifold()
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.fill_holes(sides=0)
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    keep_largest_shell(low)
    before = len(low.data.polygons)
    result = bpy.ops.object.quadriflow_remesh(target_faces=TARGET_FACES, use_mesh_symmetry=True, use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=True, seed=7)
    if "FINISHED" not in result or len(low.data.polygons) == before:
        log("QuadriFlow no terminó; se usa la malla de vóxeles decimada")
        decimate = low.modifiers.new("decimar", "DECIMATE")
        decimate.ratio = min(1.0, TARGET_FACES * 2 / max(1, len(low.data.polygons)))
        reduced = mesh_copy(low, "zoe")
        bpy.data.objects.remove(low)
        low = reduced
    # Devuelve los vértices a la superficie original: QuadriFlow redondea un poco las formas.
    wrap = low.modifiers.new("ajuste", "SHRINKWRAP")
    wrap.target = high
    wrap.wrap_method = "NEAREST_SURFACEPOINT"
    wrap.wrap_mode = "ABOVE_SURFACE"
    smooth = low.modifiers.new("suavizado", "CORRECTIVE_SMOOTH")
    smooth.iterations = 3
    smooth.factor = 0.4
    final = mesh_copy(low, "zoe")
    bpy.data.objects.remove(low)
    low = final
    for poly in low.data.polygons:
        poly.use_smooth = True
    log("retopología:", len(low.data.polygons), "caras,", len(low.data.vertices), "vértices")
    return high, low


# ─── 3. UV y horneado ───────────────────────────────────────────────────────

def unwrap(low):
    activate(low)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.6)
    bpy.ops.uv.pack_islands(margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(high, low):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = VOXEL * 2.5
    scene.render.bake.max_ray_distance = VOXEL * 6
    scene.render.bake.margin = 24  # relleno amplio: sin él, las costuras de las UV se ven como grietas oscuras

    # Meshy marca el material como metálico y el color difuso de un metal es negro: para
    # hornear el color real se apaga el metal en la copia de alta resolución.
    for slot in high.material_slots:
        tree = slot.material.node_tree if slot.material and slot.material.use_nodes else None
        for node in (tree.nodes if tree else []):
            if node.type == "BSDF_PRINCIPLED":
                for link in list(node.inputs["Metallic"].links):
                    tree.links.remove(link)
                node.inputs["Metallic"].default_value = 0.0

    color = bpy.data.images.new("zoe_color", TEXTURE_SIZE, TEXTURE_SIZE)
    normal = bpy.data.images.new("zoe_normal", TEXTURE_SIZE, TEXTURE_SIZE, float_buffer=False)
    normal.colorspace_settings.name = "Non-Color"

    material = bpy.data.materials.new("zoe_holograma")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes["Principled BSDF"]
    color_node = nodes.new("ShaderNodeTexImage")
    color_node.image = color
    normal_node = nodes.new("ShaderNodeTexImage")
    normal_node.image = normal
    normal_map = nodes.new("ShaderNodeNormalMap")
    low.data.materials.clear()
    low.data.materials.append(material)

    activate(low, high)
    # Cycles hornea en el nodo de imagen activo del material de destino.
    nodes.active = color_node
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})
    log("color horneado")
    nodes.active = normal_node
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    log("relieve horneado")

    links.new(color_node.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.6
    nodes.active = color_node  # El visor y las capturas muestran la imagen activa.
    for image in (color, normal):
        image.pack()


# ─── 3b. Articulaciones que le faltan al rig ────────────────────────────────

# El rig de Meshy une fémur y tibia en un solo hueso (lo mismo húmero y radio) y no tiene cuello.
# Un perro no se puede sentar ni echar con naturalidad así: se insertan rodilla, codo y cuello.
# Cada uno entra como hueso intermedio sin cambiar la orientación de los demás, así que la
# caminata original sigue idéntica (el hueso nuevo queda quieto mientras camina).
NEW_JOINTS = [
    # (hueso que se parte, hijo que pasa al hueso nuevo, nombre nuevo, fracción del tramo)
    ("backleg0", "backleg1", "backlegknee", 0.5),
    ("R_backleg0", "R_backleg1", "R_backlegknee", 0.5),
    ("frontleg0", "frontleg1", "frontlegelbow", 0.48),
    ("R_frontleg0", "R_frontleg1", "R_frontlegelbow", 0.48),
    ("chest", "head", "neck", 0.45),
]


def add_joints(arm):
    activate(arm)
    bpy.ops.object.mode_set(mode="EDIT")
    bones = arm.data.edit_bones
    for upper_name, lower_name, name, fraction in NEW_JOINTS:
        upper, lower = bones[upper_name], bones[lower_name]
        start, end = upper.head.copy(), lower.head.copy()
        joint = start.lerp(end, fraction)
        axis = (upper.tail - upper.head).normalized()
        roll = upper.roll
        # El hueso superior solo se acorta: conserva su eje y su giro, y con ellos la caminata.
        upper.tail = upper.head + axis * max((joint - start).length, 1e-4)
        upper.roll = roll
        new = bones.new(name)
        new.head = joint
        new.tail = joint + axis * max((end - joint).length, 1e-4)
        new.roll = roll
        new.parent = upper
        new.use_connect = False
        new.use_deform = True
        lower.use_connect = False
        lower.parent = new
    bpy.ops.object.mode_set(mode="OBJECT")
    update()
    log("articulaciones nuevas:", ", ".join(j[2] for j in NEW_JOINTS))


# ─── 4. Pesos de piel ───────────────────────────────────────────────────────

def report_weights(obj):
    """Hueso dominante por zona: la cabeza debe ser «head», las patas sus huesos, etc."""
    zones = {"cabeza": lambda c: c.z > 0.26 and c.y < -0.05, "pata del. izq.": lambda c: c.z < 0.06 and c.y < -0.04 and c.x > 0.02,
             "pata tras. izq.": lambda c: c.z < 0.06 and c.y > 0.06 and c.x > 0.02, "lomo": lambda c: 0.16 < c.z < 0.22 and abs(c.y) < 0.03}
    names = {g.index: g.name for g in obj.vertex_groups}
    for zone, inside in zones.items():
        counts = {}
        for v in obj.data.vertices:
            if inside(v.co) and v.groups:
                top = max(v.groups, key=lambda e: e.weight)
                counts[names[top.group]] = counts.get(names[top.group], 0) + 1
        log("  ", zone, sorted(counts.items(), key=lambda kv: -kv[1])[:3])


HEAT_SCALE = 10.0


def skinned_vertices(obj):
    return sum(1 for v in obj.data.vertices if any(g.weight > 0.01 for g in v.groups))


def skin(arm, body, low):
    method = WEIGHTS
    if method == "calor":
        # Calor de huesos: sobre una malla cerrada reparte el peso según la distancia real
        # por dentro del cuerpo, así una pata no arrastra la panza ni la pata vecina.
        # El cálculo de calor pierde precisión con un modelo de 30 cm: se hace a escala x10 y se
        # devuelve. El inverso de parentesco guarda el 1/10, así que el tamaño final no cambia.
        arm.scale = (HEAT_SCALE,) * 3
        low.scale = (HEAT_SCALE,) * 3
        update()
        activate(arm, low)
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        arm.scale = (1, 1, 1)
        update()
        covered = skinned_vertices(low) / max(1, len(low.data.vertices))
        if covered < 0.995:
            log(f"el calor de huesos solo cubrió {covered:.1%}; se transfieren los pesos del original")
            low.parent = None
            low.matrix_world = Matrix.Identity(4)
            low.modifiers.clear()
            low.vertex_groups.clear()
            method = "transferencia"
    if method == "transferencia":
        transfer = low.modifiers.new("pesos", "DATA_TRANSFER")
        transfer.object = body
        transfer.use_vert_data = True
        transfer.data_types_verts = {"VGROUP_WEIGHTS"}
        transfer.vert_mapping = "POLYINTERP_NEAREST"
        transfer.layers_vgroup_select_src = "ALL"
        transfer.layers_vgroup_select_dst = "NAME"
        activate(low)
        bpy.ops.object.datalayout_transfer(modifier=transfer.name)
        bpy.ops.object.modifier_apply(modifier=transfer.name)
        low.parent = arm
        low.matrix_parent_inverse = arm.matrix_world.inverted()
        low.modifiers.new("Armature", "ARMATURE").object = arm
    activate(low)
    bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
    bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.5, repeat=3, expand=0.0)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    report_weights(low)
    used = {e.group for v in low.data.vertices for e in v.groups if e.weight > 0.01}
    log("pesos:", method, "· huesos sin piel:", [g.name for g in low.vertex_groups if g.index not in used])


# ─── 5. Posturas con cinemática inversa ─────────────────────────────────────

ARM = Matrix.Identity(4)
ARM_INV = Matrix.Identity(4)


def head(bone):
    """Posición actual de la articulación, en el mundo."""
    return ARM @ bone.head


def chain_direction(bone, child=None):
    return (head(child) - head(bone)) if child else (ARM @ bone.tail - head(bone))


def turn_about(bone, pivot, rotation):
    """Gira un hueso (y con él sus hijos) alrededor de un punto del mundo."""
    to_pivot = Matrix.Translation(pivot)
    world = to_pivot @ rotation.to_4x4() @ to_pivot.inverted()
    bone.matrix = ARM_INV @ world @ ARM @ bone.matrix
    update()


def move(bone, offset):
    bone.matrix = ARM_INV @ Matrix.Translation(offset) @ ARM @ bone.matrix
    update()


def aim(bone, direction, child=None):
    current = chain_direction(bone, child)
    turn_about(bone, head(bone), current.rotation_difference(direction).to_matrix())


def pitch(bone, degrees):
    turn_about(bone, head(bone), Matrix.Rotation(math.radians(degrees), 3, LATERAL))


# Pata trasera: fémur, tibia, metatarso y dedos. Delantera: húmero, radio, metacarpo y dedos.
LEGS = {
    "back": ("backleg0", "backlegknee", "backleg1", "backleg2"),
    "front": ("frontleg0", "frontlegelbow", "frontleg1", "frontleg2"),
}


def bones_of(pose, side, leg):
    return [pose.bones[f"{side}{name}"] for name in LEGS[leg]]


def solve_leg(pose, side, leg, target, bend, flat=None, rest_dirs=None):
    """Lleva la tercera articulación (corvejón o carpo) a `target` con ley de cosenos en el plano
    del cuerpo; `bend` dobla la articulación media hacia delante (-1, rodilla) o atrás (+1, codo).
    Metatarso y dedos quedan planos sobre el piso si se da `flat`, o con su orientación de reposo."""
    upper, middle, lower, toes = bones_of(pose, side, leg)
    top = head(upper)
    l1 = (head(middle) - top).length
    l2 = (head(lower) - head(middle)).length
    to_target = target - top
    if to_target.length > l1 + l2:
        log(f"  {side}{leg}: no alcanza ({to_target.length:.3f} > {l1 + l2:.3f})")
    reach = max(abs(l1 - l2) + 1e-6, min(to_target.length, (l1 + l2) * 0.999))
    axis = to_target.normalized()
    along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
    side_offset = math.sqrt(max(l1 * l1 - along * along, 0.0))
    perpendicular = LATERAL.cross(axis).normalized()  # apunta hacia atrás cuando el eje baja
    knee = top + axis * along + perpendicular * side_offset * bend
    aim(upper, knee - top, middle)
    aim(middle, target - head(middle), lower)
    if flat is not None:
        aim(lower, flat, toes)
        aim(toes, flat)
    else:
        aim(lower, rest_dirs[lower.name], toes)
        aim(toes, rest_dirs[toes.name])


def ground_height(body):
    return min((body.matrix_world @ v.co).z for v in body.data.vertices)


def make_pose(arm, ground, spec, kind):
    pose = arm.pose
    for bone in pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    update()
    hips = pose.bones["Hips"]
    rest_joint = {b.name: head(b) for side in ("", "R_") for leg in LEGS for b in bones_of(pose, side, leg)}
    rest_dirs = {}
    for side in ("", "R_"):
        for leg in LEGS:
            _, _, lower, toes = bones_of(pose, side, leg)
            rest_dirs[lower.name] = chain_direction(lower, toes)
            rest_dirs[toes.name] = chain_direction(toes)

    def place_body(angle):
        for bone in pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        update()
        pitch(hips, angle)
        move(hips, Vector((0, 0, ground + spec["hip_height"] - head(pose.bones["backleg0"]).z)))
        if kind == "sit":
            pitch(pose.bones["chest"], -angle * spec["chest"])
        else:
            # Echado, el pecho baja hasta que los hombros quedan a la altura pedida.
            drop = head(pose.bones["frontleg0"]).z - (ground + spec["shoulder_height"])
            pitch(pose.bones["chest"], math.degrees(math.atan2(drop, 0.12)))

    def arm_length(side):
        upper, middle, lower, _ = bones_of(pose, side, "front")
        return (head(middle) - head(upper)).length + (head(lower) - head(middle)).length

    def hands_reach():
        return all((head(pose.bones[f"{s}frontleg0"]) - rest_joint[f"{s}frontleg1"]).length <= arm_length(s) * 0.985 for s in ("", "R_"))

    angle = spec["pitch"]
    place_body(angle)
    if kind == "sit":
        # La mayor inclinación con la que las manos siguen apoyadas donde estaban, casi rectas.
        while angle < 0 and not hands_reach():
            angle += 1
            place_body(angle)
        log(f"  inclinación al sentarse: {angle}°")

    lift = spec["foot_lift"]
    flat = (FORWARD + Vector((0, 0, -0.05))).normalized()
    for side in ("", "R_"):
        sign = 1 if rest_joint[f"{side}backleg1"].x > 0 else -1
        hip = head(pose.bones[f"{side}backleg0"])
        hock = Vector((hip.x + sign * spec["hock_out"], hip.y + spec["hock_back"], ground + lift))
        solve_leg(pose, side, "back", hock, bend=-1, flat=flat)
        shoulder = head(pose.bones[f"{side}frontleg0"])
        if kind == "sit":
            solve_leg(pose, side, "front", rest_joint[f"{side}frontleg1"], bend=1, rest_dirs=rest_dirs)
        else:
            # Codo en el piso detrás del hombro y antebrazo plano hacia delante.
            upper, middle, lower, _ = bones_of(pose, side, "front")
            l1 = (head(middle) - head(upper)).length
            l2 = (head(lower) - head(middle)).length
            height = max(shoulder.z - (ground + lift), 0.0)
            elbow_back = math.sqrt(max(l1 * l1 - height * height, 0.0))
            carpus = Vector((rest_joint[f"{side}frontleg1"].x, shoulder.y + elbow_back - l2 * 0.98, ground + lift))
            solve_leg(pose, side, "front", carpus, bend=1, flat=flat)

    # Cuello y cabeza reparten la compensación: la mirada queda al frente y el rostro no se estira.
    if kind == "sit":
        pitch(pose.bones["neck"], -angle * spec["neck"])
        pitch(pose.bones["head"], -angle * spec["head"])
    else:
        pitch(pose.bones["neck"], spec["neck"])
        pitch(pose.bones["head"], spec["head"])
    for name, tail_angle in zip(("tailstart", "tail1", "tail2"), spec["tail"]):
        pitch(pose.bones[name], tail_angle)


# ─── 5b. Caminata natural ───────────────────────────────────────────────────

# Marcha de un perro real (referencia: perro en cinta a cámara lenta): secuencia lateral
# —trasera izquierda, delantera izquierda, trasera derecha, delantera derecha—, cada pata apoyada
# el 62 % del ciclo; al despegar, el pie se dobla hacia atrás; el cuerpo sube y baja dos veces por
# ciclo, la cabeza asiente al apoyar cada mano y la cola se balancea suelta.
WALK = {
    "frames": 24,  # un ciclo por segundo a 24 cuadros
    "stride": 0.11,  # metros que avanza cada pata en un ciclo
    "duty": 0.62,
    "lift": 0.026,
    "paw_flick": 55,  # grados que se dobla el pie en el aire
    "bob": 0.004,
    "head_nod": 3.0,
    "tail_sway": 14,
    "phase": {("", "back"): 0.0, ("", "front"): 0.25, ("R_", "back"): 0.5, ("R_", "front"): 0.75},
}


def smooth(x):
    return x * x * (3 - 2 * x)


def make_walk(arm):
    pose = arm.pose
    for bone in pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    update()
    rest_joint = {(side, leg): head(bones_of(pose, side, leg)[2]) for side in ("", "R_") for leg in LEGS}
    rest_dirs = {}
    for side in ("", "R_"):
        for leg in LEGS:
            _, _, lower, toes = bones_of(pose, side, leg)
            rest_dirs[lower.name] = chain_direction(lower, toes)
            rest_dirs[toes.name] = chain_direction(toes)

    action = bpy.data.actions.new("walk")
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    frames = WALK["frames"]
    for frame in range(frames + 1):
        t = (frame % frames) / frames
        for bone in pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        update()
        hips = pose.bones["Hips"]
        move(hips, Vector((0, 0, WALK["bob"] * math.cos(4 * math.pi * t))))
        turn_about(hips, head(hips), Matrix.Rotation(math.radians(1.5) * math.sin(2 * math.pi * t), 3, FORWARD))
        for (side, leg), offset in WALK["phase"].items():
            phase = (t + offset) % 1.0
            duty = WALK["duty"]
            if phase < duty:
                ahead = WALK["stride"] * (0.5 - phase / duty)  # apoyada: el piso pasa hacia atrás
                lift = 0.0
                flick = 0.0
            else:
                q = (phase - duty) / (1 - duty)
                ahead = WALK["stride"] * (smooth(q) - 0.5)  # en el aire: vuelve hacia delante
                lift = WALK["lift"] * math.sin(math.pi * q)
                flick = math.radians(WALK["paw_flick"]) * math.sin(math.pi * min(1.0, q * 1.3))
            target = rest_joint[(side, leg)] + FORWARD * ahead + Vector((0, 0, lift))
            _, _, lower, toes = bones_of(pose, side, leg)
            bend_dirs = {
                lower.name: Matrix.Rotation(flick, 3, LATERAL) @ rest_dirs[lower.name],
                toes.name: Matrix.Rotation(flick * 1.3, 3, LATERAL) @ rest_dirs[toes.name],
            }
            solve_leg(pose, side, leg, target, bend=-1 if leg == "back" else 1, rest_dirs=bend_dirs)
        # La cabeza baja un poco cada vez que apoya una mano (fases 0,25 y 0,75).
        pitch(pose.bones["neck"], WALK["head_nod"] * math.cos(4 * math.pi * (t - 0.25)))
        pitch(pose.bones["head"], -WALK["head_nod"] * 0.5 * math.cos(4 * math.pi * (t - 0.25)))
        for i, name in enumerate(("tailstart", "tail1", "tail2", "tail3")):
            bone = pose.bones[name]
            turn_about(bone, head(bone), Matrix.Rotation(math.radians(WALK["tail_sway"]) * math.sin(2 * math.pi * t - i * 0.6), 3, Vector((0, 0, 1))))
        for bone in pose.bones:
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            bone.keyframe_insert("location", frame=frame)
    arm.animation_data.action = None
    log("caminata natural:", frames, "cuadros")
    return action


def store_pose(arm, name):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    for bone in arm.pose.bones:
        bone.rotation_mode = "QUATERNION"
        for frame in (0, 1):
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            bone.keyframe_insert("location", frame=frame)
    arm.animation_data.action = None
    log("postura guardada:", name)
    return action


# ─── 6. Capturas de control ─────────────────────────────────────────────────

def setup_renders():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_cavity = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 540
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("fondo")
    scene.world = world
    camera = bpy.data.objects.new("cámara", bpy.data.cameras.new("cámara"))
    camera.data.lens = 50
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def render(camera, target, name, views):
    for view, (x, y, z) in views.items():
        camera.location = (x, y, z)
        direction = target - camera.location
        camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = os.path.join(RENDERS, f"{name}_{view}.png")
        bpy.ops.render.render(write_still=True)


# ─── Proceso ────────────────────────────────────────────────────────────────

def main():
    arm, body, walk = load()
    ground = ground_height(body)
    high, low = retopologize(body)
    unwrap(low)
    bake(high, low)
    add_joints(arm)
    skin(arm, body, low)
    bpy.data.objects.remove(high)

    arm.data.pose_position = "POSE"
    poses = {}
    for kind, spec in (("sit", SIT), ("lie", LIE)):
        make_pose(arm, ground, spec, kind)
        poses[kind] = store_pose(arm, kind)
    if walk:
        # La caminata de Meshy cruza las manos y se ve rígida: se reemplaza por la natural.
        bpy.data.actions.remove(walk)
    walk = make_walk(arm)

    if RENDERS:
        os.makedirs(RENDERS, exist_ok=True)
        body.hide_render = True
        camera = setup_renders()
        target = Vector((0, 0, ground + 0.13))
        for bone in arm.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        render(camera, target, "reposo", {"tres_cuartos": (0.6, -0.7, ground + 0.3)})
        # Primer plano del rostro: las facciones del original deben conservarse.
        render(camera, Vector((0, -0.13, ground + 0.27)), "cara", {"frente": (0.12, -0.55, ground + 0.3)})
        views = {"lado": (0.95, 0, ground + 0.2), "tres_cuartos": (0.6, -0.7, ground + 0.3), "frente": (0, -0.95, ground + 0.18)}
        for kind, action in poses.items():
            arm.animation_data.action = action
            bpy.context.scene.frame_set(0)
            render(camera, target, kind, views)
        if walk:
            # Los huesos nuevos no tienen fotogramas en la caminata: parten del reposo.
            for bone in arm.pose.bones:
                bone.matrix_basis = Matrix.Identity(4)
            arm.animation_data.action = walk
            for frame in (3, 9, 15, 21):
                bpy.context.scene.frame_set(frame)
                render(camera, target, f"walk{frame:02d}", {"lado": views["lado"]})
        arm.animation_data.action = None
        bpy.context.scene.frame_set(0)
        for bone in arm.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        log("capturas en", RENDERS)

    bpy.data.objects.remove(body)
    activate(low, arm)
    bpy.ops.export_scene.gltf(
        filepath=TARGET,
        export_format="GLB",
        use_selection=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_image_format="JPEG",
        export_jpeg_quality=90,
        export_yup=True,
    )
    log("exportado:", TARGET, f"{os.path.getsize(TARGET) / 1e6:.1f} MB")


main()
