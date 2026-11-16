import bpy
import math
import os

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

act = bpy.data.actions.get('sit_idle')
arm_obj.animation_data.action = act
bpy.context.scene.frame_set(10)

cam_data = bpy.data.cameras.new("SitCam")
cam_obj = bpy.data.objects.new("SitCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Camara enfocando patas delanteras, pecho y patas traseras dobladas
cam_obj.location = (0.0, -0.95, -0.15)
cam_obj.rotation_euler = (math.radians(95), 0, 0)
cam_data.lens = 65

light_data = bpy.data.lights.new("SitLight", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("SitLight", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(15), 0)

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 600

out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\sit_inspect_f10.png"
bpy.context.scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("Saved sit render:", out_path)
