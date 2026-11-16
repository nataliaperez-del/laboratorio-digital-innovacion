import bpy
import bmesh
import math
import os
import shutil
from collections import defaultdict
from mathutils import Vector, Matrix

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
out_glb = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.glb")
out_fbx = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.fbx")
hostinger_dir = os.path.abspath(r"laboratorio-digital-innovacion\hostinger_deploy\assets\zoe")

bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

vg_map = {g.name: g.index for g in mesh_obj.vertex_groups}
head_idx = vg_map.get('Head', 0)
chin_idx = vg_map.get('Chin', 0)

bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()

uv_layer = bm.loops.layers.uv.verify()
dvert_layer = bm.verts.layers.deform.verify()

# Texture samples:
# Cleanest bright white for teeth: UV (0.7246, 0.5527)
# Pitch black for throat & lip border: UV (0.7832, 0.7656)
white_uv = (0.7246, 0.5527)
black_uv = (0.7832, 0.7656)

# 1. DELIMITAR EL LABIO INFERIOR CON BORDE NEGRO NÍTIDO
print("1. Aplicando ribete negro nítido al labio inferior (fiel a la referencia)...")
lower_lip_count = 0
for v in bm.verts:
    co = v.co
    # Vertices del borde del labio inferior
    if -0.785 <= co.y <= -0.730 and 0.280 <= co.z <= 0.312 and abs(co.x) <= 0.065:
        lower_lip_count += 1
        for loop in v.link_loops:
            loop[uv_layer].uv = black_uv

print(f"  ✓ {lower_lip_count} vértices del labio inferior reforzados con ribete negro nítido.")

# 2. DIENTECITOS CANINOS E INCISIVOS SUPERIORES ESTILIZADOS
print("2. Construyendo dentadura superior según imagen de referencia...")
def make_tooth(pos, length, width, rot_x_deg=8):
    tip = Vector((pos.x, pos.y, pos.z - length))
    w = width * 0.5
    b0 = Vector((pos.x - w, pos.y - w*0.8, pos.z))
    b1 = Vector((pos.x + w, pos.y - w*0.8, pos.z))
    b2 = Vector((pos.x + w*0.8, pos.y + w, pos.z))
    b3 = Vector((pos.x - w*0.8, pos.y + w, pos.z))

    rot_m = Matrix.Rotation(math.radians(rot_x_deg), 3, 'X')
    b_pts = [pos + rot_m @ (p - pos) for p in [b0, b1, b2, b3]]
    t_pt = pos + rot_m @ (tip - pos)

    v_base = [bm.verts.new(p) for p in b_pts]
    v_tip = bm.verts.new(t_pt)
    verts = v_base + [v_tip]

    for v in verts:
        v[dvert_layer][head_idx] = 1.0

    f0 = bm.faces.new((v_base[0], v_base[1], v_tip))
    f1 = bm.faces.new((v_base[1], v_base[2], v_tip))
    f2 = bm.faces.new((v_base[2], v_base[3], v_tip))
    f3 = bm.faces.new((v_base[3], v_base[0], v_tip))
    for f in [f0, f1, f2, f3]:
        for loop in f.loops:
            loop[uv_layer].uv = white_uv
    return verts

# Caninos superiores discretos (asomando bajo el labio superior como en la referencia)
make_tooth(Vector((0.022, -0.764, 0.322)), length=0.007, width=0.0042, rot_x_deg=6)
make_tooth(Vector((-0.022, -0.764, 0.322)), length=0.007, width=0.0042, rot_x_deg=6)
# Incisivos superiores diminutos centrales
make_tooth(Vector((0.007, -0.768, 0.325)), length=0.004, width=0.003, rot_x_deg=8)
make_tooth(Vector((-0.007, -0.768, 0.325)), length=0.004, width=0.003, rot_x_deg=8)
print("  ✓ Dentadura superior modelada y anclada al hueso Head.")

# 3. ASEGURAR QUE EL FONDO DE LA CAVIDAD BUCAL SEA NEGRO PROFUNDO
print("3. Sellando cavidad bucal interna con fondo negro profundo...")
for f in bm.faces:
    center = f.calc_center_median()
    if -0.76 <= center.y <= -0.64 and 0.25 <= center.z <= 0.35 and abs(center.x) <= 0.06:
        # Verificar si es pared interior (no piel exterior)
        # En la cavidad interna, las normales apuntan hacia adentro o están en el tubo de fondo
        for loop in f.loops:
            u, v = loop[uv_layer].uv
            # Si era la cúpula/tubo bucal
            if abs(u - 0.4531) < 0.05 and abs(v - 0.5938) < 0.05:
                loop[uv_layer].uv = black_uv

bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()

# 4. GUARDAR BLEND Y EXPORTAR GLB & FBX
bpy.ops.wm.save_mainfile(filepath=blend_path)
print(f"Blend guardado: {blend_path}")

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

# Copiar a hostinger_deploy
if os.path.exists(hostinger_dir):
    shutil.copyfile(out_glb, os.path.join(hostinger_dir, "zoe.glb"))
    shutil.copyfile(out_fbx, os.path.join(hostinger_dir, "zoe.fbx"))
    shutil.copyfile(blend_path, os.path.join(hostinger_dir, "zoe_fuente.blend"))
    print("  ✓ Archivos copiados a hostinger_deploy.")

# 5. RENDERIZAR VISTA COMPARATIVA EXACTA CON LA REFERENCIA
cam_data = bpy.data.cameras.new("CompCam")
cam_obj = bpy.data.objects.new("CompCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Posición idéntica a la imagen de referencia (3/4 frontal, mirando ligeramente a su derecha)
cam_obj.location = (0.28, -1.35, 0.42)
dx = -0.28
dy = 0.70
dz = -0.07
yaw = math.atan2(dx, -dy)
pitch = math.atan2(dz, math.hypot(dx, dy))
cam_obj.rotation_euler = (math.radians(90) + pitch, 0, yaw)
cam_data.lens = 75

light_data = bpy.data.lights.new("CompSun", 'SUN')
light_data.energy = 2.8
light_obj = bpy.data.objects.new("CompSun", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900

out_face = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\zoe_mouth_reference_aligned.png"
bpy.context.scene.render.filepath = out_face
bpy.ops.render.render(write_still=True)
print(f"Render comparativo guardado: {out_face}")
