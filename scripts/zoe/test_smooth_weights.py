import bpy
import bmesh
import os
from collections import defaultdict

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh_obj = bpy.data.objects['mesh']
arm_obj = bpy.data.objects['Armature']

# Exclude zones from smoothing:
# - Emblem 'Z': abs(x) <= 0.045 and -0.56 <= y <= -0.48 and -0.16 <= z <= 0.02
# - Head & mouth: y <= -0.62 and z > 0.15
# - Eyes

bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()

dvert_layer = bm.verts.layers.deform.verify()
vg_indices = {g.name: g.index for g in mesh_obj.vertex_groups}

eligible_verts = set()
for v in bm.verts:
    co = v.co
    # Protect head & mouth
    if co.y < -0.62 and co.z > 0.15:
        continue
    # Protect emblem
    if abs(co.x) <= 0.05 and -0.57 <= co.y <= -0.47 and -0.17 <= co.z <= 0.03:
        continue
    eligible_verts.add(v.index)

print(f"Eligible vertices for body/leg weight smoothing: {len(eligible_verts)} of {len(bm.verts)}")

act = bpy.data.actions.get('walk')
arm_obj.animation_data.action = act

edge_rest_lens = [(e.index, e.verts[0].index, e.verts[1].index, (e.verts[0].co - e.verts[1].co).length) for e in bm.edges]

stretched_v_indices = set()
for f in [2, 6, 9, 12, 16, 20]:
    bpy.context.scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    eval_obj = mesh_obj.evaluated_get(dg)
    eval_m = eval_obj.to_mesh()
    for e_idx, v0_i, v1_i, rest_l in edge_rest_lens:
        p0 = eval_m.vertices[v0_i].co
        p1 = eval_m.vertices[v1_i].co
        stretch = (p0 - p1).length - rest_l
        if stretch > 0.04:
            if v0_i in eligible_verts:
                stretched_v_indices.add(v0_i)
            if v1_i in eligible_verts:
                stretched_v_indices.add(v1_i)
    eval_obj.to_mesh_clear()

print(f"Vertices directly touching stretched edges: {len(stretched_v_indices)}")

# Expand to 2-ring neighbors to allow smooth transition
smoothing_set = set(stretched_v_indices)
for ring in range(2):
    for v_idx in list(smoothing_set):
        v = bm.verts[v_idx]
        for edge in v.link_edges:
            other = edge.other_vert(v)
            if other.index in eligible_verts:
                smoothing_set.add(other.index)

print(f"Total vertices in smoothing zone (2-ring): {len(smoothing_set)}")

alpha = 0.50
iterations = 4

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

worst_stretch = 0.0
worst_edges = []
for f in range(25):
    bpy.context.scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    eval_obj = mesh_obj.evaluated_get(dg)
    eval_m = eval_obj.to_mesh()
    for e in mesh_obj.data.edges:
        p0 = eval_m.vertices[e.vertices[0]].co
        p1 = eval_m.vertices[e.vertices[1]].co
        r0 = mesh_obj.data.vertices[e.vertices[0]].co
        r1 = mesh_obj.data.vertices[e.vertices[1]].co
        rest_l = (r0 - r1).length
        def_l = (p0 - p1).length
        stretch = def_l - rest_l
        if stretch > worst_stretch:
            worst_stretch = stretch
        if stretch > 0.05:
            worst_edges.append((stretch, f, e.index, rest_l, def_l))
    eval_obj.to_mesh_clear()

print(f"\n=== RESULTADOS TRAS SUAVIZADO ===")
print(f"Max stretch en walk: {worst_stretch:.3f}m")
print(f"Aristas con stretch > 5cm: {len(worst_edges)}")
