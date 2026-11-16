import bpy
import os
import shutil

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
out_glb = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.glb")
out_fbx = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe.fbx")
hostinger_dir = os.path.abspath(r"laboratorio-digital-innovacion\hostinger_deploy\assets\zoe")

bpy.ops.wm.open_mainfile(filepath=blend_path)
mesh = bpy.data.objects['mesh']

print(f"Exportando GLB definitivo a {out_glb}...")
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

print(f"Exportando FBX definitivo a {out_fbx}...")
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
    print("✓ Copiados a hostinger_deploy con éxito.")

print("=== EXPORTACION COMPLETADA ===")
