import bpy
import math
import os

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# 1. Analizar imagen 2 (Boca de cerca)
# Ver que polígonos/vértices causan esos pelos que se meten y el parche rosado
cam_data = bpy.data.cameras.new("MouthCloseCam")
cam_obj = bpy.data.objects.new("MouthCloseCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Angulo idéntico a media_1794807235514_23f6e548.jpg
# Camara enfocando desde abajo hacia arriba al hocico, 3/4
cam_obj.location = (0.18, -1.05, 0.22)
dx = -0.18
dy = 0.40
dz = 0.14
cam_obj.rotation_euler = (math.radians(72), 0, math.atan2(dx, -dy))
cam_data.lens = 85

light_data = bpy.data.lights.new("Sun1", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("Sun1", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(20), 0)

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900

out_mouth = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\debug_mouth_closeup.png"
bpy.context.scene.render.filepath = out_mouth
bpy.ops.render.render(write_still=True)
print("Saved mouth debug:", out_mouth)

# 2. Analizar imagen 1 (Sentado - cuerpo, chaleco y patas)
act_sit = bpy.data.actions.get('sit_idle')
arm_obj.animation_data.action = act_sit
bpy.context.scene.frame_set(15)

cam_obj.location = (0.0, -1.15, -0.28)
cam_obj.rotation_euler = (math.radians(98), 0, 0)
cam_data.lens = 60

out_sit = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\debug_sit_body.png"
bpy.context.scene.render.filepath = out_sit
bpy.ops.render.render(write_still=True)
print("Saved sit debug:", out_sit)
