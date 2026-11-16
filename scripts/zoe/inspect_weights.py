import bpy
import os

blend_path = os.path.abspath(r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")
bpy.ops.wm.open_mainfile(filepath=blend_path)

mesh = bpy.data.objects['mesh']
vg_names = {g.index: g.name for g in mesh.vertex_groups}

def check_verts(v_indices):
    for idx in v_indices:
        v = mesh.data.vertices[idx]
        groups = [(vg_names[g.group], g.weight) for g in v.groups if g.weight > 0.01]
        groups.sort(key=lambda x: x[1], reverse=True)
        print(f"Vert {idx} at ({v.co.x:.3f}, {v.co.y:.3f}, {v.co.z:.3f}): {groups}")

print("--- Back Leg R vs Pelvis R verts ---")
check_verts([34954, 34477, 34817, 37097, 32325, 32849, 33179])

print("\n--- Front Leg L vs Stomach verts ---")
check_verts([9672, 9515, 9567])
