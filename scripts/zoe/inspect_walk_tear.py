import bpy
import math

bpy.ops.wm.open_mainfile(filepath=r"laboratorio-digital-innovacion\public\assets\zoe\zoe_fuente.blend")

arm = bpy.data.objects['Armature']
mesh_obj = bpy.data.objects['mesh']

walk_act = bpy.data.actions.get('walk')
arm.animation_data.action = walk_act

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

# Analizar deformación y aristas estiradas cuadro por cuadro
depsgraph = bpy.context.evaluated_depsgraph_get()

print("=== BUSCANDO ARISTAS EXTREMADAMENTE ESTIRADAS O ROTAS EN WALK ===")
max_stretch_by_frame = {}
for f in range(25):
    bpy.context.scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    eval_mesh_obj = mesh_obj.evaluated_get(dg)
    eval_mesh = eval_mesh_obj.to_mesh()

    max_len = 0.0
    bad_edges = []
    for edge in eval_mesh.edges:
        v0 = eval_mesh.vertices[edge.vertices[0]].co
        v1 = eval_mesh.vertices[edge.vertices[1]].co
        length = (v0 - v1).length
        if length > max_len:
            max_len = length
        if length > 0.12:  # aristas de más de 12 cm en un perro de 40 cm
            bad_edges.append((edge.index, length, v0, v1))

    max_stretch_by_frame[f] = (max_len, len(bad_edges))
    if bad_edges:
        print(f"Cuadro {f}: {len(bad_edges)} aristas rasgadas (>0.12m). Longitud máxima: {max_len:.3f}m")
        for e_idx, l, v0, v1 in bad_edges[:5]:
            print(f"   Edge {e_idx}: {l:.3f}m | v0=({v0.x:.2f},{v0.y:.2f},{v0.z:.2f}) v1=({v1.x:.2f},{v1.y:.2f},{v1.z:.2f})")
    eval_mesh_obj.to_mesh_clear()

# Renderizar vistas en los cuadros clave
# Vista lateral izquierda (X negativa viendo a X positiva)
cam_obj.location = (-1.8, -0.3, 0.4)
cam_obj.rotation_euler = (math.radians(85), 0, math.radians(-90))
cam_data.lens = 45

for frame in [6, 12, 18]:
    bpy.context.scene.frame_set(frame)
    out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\walk_left_f{frame}.png"
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)

# Vista lateral derecha (X positiva viendo a X negativa)
cam_obj.location = (1.8, -0.3, 0.4)
cam_obj.rotation_euler = (math.radians(85), 0, math.radians(90))
for frame in [6, 12, 18]:
    bpy.context.scene.frame_set(frame)
    out_path = rf"C:\Users\57304\.gemini\antigravity\brain\3397a883-6aaa-4934-b50d-67f4b82b81bc\walk_right_f{frame}.png"
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)

print("=== INSPECCION VISUAL WALK COMPLETADA ===")
