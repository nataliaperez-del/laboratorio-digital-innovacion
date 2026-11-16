import bpy
import bmesh
import math
import os
from collections import defaultdict
from mathutils import Vector

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()

uv_layer = bm.loops.layers.uv.verify()
dvert_layer = bm.verts.layers.deform.verify()
vg_map = {g.name: g.index for g in mesh_obj.vertex_groups}

# Texturas
white_fur_uv = (0.7246, 0.5527)
black_lip_uv = (0.7832, 0.7656)
blue_fur_uv = (0.2441, 0.3398)

# ─── 1. CORREGIR LA BOCA (ELIMINAR MANCHAS ROSADAS Y PELOS QUE SE METEN) ───
print("1. Limpiando boca y bigote...")
# Vertices en las esquinas de los labios y mejillas que tenían rosado por error
for f in bm.faces:
    c = f.calc_center_median()
    # Si está en el bigote o labio exterior
    if c.y < -0.74 and 0.28 <= c.z <= 0.34 and abs(c.x) > 0.022:
        # Poner en blanco puro de bigote
        for loop in f.loops:
            u, v = loop[uv_layer].uv
            # Si tiene tinte rosado/rojizo (lengua fuera de lugar)
            if u > 0.40 and v > 0.50:
                loop[uv_layer].uv = white_fur_uv

# Retirar mechones que penetran la cavidad bucal
for v in bm.verts:
    co = v.co
    if co.y < -0.72 and 0.28 <= co.z <= 0.33 and abs(co.x) <= 0.05:
        # Si un vértice de pelo se metió muy adentro en Y
        if co.y > -0.74 and co.z < 0.315 and co.z > 0.290:
            # Empujar suavemente hacia afuera de la cavidad
            v.co.y = -0.745

print("  ✓ Bigote y comisuras limpiadas de manchas rosadas.")

# ─── 2. SELLAR AGUJEROS CIRCULARES DE LOS CODOS (LEFT & RIGHT) ───
print("2. Sellando aberturas circulares de los codos...")
sh_l_idx = vg_map.get('Front_Leg_Upper_L', 0)
sh_r_idx = vg_map.get('Front_Leg_Upper_R', 0)

# Codo izquierdo: x ~ 0.18, y ~ -0.45, z ~ -0.18
elbow_edges_l = [e for e in bm.edges if e.is_boundary and e.verts[0].co.x > 0.12 and -0.52 < e.verts[0].co.y < -0.38 and -0.28 < e.verts[0].co.z < -0.12]
if elbow_edges_l:
    print(f"  Sellando codo izquierdo ({len(elbow_edges_l)} aristas de borde)...")
    res_l = bmesh.ops.holes_fill(bm, edges=elbow_edges_l, sides=0)
    for f in res_l.get('faces', []):
        for v in f.verts:
            v[dvert_layer][sh_l_idx] = 1.0
        for loop in f.loops:
            loop[uv_layer].uv = blue_fur_uv

# Codo derecho: x ~ -0.18, y ~ -0.45, z ~ -0.18
elbow_edges_r = [e for e in bm.edges if e.is_boundary and e.verts[0].co.x < -0.12 and -0.52 < e.verts[0].co.y < -0.38 and -0.28 < e.verts[0].co.z < -0.12]
if elbow_edges_r:
    print(f"  Sellando codo derecho ({len(elbow_edges_r)} aristas de borde)...")
    res_r = bmesh.ops.holes_fill(bm, edges=elbow_edges_r, sides=0)
    for f in res_r.get('faces', []):
        for v in f.verts:
            v[dvert_layer][sh_r_idx] = 1.0
        for loop in f.loops:
            loop[uv_layer].uv = blue_fur_uv

# ─── 3. CORREGIR CHALECO Y PECHO PARA QUE NO CUELGUE AL SENTARSE ───
print("3. Ajustando forro del chaleco para que quede pegado al torso en toda pose...")
sp2_idx = vg_map.get('Spine_2', 0)
sp2001_idx = vg_map.get('Spine_2001', 0)
stomach_idx = vg_map.get('Stomach', 0)

# Los vértices del forro del pecho que colgaban entre las patas
for v in bm.verts:
    co = v.co
    # Vértices de la zona inferior del pecho/chaleco
    if abs(co.x) <= 0.10 and -0.43 <= co.y <= -0.35 and -0.30 <= co.z <= -0.15:
        # Pegar más hacia el cuerpo (retrasar en Y para que no sobresalga)
        if co.y < -0.38:
            v.co.y = -0.365
        # Reequilibrar pesos con Stomach para que acompañe el vientre al sentarse
        dvert = v[dvert_layer]
        dvert[stomach_idx] = 0.60
        dvert[sp2_idx] = 0.40
        if sp2001_idx in dvert:
            del dvert[sp2001_idx]

bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()

# Guardar blend
bpy.ops.wm.save_mainfile(filepath=blend_path)
print("Blend file updated.")

# 4. RENDERIZAR PRUEBAS
# Render boca corregida
cam_data = bpy.data.cameras.new("TestCam")
cam_obj = bpy.data.objects.new("TestCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

light_data = bpy.data.lights.new("TestSun", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("TestSun", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(20), 0)

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900

# Boca primer plano
cam_obj.location = (0.18, -1.05, 0.22)
dx, dy, dz = -0.18, 0.40, 0.14
cam_obj.rotation_euler = (math.radians(72), 0, math.atan2(dx, -dy))
cam_data.lens = 85

out_mouth = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\test_mouth_fixed.png"
bpy.context.scene.render.filepath = out_mouth
bpy.ops.render.render(write_still=True)
print("Saved mouth render:", out_mouth)

# Pose sentado corregido
act_sit = bpy.data.actions.get('sit_idle')
arm_obj.animation_data.action = act_sit
bpy.context.scene.frame_set(15)

cam_obj.location = (0.0, -1.15, -0.28)
cam_obj.rotation_euler = (math.radians(98), 0, 0)
cam_data.lens = 60

out_sit = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\test_sit_fixed.png"
bpy.context.scene.render.filepath = out_sit
bpy.ops.render.render(write_still=True)
print("Saved sit render:", out_sit)
