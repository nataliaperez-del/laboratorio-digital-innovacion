import bpy
import math
import os

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# Configurar camara frontal centrada exactamente en la boca y hocico
cam_data = bpy.data.cameras.new("MouthFrontCam")
cam_obj = bpy.data.objects.new("MouthFrontCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Posición frente a la cara
cam_obj.location = (0.0, -1.25, 0.31)
cam_obj.rotation_euler = (math.radians(90), 0, 0)
cam_data.lens = 85

# Luz directa hacia la boca
light_data = bpy.data.lights.new("MouthLight", 'POINT')
light_data.energy = 5.0
light_obj = bpy.data.objects.new("MouthLight", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.location = (0.0, -1.0, 0.35)

bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 800

out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\mouth_front_inspect.png"
bpy.context.scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("Saved:", out_path)
