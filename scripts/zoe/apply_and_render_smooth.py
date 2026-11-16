import bpy
import bmesh
import math
import os
from collections import defaultdict

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# Configurar escena de render
cam_data = bpy.data.cameras.new("InspectCam")
cam_obj = bpy.data.objects.new("InspectCam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

light_data = bpy.data.lights.new("Sun", 'SUN')
light_data.energy = 2.5
light_obj = bpy.data.objects.new("Sun", light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(20), 0)

bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 600

# Suavizado de pesos
bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()

dvert_layer = bm.verts.layers.deform.verify()

eligible_verts = set()
for v in bm.verts:
    co = v.co
    # Protect head & mouth
    if co.y < -0.62 and co.z > 0.15:
        continue
    # Protect emblem 'Z'
    if abs(co.x) <= 0.05 and -0.57 <= co.y <= -0.47 and -0.17 <= co.z <= 0.03:
        continue
    eligible_verts.add(v.index)

act = bpy.data.actions.get('walk')
arm_obj.animation_data.action = act

edge_rest_lens = [(e.index, e.verts[0].index, e.verts[1].index, (e.verts[0].co - e.verts[1].co).length) for e in bm.edges]

stretched_v_indices = set()
for f in range(25):
    bpy.context.scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    eval_obj = mesh_obj.evaluated_get(dg)
    eval_m = eval_obj.to_mesh()
    for e_idx, v0_i, v1_i, rest_l in edge_rest_lens:
        p0 = eval_m.vertices[v0_i].co
        p1 = eval_m.vertices[v1_i].co
        stretch = (p0 - p1).length - rest_l
        if stretch > 0.035:
            if v0_i in eligible_verts:
                stretched_v_indices.add(v0_i)
            if v1_i in eligible_verts:
                stretched_v_indices.add(v1_i)
    eval_obj.to_mesh_clear()

print(f"Stretched vert indices (>3.5cm): {len(stretched_v_indices)}")

# 3-ring expansion for seamless gradient
smoothing_set = set(stretched_v_indices)
for ring in range(3):
    for v_idx in list(smoothing_set):
        v = bm.verts[v_idx]
        for edge in v.link_edges:
            other = edge.other_vert(v)
            if other.index in eligible_verts:
                smoothing_set.add(other.index)

print(f"Smoothing set count: {len(smoothing_set)}")

alpha = 0.50
iterations = 5

for it in range(iterations):
    new_weights = {}
    for v_idx in smoothing_set:
        v = bm.verts[v_idx]
        dvert = v[dvert_layer]
        
        neighbors = [e.other_vert(v) for e in v.link_edges]
        if not neighbors:
            continue
            
        all_groups = set(dvert.keys())
        for n in neighbors:
            all_groups.update(n[dvert_layer].keys())
            
        v_weights = defaultdict(float)
        for g_idx in all_groups:
            self_w = dvert.get(g_idx, 0.0)
            neigh_avg = sum(n[dvert_layer].get(g_idx, 0.0) for n in neighbors) / len(neighbors)
            blended = (1.0 - alpha) * self_w + alpha * neigh_avg
            if blended > 0.005:
                v_weights[g_idx] = blended
                
        total_w = sum(v_weights.values())
        if total_w > 0:
            for g_idx in v_weights:
                v_weights[g_idx] /= total_w
                
        new_weights[v_idx] = v_weights

    for v_idx, w_dict in new_weights.items():
        v = bm.verts[v_idx]
        dvert = v[dvert_layer]
        dvert.clear()
        for g_idx, val in w_dict.items():
            dvert[g_idx] = val

bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()

# Guardar blend
bpy.ops.wm.save_mainfile(filepath=blend_path)
print("Blend file updated with smoothed weights.")

# Renderizar vistas en frame 9 (peor cuadro de pata trasera derecha) y frame 12 (cuadro de pata delantera izquierda)
# Vista lateral izquierda
cam_obj.location = (-1.8, -0.3, 0.4)
cam_obj.rotation_euler = (math.radians(85), 0, math.radians(-90))
cam_data.lens = 45

for frame in [6, 9, 12]:
    bpy.context.scene.frame_set(frame)
    out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\walk_smooth_left_f{frame}.png"
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)

# Vista lateral derecha
cam_obj.location = (1.8, -0.3, 0.4)
cam_obj.rotation_euler = (math.radians(85), 0, math.radians(90))
for frame in [6, 9, 12]:
    bpy.context.scene.frame_set(frame)
    out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\walk_smooth_right_f{frame}.png"
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)

print("=== RENDERS COMPLETADOS ===")
