import bpy
import math

bpy.ops.wm.open_mainfile(filepath=r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")

arm = bpy.data.objects['Armature']
mesh_obj = bpy.data.objects['mesh']

# Limpiar cámaras y luces anteriores
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(o, do_unlink=True)

# Cámara
cam_data = bpy.data.cameras.new("SideCam")
cam_obj = bpy.data.objects.new("SideCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj
cam_data.lens = 45

# Luz ambiental / sol potente para ver todo claro
if not bpy.context.scene.world:
    bpy.context.scene.world = bpy.data.worlds.new("World")
world = bpy.context.scene.world
if world.use_nodes:
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0.2, 0.25, 0.3, 1.0)
        bg.inputs['Strength'].default_value = 1.5

light_data = bpy.data.lights.new("Sun", 'SUN')
light_data.energy = 3.0
light_obj = bpy.data.objects.new("Sun", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(50), math.radians(20), math.radians(30))

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 650

arm.animation_data.action = bpy.data.actions['walk']

# VISTA LATERAL DERECHA (X positivo, mirando al flanco derecho de Zoe)
cam_obj.location = (2.2, -0.1, 0.1)
cam_obj.rotation_euler = (math.radians(90), 0, math.radians(90))

for f in [0, 6, 12, 18]:
    bpy.context.scene.frame_set(f)
    out_img = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\full_walk_right_f{f}.png"
    bpy.context.scene.render.filepath = out_img
    bpy.ops.render.render(write_still=True)

# VISTA LATERAL IZQUIERDA (X negativo, mirando al flanco izquierdo de Zoe)
cam_obj.location = (-2.2, -0.1, 0.1)
cam_obj.rotation_euler = (math.radians(90), 0, math.radians(-90))

for f in [0, 6, 12, 18]:
    bpy.context.scene.frame_set(f)
    out_img = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\full_walk_left_f{f}.png"
    bpy.context.scene.render.filepath = out_img
    bpy.ops.render.render(write_still=True)

print("=== RENDERS COMPLETADOS ===")
