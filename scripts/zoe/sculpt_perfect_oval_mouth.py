import bpy
import bmesh
import math
import os
import shutil
from mathutils import Vector, Matrix

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# Neutral / rest pose
arm_obj.animation_data.action = None

bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()

uv_layer = bm.loops.layers.uv.verify()
dvert_layer = bm.verts.layers.deform.verify()
vg_map = {g.name: g.index for g in mesh_obj.vertex_groups}
head_idx = vg_map.get('Head', 0)
chin_idx = vg_map.get('Chin', 0)

# UVs:
# Rosa natural de lengua: UV (0.442, 0.575) o muestra rosada
pink_uv = (0.442, 0.575)
black_lip_uv = (0.7832, 0.7656)

# ─── 1. ELIMINAR CUALQUIER GEOMETRÍA ROTA / DESALINEADA EN EL INTERIOR BUCAL ───
# Eliminar caras artificiales del tubo antiguo que causaban el hueco asimétrico en la izquierda
faces_to_remove = []
for f in bm.faces:
    c = f.calc_center_median()
    # Si está flotando dentro de la cavidad bucal
    if -0.77 < c.y < -0.65 and 0.27 < c.z < 0.33 and abs(c.x) < 0.05:
        # Caras del tubo anterior o pedazos sueltos
        for loop in f.loops:
            u, v = loop[uv_layer].uv
            if abs(u - 0.4531) < 0.06 and abs(v - 0.5938) < 0.06:
                faces_to_remove.append(f)
                break

if faces_to_remove:
    print(f"Eliminando {len(faces_to_remove)} caras del tubo antiguo desalineado...")
    bmesh.ops.delete(bm, geom=faces_to_remove, context='FACES')
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

# ─── 2. CREAR LÍNEA DEL LABIO INFERIOR CONTINUA, LINDA Y OVALADA ───
print("Modelando borde del labio inferior continuo y ovalado...")
# Suavizar y alinear los vértices del margen del labio inferior
# a una curva parabólica ovalada perfecta:
# z(x) = 0.296 + 0.015 * (x / 0.045)^2
# y(x) = -0.772 + 0.012 * (x / 0.045)^2
w_lip = 0.046
for v in bm.verts:
    co = v.co
    if -0.80 <= co.y <= -0.74 and 0.280 <= co.z <= 0.315 and abs(co.x) <= w_lip:
        fx = abs(co.x) / w_lip
        target_z = 0.296 + 0.016 * (fx ** 2)
        target_y = -0.772 + 0.014 * (fx ** 2)
        # Factor de mezcla suave para no alterar la piel exterior profunda
        blend_f = max(0.0, min(1.0, (co.y - -0.80) / 0.06))
        v.co.z = (1.0 - blend_f) * co.z + blend_f * target_z
        v.co.y = (1.0 - blend_f) * co.y + blend_f * target_y

        # Asignar ribete negro nítido continuo
        if co.y >= -0.775:
            for loop in v.link_loops:
                loop[uv_layer].uv = black_lip_uv

# ─── 3. CONSTRUIR LENGUA ROSADA PERFECTA, CENTRADA Y CONTINUA (SIN HUECOS) ───
print("Construyendo lengua rosada continua y hermosa en la base mandibular...")
# Crear una cúpula/lengua continua con bmesh:
# Malla de nx x ny vértices formando la superficie curva de la lengua
nx_t = 10
ny_t = 8
tongue_grid = []

for iy in range(ny_t + 1):
    fy = iy / ny_t
    y_pos = -0.765 + fy * 0.075  # De adelante hacia la garganta
    row = []
    for ix in range(nx_t + 1):
        fx = (ix / nx_t) * 2.0 - 1.0  # -1 a +1
        # Curvatura lateral ovalada
        rx = 0.032 * (1.0 - 0.20 * (1.0 - fy))
        x_pos = fx * rx
        # Altura de la lengua: más alta en el centro, leve hendidura central, apoyada en el labio
        # En la punta (fy = 0), z = 0.297 (justo sobre el labio inferior)
        z_dome = 0.005 * (1.0 - fx**2) - 0.001 * math.exp(-15 * fx**2)
        z_pos = 0.297 + fy * 0.012 + z_dome
        v = bm.verts.new((x_pos, y_pos, z_pos))
        # Anclar a Chin y Head para movimiento orgánico
        v[dvert_layer][chin_idx] = 0.85
        v[dvert_layer][head_idx] = 0.15
        row.append(v)
    tongue_grid.append(row)

