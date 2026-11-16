import bpy
import os
from collections import defaultdict

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh = bpy.data.objects['mesh']
arm = bpy.data.objects['Armature']
rest_mesh = mesh.data

def get_dominant_group(v_idx):
    groups = [(mesh.vertex_groups[g.group].name, g.weight) for g in rest_mesh.vertices[v_idx].groups]
    if not groups:
        return 'NONE'
    return max(groups, key=lambda x: x[1])[0]

trunk_bones = {'Spine_1', 'Spine_2', 'Spine_2001', 'Spine_3', 'Spine_4', 'Stomach', 'Stomach_tip', 'Back_Leg_Pelvis_L', 'Back_Leg_Pelvis_R'}

# Find all edges connecting trunk to legs or leg joints
junction_edges = []
for e in rest_mesh.edges:
    g0 = get_dominant_group(e.vertices[0])
    g1 = get_dominant_group(e.vertices[1])
    is_trunk_0 = g0 in trunk_bones
    is_trunk_1 = g1 in trunk_bones
    is_leg_0 = ('Front_Leg' in g0 or 'Back_Leg' in g0) and 'Pelvis' not in g0
    is_leg_1 = ('Front_Leg' in g1 or 'Back_Leg' in g1) and 'Pelvis' not in g1
    
    if (is_trunk_0 and is_leg_1) or (is_trunk_1 and is_leg_0):
        junction_edges.append((e.index, e.vertices[0], e.vertices[1], g0, g1))

print(f"Total junction edges between trunk and legs: {len(junction_edges)}")

# Inspect actions: walk, Trot
for act_name in ['walk', 'Trot']:
    act = bpy.data.actions.get(act_name)
    if not act:
        continue
    arm.animation_data.action = act
    frame_range = int(act.frame_range[1]) + 1
    
    worst_edges = []
    for f in range(frame_range):
        bpy.context.scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        eval_obj = mesh.evaluated_get(dg)
        eval_m = eval_obj.to_mesh()
        for e_idx, v0_i, v1_i, g0, g1 in junction_edges:
            p0 = eval_m.vertices[v0_i].co
            p1 = eval_m.vertices[v1_i].co
            rest_l = (rest_mesh.vertices[v0_i].co - rest_mesh.vertices[v1_i].co).length
            def_l = (p0 - p1).length
            stretch = def_l - rest_l
            if stretch > 0.05:
                worst_edges.append((stretch, f, e_idx, v0_i, v1_i, rest_l, def_l, g0, g1))
        eval_obj.to_mesh_clear()
        
    print(f"\n--- ACCION: {act_name} ---")
    print(f"Eventos de estiramiento > 5cm: {len(worst_edges)}")
    worst_edges.sort(key=lambda x: x[0], reverse=True)
    seen_edges = set()
    for stretch, f, e_idx, v0_i, v1_i, rest_l, def_l, g0, g1 in worst_edges:
        if e_idx in seen_edges:
            continue
        seen_edges.add(e_idx)
        v0 = rest_mesh.vertices[v0_i].co
        v1 = rest_mesh.vertices[v1_i].co
        print(f"Edge {e_idx}: max_stretch={stretch:.3f}m en cuadro {f} (rest={rest_l:.3f}m -> def={def_l:.3f}m)")
        print(f"   Bones: {g0} <---> {g1}")
        print(f"   v0={v0_i} ({v0.x:.3f}, {v0.y:.3f}, {v0.z:.3f}) | v1={v1_i} ({v1.x:.3f}, {v1.y:.3f}, {v1.z:.3f})")
        if len(seen_edges) >= 10:
            break
