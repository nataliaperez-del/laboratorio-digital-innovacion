"""
Prepara para la web el modelo de ZOE rigueado en Meshy (esqueleto de cuadrúpedo de 49 huesos).

El GLB que entrega Meshy trae 3,2 millones de triángulos, texturas 4K y las costuras de la
textura con pesos distintos a cada lado (ahí la piel se abriría al moverse). Este script:

  1. Importa uniendo los vértices de las costuras: la piel queda continua y con un solo peso.
  2. Reduce la malla a ~TRIS triángulos conservando UV y pesos.
  3. Suaviza un poco los pesos, los limita a 4 huesos y los normaliza.
  4. Deja las texturas en 2048 px.
  5. Con --renders, guarda capturas de pruebas de flexión para revisar la deformación.

Uso:
  blender -b --factory-startup --python scripts/zoe/preparar_meshy_rig.py -- entrada.glb salida.glb [--tris 60000] [--renders carpeta]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]


def option(name, default):
    return type(default)(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


SOURCE, TARGET = ARGS[0], ARGS[1]
TRIS = option("--tris", 60000)
RENDERS = option("--renders", "")
TEXTURE = option("--textura", 2048)


def log(*parts):
    print("[ZOE]", *parts, flush=True)


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE, merge_vertices=True)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
for obj in list(bpy.data.objects):
    if obj not in (arm, body):
        bpy.data.objects.remove(obj)
log("importado:", len(body.data.vertices), "vértices,", len(body.data.polygons), "caras; huesos", len(arm.data.bones))

# Reducción: el colapso conserva UV por esquina y pesos por vértice.
tris_now = sum(len(p.vertices) - 2 for p in body.data.polygons)
decimate = body.modifiers.new("reducir", "DECIMATE")
decimate.decimate_type = "COLLAPSE"
decimate.ratio = min(1.0, TRIS / max(1, tris_now))
decimate.use_collapse_triangulate = True
activate(body)
bpy.ops.object.modifier_move_to_index(modifier="reducir", index=0)
bpy.ops.object.modifier_apply(modifier="reducir")
log("reducido:", len(body.data.vertices), "vértices,", sum(len(p.vertices) - 2 for p in body.data.polygons), "triángulos")

# Pesos del hocico: Meshy reparte la nariz entre «Nose», «Headtip» y la cabeza, y cuando una
# animación mueve esos huesos la nariz se desprende. Sus pesos pasan al hueso padre: el hocico
# entero sigue a la cabeza y la mandíbula («Chin») queda como única parte móvil de la boca.
FOLD = {"Nose": "Head", "Headtip": "Head", "Chin_Tip": "Chin"}
for child, parent in FOLD.items():
    source, target = body.vertex_groups.get(child), body.vertex_groups.get(parent)
    if not source or not target:
        continue
    moved = 0
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == source.index), 0.0)
        if w > 0:
            current = next((g.weight for g in v.groups if g.group == target.index), 0.0)
            target.add([v.index], current + w, "REPLACE")
            moved += 1
    source.remove([v.index for v in body.data.vertices])
    log(f"pesos de {child} → {parent}: {moved} vértices")

# Mandíbula: Meshy deja parte de la nariz y del hocico superior pesados al mentón, y al abrirse la
# boca la nariz baja con ella. Por encima del plano de la bisagra (mentón → punta del mentón, eje
# lateral X) el peso del mentón pasa a la cabeza, con una franja de transición para no dejar borde.
chin, chin_tip, head_group, chin_group = (arm.data.bones.get("Chin"), arm.data.bones.get("Chin_Tip"), body.vertex_groups.get("Head"), body.vertex_groups.get("Chin"))
if chin and chin_tip and head_group and chin_group:
    hinge = arm.matrix_world @ chin.head_local
    jaw = (arm.matrix_world @ chin_tip.head_local) - hinge
    normal = jaw.cross(Vector((1, 0, 0))).normalized()
    if normal.z < 0:
        normal = -normal  # apunta hacia arriba: del lado de la nariz
    band = jaw.length * 0.25
    moved = 0
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == chin_group.index), 0.0)
        if w <= 0:
            continue
        side = (body.matrix_world @ v.co - hinge).dot(normal)
        share = max(0.0, min(1.0, (side + band) / (2 * band)))  # 0 debajo de la franja, 1 encima
        if share <= 0:
            continue
        current = next((g.weight for g in v.groups if g.group == head_group.index), 0.0)
        head_group.add([v.index], current + w * share, "REPLACE")
        chin_group.add([v.index], w * (1 - share), "REPLACE")
        moved += 1
    log(f"mandíbula: {moved} vértices del hocico superior pasan a la cabeza")

# Cabeza: Meshy pesa la nariz y el hocico al cuello («Spine_3», 70-85 %), así que cuando una
# animación gira la cabeza la nariz se queda atrás y la cara se rasga. Todo lo que está delante de
# la articulación del cráneo, o por encima del cuello, pasa del cuello a la cabeza.
head_bone, nose_bone = arm.data.bones.get("Head"), arm.data.bones.get("Nose")
neck_groups = [body.vertex_groups.get(n) for n in ("Spine_3", "Spine_4", "Spine_2001")]
neck_groups = [g for g in neck_groups if g]
if head_bone and nose_bone and head_group and neck_groups:
    joint = arm.matrix_world @ head_bone.head_local
    forward = ((arm.matrix_world @ nose_bone.head_local) - joint).normalized()
    head_size = ((arm.matrix_world @ nose_bone.head_local) - joint).length
    band = head_size * 0.35
    z_low, z_high = joint.z + head_size * 0.35, joint.z + head_size * 0.9
    moved = 0
    for v in body.data.vertices:
        co = body.matrix_world @ v.co
        if co.y > joint.y + head_size * 1.5:
            continue  # lejos de la cabeza: el resto del cuerpo no se toca
        front = max(0.0, min(1.0, ((co - joint).dot(forward) + band) / (2 * band)))
        above = max(0.0, min(1.0, (co.z - z_low) / (z_high - z_low)))
        share = max(front, above)
        if share <= 0:
            continue
        taken = 0.0
        for g in neck_groups:
            w = next((e.weight for e in v.groups if e.group == g.index), 0.0)
            if w > 0:
                g.add([v.index], w * (1 - share), "REPLACE")
                taken += w * share
        if taken > 0:
            current = next((e.weight for e in v.groups if e.group == head_group.index), 0.0)
            head_group.add([v.index], current + taken, "REPLACE")
            moved += 1
    log(f"cabeza: {moved} vértices del rostro pasan del cuello a la cabeza")

# Orejas: en el rig de Meshy cada oreja nace en la punta de la nariz y llega hasta la punta de la
# oreja, así que sus pesos cruzan la cara. Cuando una animación sacude las orejas, arrastra la
# nariz y el borde de los ojos y la cara se rasga. Se conserva el peso solo cerca de la punta de
# cada oreja (con transición suave); el resto pasa a la cabeza.
for side in ("L", "R"):
    ear_group, tip_bone = body.vertex_groups.get(f"Ear_{side}"), arm.data.bones.get(f"Ear_Tip_{side}")
    base_bone = arm.data.bones.get(f"Ear_{side}")
    if not (ear_group and tip_bone and base_bone and head_group):
        continue
    tip = arm.matrix_world @ tip_bone.head_local
    reach = ((arm.matrix_world @ base_bone.head_local) - tip).length
    full, none = reach * 0.25, reach * 0.55  # cerca de la punta, peso intacto; a más de la mitad, nada
    moved = 0
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == ear_group.index), 0.0)
        if w <= 0:
            continue
        d = ((body.matrix_world @ v.co) - tip).length
        keep = 1.0 if d <= full else 0.0 if d >= none else 1 - (d - full) / (none - full)
        if keep >= 1:
            continue
        current = next((g.weight for g in v.groups if g.group == head_group.index), 0.0)
        head_group.add([v.index], current + w * (1 - keep), "REPLACE")
        ear_group.add([v.index], w * keep, "REPLACE")
        moved += 1
    log(f"oreja {side}: {moved} vértices de la cara pasan a la cabeza")

bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
# La frontera cabeza-mandíbula se suaviza más que el resto: así la boca abre sin rasgar la barba.
for name in ("Chin", "Head"):
    group = body.vertex_groups.get(name)
    if group:
        body.vertex_groups.active_index = group.index
        bpy.ops.object.vertex_group_smooth(group_select_mode="ACTIVE", factor=0.5, repeat=6, expand=0.0)
# Hombros: al sentarse el pecho gira casi 50° respecto de las manos; con una frontera de pesos
# estrecha, la piel entre pecho y escápula se pliega y deja una ranura junto al arnés.
for name in ("Front_Leg_Shoulder_L", "Front_Leg_Shoulder_R", "Front_Leg_Upper_L", "Front_Leg_Upper_R", "Spine_2001"):
    group = body.vertex_groups.get(name)
    if group:
        body.vertex_groups.active_index = group.index
        bpy.ops.object.vertex_group_smooth(group_select_mode="ACTIVE", factor=0.5, repeat=5, expand=0.1)
bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.35, repeat=2, expand=0.0)
bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
bpy.ops.object.mode_set(mode="OBJECT")
for poly in body.data.polygons:
    poly.use_smooth = True

for image in bpy.data.images:
    if image.size[0] > TEXTURE:
        image.scale(TEXTURE, TEXTURE)
        image.pack()
        log("textura reducida:", image.name)

if RENDERS:
    os.makedirs(RENDERS, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.resolution_x, scene.render.resolution_y = 640, 480
    scene.world = bpy.data.worlds.new("fondo")
    camera = bpy.data.objects.new("cámara", bpy.data.cameras.new("cámara"))
    scene.collection.objects.link(camera)
    scene.camera = camera
    corners = [body.matrix_world @ Vector(c) for c in body.bound_box]
    center = sum(corners, Vector()) / 8
    size = max((max(c[i] for c in corners) - min(c[i] for c in corners)) for i in range(3))
    log("tamaño:", round(size, 3), "centro", tuple(round(v, 3) for v in center))
    # Lista de huesos y ejes para conocer la orientación del rig.
    for b in arm.data.bones:
        if b.name in ("Hips", "Head", "Front_Leg_Upper_L", "Back_Leg_Upper_L", "Chin", "Tail_Base"):
            log("hueso", b.name, "cabeza", tuple(round(v, 3) for v in arm.matrix_world @ b.head_local), "cola", tuple(round(v, 3) for v in arm.matrix_world @ b.tail_local))

    def shot(name, direction):
        camera.location = center + Vector(direction).normalized() * size * 2.4
        camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(RENDERS, name + ".png")
        bpy.ops.render.render(write_still=True)

    shot("reposo_tres_cuartos", (0.7, -0.7, 0.35))
    shot("reposo_lado", (1, 0, 0.15))
    # Prueba de flexión: rodillas, codos, cuello y mandíbula doblados a mano.
    pose = arm.pose.bones
    tests = {"Front_Leg_Lower_L": 60, "Back_Leg_Lower_L": -70, "Spine_4": 20, "Head": -25, "Chin": 20, "Tail_Base": 30}
    for name, angle in tests.items():
        if name in pose:
            pose[name].rotation_mode = "XYZ"
            pose[name].rotation_euler = (math.radians(angle), 0, 0)
    bpy.context.view_layer.update()
    shot("flexion_lado", (1, 0, 0.15))
    shot("flexion_tres_cuartos", (0.7, -0.7, 0.35))
    for name in tests:
        if name in pose:
            pose[name].rotation_euler = (0, 0, 0)

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=TARGET, export_format="GLB", use_selection=True, export_skins=True, export_animations=True, export_image_format="JPEG", export_jpeg_quality=88, export_yup=True)
log("exportado:", TARGET, f"{os.path.getsize(TARGET) / 1e6:.1f} MB")
