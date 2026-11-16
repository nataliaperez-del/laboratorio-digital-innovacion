import bpy
import bmesh
import math
import os
import shutil
from mathutils import Vector

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
out_glb = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.glb")
out_fbx = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.fbx")
hostinger_dir = os.path.abspath(r"laboratorio-digital-innovacion\hostinger_deploy\assets\zoe")

bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()

# 1. CERRAR LA BOCA A LA MITAD DE LO ACTUAL
# Elevamos suavemente la mandíbula inferior / labio inferior ~0.009 m hacia arriba
print("Cerrando la boca a la mitad de la apertura actual...")
moved_count = 0
for v in bm.verts:
    co = v.co
    # Vertices de la mandíbula inferior, piso bucal y labio inferior
    if co.z <= 0.312 and co.y <= -0.710 and abs(co.x) <= 0.08:
        # Factor de influencia según profundidad en Y y altura en Z
        f_y = max(0.0, min(1.0, (-0.710 - co.y) / 0.16))
        f_z = max(0.0, min(1.0, (0.312 - co.z) / 0.08))
        f_x = max(0.0, 1.0 - (abs(co.x) / 0.08))
        # Elevar la mandíbula ~9 mm en la punta central para reducir la abertura a la mitad
        lift = 0.009 * f_y * f_z * f_x
        v.co.z += lift
        # Retraer 1 mm en Y para un cierre natural del labio inferior bajo el superior
        v.co.y += 0.0015 * f_y * f_z * f_x
        moved_count += 1

print(f"  ✓ Mandíbula inferior elevada en {moved_count} vértices; apertura reducida a la mitad.")

# 2. ASEGURAR QUE NO HAYA NINGUNA CARA BLANCA ARTIFICIAL
# Verificar que no queden triángulos residuales de make_tooth
residual_teeth = []
for f in bm.faces:
    c = f.calc_center_median()
    if -0.78 < c.y < -0.75 and 0.31 < c.z < 0.34 and abs(c.x) < 0.035:
        if f.calc_area() < 0.00008:
            residual_teeth.append(f)

if residual_teeth:
    print(f"Eliminando {len(residual_teeth)} caras residuales pequeñas...")
    bmesh.ops.delete(bm, geom=residual_teeth, context='FACES')

bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()

# Guardar blend
bpy.ops.wm.save_mainfile(filepath=blend_path)
print("Blend guardado.")

# Exportar GLB y FBX
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

# Renderizar prueba de la boca semicerrada a la mitad
cam_data = bpy.data.cameras.new("HalfMouthCam")
cam_obj = bpy.data.objects.new("HalfMouthCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

cam_obj.location = (0.22, -1.25, 0.35)
dx, dy, dz = -0.22, 0.60, 0.0
cam_obj.rotation_euler = (math.radians(90), 0, math.atan2(dx, -dy))
cam_data.lens = 70

light_data = bpy.data.lights.new("SunHM", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("SunHM", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(50), math.radians(15), math.radians(-20))

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
out_render = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\mouth_half_closed.png"
bpy.context.scene.render.filepath = out_render
bpy.ops.render.render(write_still=True)
print("Saved render:", out_render)