# Crear caras de la lengua y asignar UV rosado
for iy in range(ny_t):
    for ix in range(nx_t):
        v0 = tongue_grid[iy][ix]
        v1 = tongue_grid[iy][ix+1]
        v2 = tongue_grid[iy+1][ix+1]
        v3 = tongue_grid[iy+1][ix]
        f = bm.faces.new((v0, v1, v2, v3))
        for loop in f.loops:
            loop[uv_layer].uv = pink_uv

# Borde posterior que baja hacia el fondo negro (garganta)
v_throat = bm.verts.new((0.0, -0.675, 0.290))
v_throat[dvert_layer][head_idx] = 0.5
v_throat[dvert_layer][chin_idx] = 0.5
for ix in range(nx_t):
    f = bm.faces.new((tongue_grid[ny_t][ix], tongue_grid[ny_t][ix+1], v_throat))
    for loop in f.loops:
        loop[uv_layer].uv = black_lip_uv

print("  ✓ Lengua rosada continua y simétrica modelada con éxito.")

# ─── 4. CÚPULA DE FONDO NEGRO OSCURO SELLADO ───
# Pared superior y lateral del fondo de la boca
n_arch = 12
arch_top = []
for i in range(n_arch + 1):
    theta = (i / n_arch) * math.pi  # De 0 a pi (arco superior)
    rx = 0.040
    rz = 0.022
    x_pos = rx * math.cos(theta)
    z_pos = 0.312 + rz * math.sin(theta)
    y_pos = -0.745
    v = bm.verts.new((x_pos, y_pos, z_pos))
    v[dvert_layer][head_idx] = 0.85
    v[dvert_layer][chin_idx] = 0.15
    arch_top.append(v)

for i in range(n_arch):
    f = bm.faces.new((arch_top[i], arch_top[i+1], v_throat))
    for loop in f.loops:
        loop[uv_layer].uv = black_lip_uv

bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()

# Guardar blend
bpy.ops.wm.save_mainfile(filepath=blend_path)
print("Blend guardado con la nueva boca y lengua.")

# Exportar GLB y FBX
out_glb = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.glb")
out_fbx = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.fbx")
hostinger_dir = os.path.abspath(r"laboratorio-digital-innovacion\hostinger_deploy\assets\zoe")

print(f"Exportando GLB a {out_glb}...")
bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    use_selection=False,
    export_apply=False,
    export_skins=True,
    export_morph=True,
    export_morph_normal=True,
    export_morph_tangent=False,
    export_animations=True,
    export_anim_single_armature=False,
    export_reset_pose_bones=False,
    export_optimize_animation_size=False
)

print(f"Exportando FBX a {out_fbx}...")
bpy.ops.export_scene.fbx(
    filepath=out_fbx,
    use_selection=False,
    global_scale=1.0,
    apply_unit_scale=True,
    apply_scale_options='FBX_SCALE_NONE',
    bake_space_transform=False,
    object_types={'ARMATURE', 'MESH'},
    use_mesh_modifiers=True,
    mesh_smooth_type='FACE',
    add_leaf_bones=False,
    primary_bone_axis='Y',
    secondary_bone_axis='X',
    armature_nodetype='NULL',
    bake_anim=True,
    bake_anim_use_all_bones=True,
    bake_anim_use_nla_strips=False,
    bake_anim_use_all_actions=True,
    bake_anim_step=1.0,
    bake_anim_simplify_factor=1.0
)

if os.path.exists(hostinger_dir):
    shutil.copyfile(out_glb, os.path.join(hostinger_dir, "zoe.glb"))
    shutil.copyfile(out_fbx, os.path.join(hostinger_dir, "zoe.fbx"))
    shutil.copyfile(blend_path, os.path.join(hostinger_dir, "zoe_fuente.blend"))
    print("✓ Copiados a hostinger_deploy con éxito.")

# Renderizar prueba comparativa exactamente en el ángulo de la foto del usuario
cam_data = bpy.data.cameras.new("UserCompCam")
cam_obj = bpy.data.objects.new("UserCompCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Angulo frontal ligeramente desde abajo (como media_1794808560880_20f57603.jpg)
cam_obj.location = (0.08, -1.15, 0.27)
dx, dy, dz = -0.08, 0.45, 0.08
cam_obj.rotation_euler = (math.radians(80), 0, math.atan2(dx, -dy))
cam_data.lens = 75

light_data = bpy.data.lights.new("SunUser", 'SUN')
light_data.energy = 2.6
light_obj = bpy.data.objects.new("SunUser", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(15), 0)

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
out_render = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\mouth_tongue_oval_perfect.png"
bpy.context.scene.render.filepath = out_render
bpy.ops.render.render(write_still=True)
print("Saved render:", out_render)
