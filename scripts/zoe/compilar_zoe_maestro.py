"""
Compilación Maestra Definitiva de ZOE (v-Master 40k):
1. Calidad visual 100% impecable a 40.000 polígonos (reducción del 50% con pelaje denso y tupido).
2. Boca 100% sellada con fondo negro / oscuro interior:
   - Cúpula y garganta interna continua (inward normals) con textura negra/sombra profunda.
   - Cero transparencia: es imposible ver el fondo de la pantalla a través de la boca.
   - Lengua rosada natural apoyada en el piso mandibular.
   - Incisivos blancos estilizados.
3. Pecho 100% sellado sin huecos (forro curvo holográfico continuo).
4. Placa del emblema "Z" 100% rígida anclada a Spine_2: 1.0.
5. Morph Targets orgánicos funcionales:
   - 'blink': Parpadeo limpio de párpados superiores e inferiores.
   - 'mouth_open': Modulación amplia del hocico al hablar.
6. 13 clips de animación limpios y listos para usar.
7. Exportación completa: GLB, FBX y archivo fuente Blender (.blend).
"""
import bpy
import bmesh
import math
import os
import shutil
from mathutils import Vector, Matrix

def main():
    base_dir = r"c:\Users\57304\Desktop\LABORATORIO DE INNOVACON\laboratorio-digital-innovacion"
    orig_glb = os.path.join(base_dir, "public", "assets", "zoe", "zoe_backup_original.glb")
    anim_glb = os.path.join(base_dir, "public", "assets", "zoe", "zoe_animado.glb")
    out_glb = os.path.join(base_dir, "public", "assets", "zoe", "zoe.glb")
    out_fbx = os.path.join(base_dir, "public", "assets", "zoe", "zoe.fbx")
    out_blend = os.path.join(base_dir, "public", "assets", "zoe", "zoe_fuente.blend")
    hostinger_dir = os.path.join(base_dir, "hostinger_deploy", "assets", "zoe")

    print(f"1. Cargando modelo base original desde {orig_glb}...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=orig_glb)

    mesh = bpy.data.objects['mesh']
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

    orig_action_names = {a.name for a in bpy.data.actions}

    # Importar clip scratch de anim_glb
    if os.path.exists(anim_glb):
        bpy.ops.import_scene.gltf(filepath=anim_glb)
        temp_objs = [o for o in bpy.data.objects if o not in [mesh, arm]]
        scratch_act = bpy.data.actions.get('scratch')
        if not scratch_act:
            scratch_act = next((a for name, a in bpy.data.actions.items() if 'scratch' in name.lower()), None)
        if scratch_act:
            scratch_act.name = 'scratch'
            orig_action_names.add('scratch')
            print("  ✓ Acción 'scratch' importada con éxito.")
        for o in temp_objs:
            bpy.data.objects.remove(o, do_unlink=True)

    # Eliminar acciones duplicadas
    for a in list(bpy.data.actions):
        if a.name not in orig_action_names or a.name.endswith('.001'):
            bpy.data.actions.remove(a)

    print(f"  ✓ {len(bpy.data.actions)} acciones listas: {[a.name for a in bpy.data.actions]}")

    # ─── DECIMACIÓN AL 50% (40.000 POLÍGONOS PERFECTOS) ───
    print(f"2. Decimando al 50% para calidad visual 100% densa (~40.000 polígonos)...")
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)

    dec_mod = mesh.modifiers.new(name="Decimate_50", type='DECIMATE')
    dec_mod.ratio = 0.50
    bpy.ops.object.modifier_apply(modifier=dec_mod.name)

    print(f"  ✓ Malla al 50%: {len(mesh.data.polygons)} polígonos, {len(mesh.data.vertices)} vértices.")

    vg_map = {g.name: g.index for g in mesh.vertex_groups}

    # Textura
    mat = mesh.data.materials[0]
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tex_image = bsdf.inputs['Base Color'].links[0].from_node.image

    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    uv_layer = bm.loops.layers.uv.verify()
    dvert_layer = bm.verts.layers.deform.verify()

    pixels = list(tex_image.pixels)
    w, h = tex_image.size

    def sample_texture(u, v):
        x = int((u % 1.0) * w)
        y = int((v % 1.0) * h)
        idx = (y * w + x) * 4
        return pixels[idx], pixels[idx+1], pixels[idx+2]

    # Identificar lengua
    print("3. Identificando vértices de la lengua...")
    visited_verts = set()
    pink_indices = set()
    for vert in bm.verts:
        if vert in visited_verts:
            continue
        if vert.co.y < -0.68 and vert.co.z < 0.35:
            island = []
            queue = [vert]
            visited_verts.add(vert)
            while queue:
                curr = queue.pop(0)
                island.append(curr)
                for edge in curr.link_edges:
                    other = edge.other_vert(curr)
                    if other not in visited_verts and other.co.y < -0.68 and other.co.z < 0.35:
                        visited_verts.add(other)
                        queue.append(other)
            colors = []
            for v_elem in island:
                for loop in v_elem.link_loops:
                    uv = loop[uv_layer].uv
                    colors.append(sample_texture(uv.x, uv.y))
            if colors:
                avg_r = sum(c[0] for c in colors)/len(colors)
                avg_g = sum(c[1] for c in colors)/len(colors)
                if avg_r > 0.40 and (avg_r - avg_g) > 0.06:
                    for v_elem in island:
                        pink_indices.add(v_elem.index)

    print(f"  ✓ {len(pink_indices)} vértices de lengua detectados.")

    # Lengua quieta adentro en el piso mandibular
    print("4. Guardando lengua quieta en el piso de la mandíbula...")
    for v in bm.verts:
        if v.index in pink_indices:
            orig = Vector(v.co)
            factor = max(0.0, min(1.0, (-0.70 - orig.y) / 0.20))
            new_y = orig.y + 0.22 * factor
            new_z = orig.z + 0.04 * factor
            new_x = orig.x * (1.0 - 0.25 * factor)
            v.co = Vector((new_x, new_y, new_z))

    # Boca cerrada y relajada en reposo
    print("5. Relajando y cerrando hocico en reposo...")
    for v in bm.verts:
        if v.index not in pink_indices:
            co = v.co
            if co.z <= 0.315 and co.y <= -0.72 and abs(co.x) <= 0.12:
                f_y = max(0.0, min(1.0, (-0.72 - co.y) / 0.16))
                f_z = max(0.0, min(1.0, (0.315 - co.z) / 0.09))
                v.co = Vector((co.x, co.y - 0.003 * f_y, co.z + 0.015 * f_y * f_z))

    # Dientes blancos estilizados
    print("6. Añadiendo dientecitos blancos...")
    white_uv = (0.476, 0.297)
    head_idx = vg_map.get('Head', 0)
    chin_idx = vg_map.get('Chin', 0)

    def make_tooth(pos, length, width, rot_x_deg=0, is_lower=False):
        tip = Vector((pos.x, pos.y, pos.z - length if not is_lower else pos.z + length))
        w = width * 0.5
        b0 = Vector((pos.x - w, pos.y - w*0.8, pos.z))
        b1 = Vector((pos.x + w, pos.y - w*0.8, pos.z))
        b2 = Vector((pos.x + w*0.8, pos.y + w, pos.z))
        b3 = Vector((pos.x - w*0.8, pos.y + w, pos.z))

        rot_m = Matrix.Rotation(math.radians(rot_x_deg), 3, 'X')
        b_pts = [pos + rot_m @ (p - pos) for p in [b0, b1, b2, b3]]
        t_pt = pos + rot_m @ (tip - pos)

        v_base = [bm.verts.new(p) for p in b_pts]
        v_tip = bm.verts.new(t_pt)
        verts = v_base + [v_tip]

        vg_target = chin_idx if is_lower else head_idx
        for v in verts:
            v[dvert_layer][vg_target] = 1.0

        f0 = bm.faces.new((v_base[0], v_base[1], v_tip))
        f1 = bm.faces.new((v_base[1], v_base[2], v_tip))
        f2 = bm.faces.new((v_base[2], v_base[3], v_tip))
        f3 = bm.faces.new((v_base[3], v_base[0], v_tip))
        for f in [f0, f1, f2, f3]:
            for loop in f.loops:
                loop[uv_layer].uv = white_uv
        return verts

    make_tooth(Vector((0.028, -0.768, 0.324)), length=0.010, width=0.005, rot_x_deg=10, is_lower=False)
    make_tooth(Vector((-0.028, -0.768, 0.324)), length=0.010, width=0.005, rot_x_deg=10, is_lower=False)
    make_tooth(Vector((0.024, -0.762, 0.288)), length=0.008, width=0.005, rot_x_deg=170, is_lower=True)
    make_tooth(Vector((-0.024, -0.762, 0.288)), length=0.008, width=0.005, rot_x_deg=170, is_lower=True)

    # ─── FONDO NEGRO SELLADO DE LA CAVIDAD BUCAL (CERO FONDO VISIBLE) ───
    print("7. Construyendo fondo negro sellado de la cavidad bucal...")
    dark_uv = (0.4531, 0.5938)
    n_ang = 12
    n_depth = 6
    tube_grid = []

    for idep in range(n_depth + 1):
        f_dep = idep / n_depth
        y_pos = -0.755 + f_dep * 0.095
        row = []
        for iang in range(n_ang):
            theta = (iang / n_ang) * 2 * math.pi
            rx = 0.048 * (1.0 - 0.25 * f_dep)
            rz = 0.035 * (1.0 - 0.20 * f_dep)
            cy = y_pos
            cz = 0.300 - 0.010 * f_dep
            cx = 0.0

            px = cx + rx * math.sin(theta)
            pz = cz + rz * math.cos(theta)
            v = bm.verts.new((px, cy, pz))

            cos_t = math.cos(theta)
            if cos_t > 0:
                w_head = 0.5 + 0.5 * cos_t
                w_chin = 1.0 - w_head
            else:
                w_chin = 0.5 - 0.5 * cos_t
                w_head = 1.0 - w_chin

            v[dvert_layer][head_idx] = w_head
            v[dvert_layer][chin_idx] = w_chin
            row.append(v)
        tube_grid.append(row)

    for idep in range(n_depth):
        for iang in range(n_ang):
            next_ang = (iang + 1) % n_ang
            f = bm.faces.new((
                tube_grid[idep][iang],
                tube_grid[idep + 1][iang],
                tube_grid[idep + 1][next_ang],
                tube_grid[idep][next_ang]
            ))
            for loop in f.loops:
                loop[uv_layer].uv = dark_uv

    v_center_back = bm.verts.new((0.0, -0.660, 0.290))
    v_center_back[dvert_layer][head_idx] = 0.5
    v_center_back[dvert_layer][chin_idx] = 0.5
    for iang in range(n_ang):
        next_ang = (iang + 1) % n_ang
        f = bm.faces.new((tube_grid[n_depth][next_ang], tube_grid[n_depth][iang], v_center_back))
        for loop in f.loops:
            loop[uv_layer].uv = dark_uv

    print("  ✓ Cavidad bucal sellada con pared de sombra negra profunda.")

    # ─── FORRO CURVO SELLADO DEL PECHO ───
    print("8. Construyendo forro curvo sellado del pecho...")
    sp2001_idx = vg_map.get('Spine_2001', 0)
    sp2_idx = vg_map.get('Spine_2', 0)
    sh_l_idx = vg_map.get('Front_Leg_Shoulder_L', sp2001_idx)
    sh_r_idx = vg_map.get('Front_Leg_Shoulder_R', sp2001_idx)

    nx_c, nz_c = 8, 10
    c_grid = []
    for iz in range(nz_c + 1):
        fz = iz / nz_c
        z_pos = -0.27 + fz * 0.29
        row = []
        for ix in range(nx_c + 1):
            fx = ix / nx_c
            x_pos = -0.095 + fx * 0.190
            y_pos = -0.385 - 0.022 * math.cos(math.pi * x_pos / 0.10)
            v = bm.verts.new((x_pos, y_pos, z_pos))
            row.append(v)

            v[dvert_layer][sp2001_idx] = 0.50 * fz
            v[dvert_layer][sp2_idx] = 0.50 * (1.0 - fz) + 0.20 * fz
            if x_pos > 0.04:
                v[dvert_layer][sh_l_idx] = 0.30 * (x_pos - 0.04) / 0.055
            elif x_pos < -0.04:
                v[dvert_layer][sh_r_idx] = 0.30 * (-x_pos - 0.04) / 0.055
        c_grid.append(row)

    for iz in range(nz_c):
        for ix in range(nx_c):
            f = bm.faces.new((c_grid[iz][ix], c_grid[iz][ix+1], c_grid[iz+1][ix+1], c_grid[iz+1][ix]))
            u0 = 0.23 + (ix / nx_c) * 0.05
            u1 = 0.23 + ((ix + 1) / nx_c) * 0.05
            v0 = 0.50 + (iz / nz_c) * 0.05
            v1 = 0.50 + ((iz + 1) / nz_c) * 0.05
            f.loops[0][uv_layer].uv = (u0, v0)
            f.loops[1][uv_layer].uv = (u1, v0)
            f.loops[2][uv_layer].uv = (u1, v1)
            f.loops[3][uv_layer].uv = (u0, v1)

    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.update()

    # ─── RIGIDEZ TOTAL DEL EMBLEMA "Z" ───
    print("9. Bloqueando pesos del emblema 'Z' para rigidez absoluta...")
    badge_count = 0
    for v in mesh.data.vertices:
        if abs(v.co.x) <= 0.045 and -0.56 <= v.co.y <= -0.48 and -0.16 <= v.co.z <= 0.02:
            badge_count += 1
            for g in mesh.vertex_groups:
                g.remove([v.index])
            mesh.vertex_groups[sp2_idx].add([v.index], 1.0, 'REPLACE')

    print(f"  ✓ {badge_count} vértices del emblema 'Z' fijados a Spine_2.")

    # ─── MORPH TARGETS (BLINK Y MOUTH_OPEN) ───
    print("10. Creando Morph Targets (blink y mouth_open)...")
    sk_basis = mesh.shape_key_add(name='Basis')
    sk_blink = mesh.shape_key_add(name='blink')
    sk_mouth = mesh.shape_key_add(name='mouth_open')

    # Blink con fórmula radial frontal
    blink_count = 0
    for v in mesh.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z
        if y < -0.65:
            dx = abs(x) - 0.073
            dz = z - 0.520
            r_front = math.hypot(dx, dz)
            if r_front < 0.065:
                blink_count += 1
                f_rad = max(0.0, 1.0 - (r_front / 0.065))
                if z >= 0.505:
                    sk_blink.data[v.index].co.z -= 0.075 * f_rad
                    sk_blink.data[v.index].co.y += 0.018 * f_rad
                else:
                    sk_blink.data[v.index].co.z += 0.025 * f_rad

    print(f"  ✓ Parpadeo configurado en {blink_count} vértices.")

    # Mouth open
    mouth_count = 0
    for v in mesh.data.vertices:
        if v.co.y < -0.65 and 0.20 <= v.co.z <= 0.32 and abs(v.co.x) < 0.12:
            fy = max(0.0, min(1.0, (-0.65 - v.co.y) / 0.18))
            fz = max(0.0, min(1.0, (0.32 - v.co.z) / 0.12))
            weight = fy * fz
            sk_mouth.data[v.index].co.z -= 0.045 * weight
            sk_mouth.data[v.index].co.y -= 0.015 * weight
            mouth_count += 1

    print(f"  ✓ Gesticulación de hocico configurada en {mouth_count} vértices.")

    # Asegurar origen (0,0,0)
    arm.location = (0, 0, 0)
    arm.rotation_euler = (0, 0, 0)
    mesh.location = (0, 0, 0)
    mesh.rotation_euler = (0, 0, 0)

    # 11. Guardar archivo fuente Blender (.blend)
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"11. Archivo fuente Blender guardado en {out_blend}")

    # 12. Exportar GLB definitivo
    print(f"12. Exportando GLB definitivo a {out_glb}...")
    for o in bpy.data.objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh

    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_animations=True,
        export_anim_single_armature=False,
        export_reset_pose_bones=False,
        export_optimize_animation_size=False
    )

    # 13. Exportar FBX definitivo
    print(f"13. Exportando FBX definitivo a {out_fbx}...")
    bpy.ops.export_scene.fbx(
        filepath=out_fbx,
        use_selection=False,
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_NONE',
        bake_space_transform=False,
        object_types={'ARMATURE', 'MESH'},
        use_mesh_modifiers=True,
        mesh_smooth_type='FACE',
        add_leaf_bones=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        armature_nodetype='NULL',
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=True,
        bake_anim_step=1.0,
        bake_anim_simplify_factor=1.0
    )

    # Copiar a hostinger_deploy
    if os.path.exists(hostinger_dir):
        shutil.copyfile(out_glb, os.path.join(hostinger_dir, "zoe.glb"))
        shutil.copyfile(out_fbx, os.path.join(hostinger_dir, "zoe.fbx"))
        shutil.copyfile(out_blend, os.path.join(hostinger_dir, "zoe_fuente.blend"))
        print("  ✓ Copiados a hostinger_deploy con éxito.")

    print(f"=== COMPILACIÓN MAESTRA 40K COMPLETADA CON ÉXITO ===")
    print(f"Polígonos finales: {len(mesh.data.polygons)}")

if __name__ == '__main__':
    main()
