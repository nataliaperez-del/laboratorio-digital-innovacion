"""
Exporta a ZOE como malla estática (sin esqueleto ni animaciones) para subirla a un servicio de
autorig de cuadrúpedos, por ejemplo afk.ai: de pie, a tamaño real, centrado en el piso y con
su textura y relieve.

Uso:
  blender -b --factory-startup --python scripts/zoe/exportar_para_autorig.py -- \
      public/assets/zoe/zoe.glb zoe_para_autorig.glb
"""
import sys

import bpy
from mathutils import Matrix, Vector

source, target = sys.argv[sys.argv.index("--") + 1:][:2]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
# El importador agrega una esfera para dibujar los huesos: ZOE es la malla más grande.
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))

# La malla tal como se ve de pie (reposo del esqueleto), fijada en el mundo.
if arm:
    arm.data.pose_position = "REST"
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
mesh = bpy.data.meshes.new_from_object(body.evaluated_get(depsgraph))
mesh.transform(body.matrix_world)
static = bpy.data.objects.new("ZOE", mesh)
bpy.context.scene.collection.objects.link(static)
for obj in list(bpy.data.objects):
    if obj is not static:
        bpy.data.objects.remove(obj)
static.vertex_groups.clear()

# Centrado sobre el piso: los autorigs esperan las patas en z = 0 y el cuerpo en el origen.
corners = [static.matrix_world @ Vector(c) for c in static.bound_box]
low = min(c.z for c in corners)
center = sum(corners, Vector()) / 8
mesh.transform(Matrix.Translation((-center.x, -center.y, -low)))
size = static.dimensions
print(f"[ZOE] malla estática: {len(mesh.vertices)} vértices, {size.x:.3f} × {size.y:.3f} × {size.z:.3f} m")

bpy.ops.object.select_all(action="DESELECT")
static.select_set(True)
bpy.context.view_layer.objects.active = static
bpy.ops.export_scene.gltf(
    filepath=target,
    export_format="GLB",
    use_selection=True,
    export_skins=False,
    export_animations=False,
    export_image_format="JPEG",
    export_jpeg_quality=92,
    export_yup=True,
)
print("[ZOE] exportado:", target)
