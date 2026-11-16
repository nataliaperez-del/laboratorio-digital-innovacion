import bpy
import bmesh
import math
import os
import shutil
from mathutils import Vector

blend_curr = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
blend_orig = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend1")

# 1. Leer los UVs originales de blend1
bpy.ops.wm.open_mainfile(filepath=blend_orig)
m1 = bpy.data.objects['mesh']
uv1_layer = m1.data.uv_layers.active.data
orig_loop_uvs = [(l.uv.x, l.uv.y) for l in uv1_layer]
orig_vert_cos = [Vector(v.co) for v in m1.data.vertices]

print(f"Leídos {len(orig_loop_uvs)} UVs originales de blend1.")

# 2. Cargar blend actual
bpy.ops.wm.open_mainfile(filepath=blend_curr)
m2 = bpy.data.objects['mesh']
arm2 = bpy.data.objects['Armature']

bm = bmesh.new()
bm.from_mesh(m2.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.verify()

# Restaurar UVs de todas las caras que existían originalmente
# Identificar caras con UV blanco forzado (0.7246, 0.5527) y eliminarlas o restaurarlas
print("Restaurando UVs originales de la barba y rostro...")
restored_count = 0
for f in bm.faces:
    # Si la cara estaba en el rango original
    for loop in f.loops:
        u, v = loop[uv_layer].uv
        if abs(u - 0.7246) < 0.01 and abs(v - 0.5527) < 0.01:
            # Es un loop con blanco forzado
            # Buscar el vértice correspondiente en m1 por posición cercana
            v_co = loop.vert.co
            if loop.vert.index < len(orig_vert_cos):
                # Usar el UV original del loop si coincide el índice
                orig_uv = orig_loop_uvs[loop.index] if loop.index < len(orig_loop_uvs) else None
                if orig_uv and not (abs(orig_uv[0] - 0.7246) < 0.01 and abs(orig_uv[1] - 0.5527) < 0.01):
                    loop[uv_layer].uv = orig_uv
                    restored_count += 1

print(f"  ✓ {restored_count} loops de barba restaurados a su textura original.")

# 3. ELIMINAR LAS "COSAS BLANCAS" (DIENTES AÑADIDOS QUE SE VEN COMO BLOQUES)
# Buscar cualquier cara artificial pequeña de diente creada en make_tooth y removerla
teeth_faces = []
for f in bm.faces:
    c = f.calc_center_median()
    # Los dientes añadidos estaban en y ~ -0.765, z ~ 0.320 a 0.330, |x| < 0.03
    # Tienen área muy pequeña < 0.0001 m^2 y 3 o 4 vértices con blanco
    if -0.775 < c.y < -0.758 and 0.318 < c.z < 0.335 and abs(c.x) < 0.030:
        if f.calc_area() < 0.00008:
            teeth_faces.append(f)

print(f"Eliminando {len(teeth_faces)} caras de bloques blancos en la boca...")
bmesh.ops.delete(bm, geom=teeth_faces, context='FACES')

bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()

# 4. RESTAURAR UVs EXACTOS DE TODA LA CABEZA DESDE BLEND1
# Para garantizar 100% que la barba quede exactamente como estaba antes
print("Sincronizando UVs de la cabeza desde blend1...")
for f in bm.faces:
    c = f.calc_center_median()
    if c.y < -0.60: # Zona de cabeza, cara, bigote, barba
        for loop in f.loops:
            l_idx = loop.index
            if l_idx < len(orig_loop_uvs):
                # No sobrescribir el fondo negro de la garganta
                u_curr, v_curr = loop[uv_layer].uv
                if not (abs(u_curr - 0.7832) < 0.01 and abs(v_curr - 0.7656) < 0.01):
                    loop[uv_layer].uv = orig_loop_uvs[l_idx]

bm.to_mesh(m2.data)
bm.free()
m2.data.update()

# Guardar blend
bpy.ops.wm.save_mainfile(filepath=blend_curr)
print("Blend file guardado con la barba 100% restaurada.")

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
    shutil.copyfile(blend_curr, os.path.join(hostinger_dir, "zoe_fuente.blend"))
    print("✓ Copiados a hostinger_deploy con éxito.")

# Renderizar cara restaurada
cam_data = bpy.data.cameras.new("FaceRestoredCam")
cam_obj = bpy.data.objects.new("FaceRestoredCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

cam_obj.location = (0.22, -1.25, 0.35)
dx, dy, dz = -0.22, 0.60, 0.0
cam_obj.rotation_euler = (math.radians(90), 0, math.atan2(dx, -dy))
cam_data.lens = 70

light_data = bpy.data.lights.new("SunFace", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("SunFace", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(50), math.radians(15), math.radians(-20))

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
out_render = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\face_restored_clean.png"
bpy.context.scene.render.filepath = out_render
bpy.ops.render.render(write_still=True)
print("Saved render:", out_render)
