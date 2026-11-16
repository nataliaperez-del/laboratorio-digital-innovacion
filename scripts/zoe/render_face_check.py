import bpy
import math
import os

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# Neutral / rest pose or default action
arm_obj.animation_data.action = None

cam_data = bpy.data.cameras.new("MouthCam")
cam_obj = bpy.data.objects.new("MouthCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Camera focused on face / mouth (front 3/4 view matching reference)
# In reference: dog is facing slightly to its right (our left), looking at camera
cam_obj.location = (0.22, -1.25, 0.35)
# Point towards head (0.0, -0.65, 0.35)
dx = -0.22
dy = 0.60
dz = 0.0
yaw = math.atan2(dx, -dy)
cam_obj.rotation_euler = (math.radians(90), 0, yaw)
cam_data.lens = 70

light_data = bpy.data.lights.new("FaceSun", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("FaceSun", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(50), math.radians(15), math.radians(-20))

bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 800

out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\current_face_reference_check.png"
bpy.context.scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("Face render saved:", out_path)
