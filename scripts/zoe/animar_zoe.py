"""
Animaciones de ZOE sobre el rig de cuadrúpedo de Meshy (49 huesos), creadas en Blender sin animador.

Cada clip se calcula cuadro a cuadro: el cuerpo se coloca con unos pocos parámetros y las patas
se resuelven con cinemática inversa (ley de cosenos en el plano del cuerpo), así que las manos y
las patas se apoyan en el piso también durante las transiciones. Las posturas siguen la anatomía
de un perro real y las referencias del proyecto (hoja de personaje, «PIP», «Andy: A Dog's Tale»,
perro en cinta a cámara lenta). Los nombres de los clips son los que entiende
`src/components/zoe/zoeClipDirector.ts`.

Uso (entrada: el GLB que deja `preparar_meshy_rig.py`):
  blender -b --factory-startup --python scripts/zoe/animar_zoe.py -- entrada.glb public/assets/zoe/zoe.glb [--renders carpeta]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
SOURCE, TARGET = ARGS[0], ARGS[1]
RENDERS = ARGS[ARGS.index("--renders") + 1] if "--renders" in ARGS else ""
FPS = 30

# El perro mira hacia -Y, el eje lateral es X y Z es arriba (convención de Blender).
LATERAL = Vector((1, 0, 0))
FORWARD = Vector((0, -1, 0))
UP = Vector((0, 0, 1))

# Mapa del rig de Meshy: cada pata, de la articulación superior hacia los dedos.
LEGS = {
    "back": ("Back_Leg_Upper_{}", "Back_Leg_Lower_{}", "Back_Leg_Ankle_{}", "Back_Leg_Foot_{}", "Back_Leg_Foot_1_{}"),
    "front": ("Front_Leg_Upper_{}", "Front_Leg_Lower_{}", "Front_Leg_Ankle_{}", "Front_Leg_Foot_{}"),
}
SIDES = ("L", "R")
SPINE = ("Spine_1", "Spine_2", "Spine_2001", "Spine_3", "Spine_4")
TAIL = ("Tail_Base", "Tail_Mid", "Tail_Mid001", "Tail_End")
EARS = ("Ear_L", "Ear_R")


def log(*parts):
    print("[ZOE]", *parts, flush=True)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


# ─── Utilidades de pose (todo en coordenadas del mundo) ─────────────────────

ARM = Matrix.Identity(4)
ARM_INV = Matrix.Identity(4)
POSE = None


def update():
    bpy.context.view_layer.update()


def bone(name):
    return POSE.bones[name]


def head(b):
    return ARM @ b.head


def chain_direction(b):
    return (head(b.children[0]) - head(b)) if b.children else (ARM @ b.tail - head(b))


def turn_about(b, pivot, rotation):
    to_pivot = Matrix.Translation(pivot)
    b.matrix = ARM_INV @ to_pivot @ rotation.to_4x4() @ to_pivot.inverted() @ ARM @ b.matrix
    update()


def rotate(name, degrees, axis):
    b = bone(name)
    turn_about(b, head(b), Matrix.Rotation(math.radians(degrees), 3, axis))


def pitch(name, degrees):
    """Positivo: la parte delantera del hueso baja (asentir)."""
    rotate(name, degrees, LATERAL)


def yaw(name, degrees):
    rotate(name, degrees, UP)


def roll(name, degrees):
    rotate(name, degrees, FORWARD)


def move(name, offset):
    b = bone(name)
    b.matrix = ARM_INV @ Matrix.Translation(offset) @ ARM @ b.matrix
    update()


def aim(b, direction):
    turn_about(b, head(b), chain_direction(b).rotation_difference(direction).to_matrix())


def reset():
    for b in POSE.bones:
        b.matrix_basis = Matrix.Identity(4)
    update()


def leg(side, kind):
    return [bone(name.format(side)) for name in LEGS[kind]]


def solve_leg(side, kind, target, bend, flat=None, rest_dirs=None):
    """Lleva la tercera articulación (corvejón o carpo) a `target`; `bend` -1 dobla la rodilla
    hacia delante, +1 el codo hacia atrás. Lo que sigue queda plano (`flat`) o como en reposo."""
    pieces = leg(side, kind)
    upper, middle, joint = pieces[0], pieces[1], pieces[2]
    top = head(upper)
    l1 = (head(middle) - top).length
    l2 = (head(joint) - head(middle)).length
    to_target = target - top
    reach = max(abs(l1 - l2) + 1e-6, min(to_target.length, (l1 + l2) * 0.999))
    axis = to_target.normalized()
    along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
    offset = math.sqrt(max(l1 * l1 - along * along, 0.0))
    knee = top + axis * along + LATERAL.cross(axis).normalized() * offset * bend
    aim(upper, knee - top)
    aim(middle, target - head(middle))
    for piece in pieces[2:]:
        aim(piece, flat if flat is not None else rest_dirs[piece.name])


# ─── Medidas del modelo en reposo ───────────────────────────────────────────

class Rest:
    pass


def measure(body):
    reset()
    rest = Rest()
    rest.ground = min((body.matrix_world @ v.co).z for v in body.data.vertices)
    rest.joint = {b.name: head(b) for b in POSE.bones}
    rest.dirs = {b.name: chain_direction(b) for b in POSE.bones}
    hip = rest.joint["Back_Leg_Upper_L"]
    rest.hip_height = hip.z - rest.ground
    rest.shoulder_height = rest.joint["Front_Leg_Upper_L"].z - rest.ground
    lengths = lambda kind: [(rest.joint[leg_names[i + 1]] - rest.joint[leg_names[i]]).length for leg_names in [[n.format("L") for n in LEGS[kind]]] for i in range(2)]
    rest.back = lengths("back")
    rest.front = lengths("front")
    # Grosor de la pata bajo el corvejón y el carpo cuando metatarso y metacarpo quedan en el piso.
    rest.foot_lift = (rest.joint["Back_Leg_Foot_L"].z - rest.ground) * 0.9
    rest.head_elevation = head_elevation()
    log(f"reposo: cadera a {rest.hip_height:.3f}, hombro a {rest.shoulder_height:.3f}, muslo+tibia {sum(rest.back):.3f}, brazo {sum(rest.front):.3f}")
    return rest


FLAT = (FORWARD + Vector((0, 0, -0.04))).normalized()


# ─── Colocar el cuerpo ──────────────────────────────────────────────────────

def body(rest, body_pitch=0.0, hip_drop=0.0, chest_pitch=0.0, neck=0.0, head_pitch=0.0, head_yaw=0.0, head_roll=0.0):
    """Inclina el cuerpo alrededor de la cadera y lo baja; el pecho, el cuello y la cabeza se
    reparten el resto. Ángulos en grados; `body_pitch` negativo levanta el pecho."""
    pitch("Hips", body_pitch)
    move("Hips", Vector((0, 0, -hip_drop)))
    if chest_pitch:
        pitch("Spine_2", chest_pitch)
    if neck:
        pitch("Spine_3", neck * 0.5)
        pitch("Spine_4", neck * 0.5)
    if head_pitch:
        pitch("Head", head_pitch)
    if head_yaw:
        yaw("Head", head_yaw)
    if head_roll:
        roll("Head", head_roll)


def tail(swing=0.0, lift=0.0, phase=0.0):
    for i, name in enumerate(TAIL):
        if lift:
            pitch(name, -lift * (0.6 if i == 0 else 0.25))
        if swing:
            yaw(name, swing * math.sin(phase - i * 0.7) * (0.6 + i * 0.25))


def ears(lift=0.0, spread=0.0):
    for name, side in zip(EARS, (1, -1)):
        if lift:
            pitch(name, -lift)
        if spread:
            yaw(name, spread * side)


def breathe(t, depth=1.0):
    pitch("Spine_2", -0.8 * depth * math.sin(2 * math.pi * t))
    pitch("Spine_2001", 0.6 * depth * math.sin(2 * math.pi * t))


def head_elevation():
    d = head(bone("Nose")) - head(bone("Head"))
    return math.degrees(math.atan2(d.z, -d.y))


def level_head(rest, extra=0.0):
    """Reparte entre cuello y cabeza el giro que devuelve la mirada a la de reposo (+ `extra` grados hacia abajo)."""
    diff = head_elevation() - rest.head_elevation + extra
    for name, share in (("Spine_3", 0.4), ("Spine_4", 0.3), ("Head", 0.3)):
        pitch(name, diff * share)


def place_hips(rest, height):
    """Sube o baja la cadera hasta que la articulación quede a `height` sobre el piso."""
    hip = head(leg("L", "back")[0])
    move("Hips", Vector((0, 0, rest.ground + height - hip.z)))


def plant_standing(rest):
    """Patas como en reposo: después de mover el cuerpo, las cuatro siguen en su sitio."""
    for side in SIDES:
        solve_leg(side, "back", rest.joint[f"Back_Leg_Ankle_{side}"], bend=-1, rest_dirs=rest.dirs)
        solve_leg(side, "front", rest.joint[f"Front_Leg_Ankle_{side}"], bend=1, rest_dirs=rest.dirs)


# ─── Posturas finales ───────────────────────────────────────────────────────

# «chest»: parte del giro de la cadera que el pecho devuelve al sentarse. Con 0,15 el pecho quedaba
# casi tan erguido como la espalda y el cuello se doblaba ~49° para enderezar la cabeza: la piel
# entre el collar y la placa del arnés se estiraba hasta ×40 y la tira central se partía. Con 0,6
# la curva se hace en la zona lumbar, como en un perro real, y el cuello apenas se dobla.
SIT = {"hip": 0.30, "hock_back": 0.12, "hock_out": 0.05, "max_pitch": 55, "chest": 0.6, "neck": 0.5, "head": 0.45}
LIE = {"hip": 0.30, "shoulder": 0.32, "hock_back": 0.20, "hock_out": 0.10, "head": 6}


def sit_angle(rest):
    """La mayor inclinación con la que las manos siguen apoyadas donde estaban, casi rectas."""
    for angle in range(SIT["max_pitch"], 0, -1):
        reset()
        body(rest, body_pitch=-angle)
        place_hips(rest, rest.hip_height * SIT["hip"])
        ok = all((head(leg(s, "front")[0]) - rest.joint[f"Front_Leg_Ankle_{s}"]).length <= sum(rest.front) * 0.985 for s in SIDES)
        if ok:
            return angle
    return 10


def pose_sit(rest, s, angle, t=0.0, look=0.0):
    """Sentado en la fracción `s` del gesto (0 de pie, 1 sentado)."""
    reset()
    a = angle * s
    body(rest, body_pitch=-a, chest_pitch=a * SIT["chest"])
    place_hips(rest, lerp(rest.hip_height, rest.hip_height * SIT["hip"], s))
    if t:
        breathe(t, 0.8)
    for side in SIDES:
        sign = 1 if side == "L" else -1
        hip = head(leg(side, "back")[0])
        end = Vector((hip.x + sign * rest.hip_height * SIT["hock_out"], hip.y + rest.hip_height * SIT["hock_back"], rest.ground + rest.foot_lift))
        hock = rest.joint[f"Back_Leg_Ankle_{side}"].lerp(end, s)
        hock.z += math.sin(math.pi * s) * rest.hip_height * 0.05  # la pata se recoge en arco, no se arrastra
        flat = rest.dirs[f"Back_Leg_Ankle_{side}"].lerp(FLAT, s).normalized()
        solve_leg(side, "back", hock, bend=-1, flat=flat)
        # La escápula acompaña: absorbe la mitad del giro del pecho y el hombro no se pliega.
        pitch(f"Front_Leg_Shoulder_{side}", a * 0.5)
        solve_leg(side, "front", rest.joint[f"Front_Leg_Ankle_{side}"], bend=1, rest_dirs=rest.dirs)
    level_head(rest)
    if look:
        yaw("Head", look)
    tail(lift=-25 * s)


def pose_lie(rest, s, t=0.0, sleep=0.0, look=0.0):
    """Echado en la fracción `s` (0 de pie, 1 echado como esfinge); `sleep` baja la cabeza."""
    reset()
    drop = rest.hip_height * (1 - LIE["hip"]) * s
    body(rest, hip_drop=drop)
    # El pecho baja más que la cadera: los hombros quedan cerca del piso.
    chest_drop = (rest.shoulder_height * (1 - LIE["shoulder"]) - drop) * s
    spine_len = (rest.joint["Spine_2001"] - rest.joint["Hips"]).length
    pitch("Spine_1", math.degrees(math.atan2(chest_drop, spine_len)))
    if t:
        breathe(t, 0.6 if sleep else 0.8)
    for side in SIDES:
        sign = 1 if side == "L" else -1
        hip = head(leg(side, "back")[0])
        end = Vector((hip.x + sign * rest.hip_height * LIE["hock_out"], hip.y + rest.hip_height * LIE["hock_back"], rest.ground + rest.foot_lift))
        hock = rest.joint[f"Back_Leg_Ankle_{side}"].lerp(end, s)
        hock.z += math.sin(math.pi * s) * rest.hip_height * 0.05
        solve_leg(side, "back", hock, bend=-1, flat=rest.dirs[f"Back_Leg_Ankle_{side}"].lerp(FLAT, s).normalized())
        # Manos: el codo baja al piso detrás del hombro y el antebrazo queda plano hacia delante.
        shoulder = head(leg(side, "front")[0])
        l1, l2 = rest.front
        height = max(shoulder.z - (rest.ground + rest.foot_lift), 0.0)
        elbow_back = math.sqrt(max(l1 * l1 - height * height, 0.0))
        end_carpus = Vector((rest.joint[f"Front_Leg_Ankle_{side}"].x, shoulder.y + elbow_back - l2 * 0.97, rest.ground + rest.foot_lift))
        carpus = rest.joint[f"Front_Leg_Ankle_{side}"].lerp(end_carpus, s)
        carpus.z += math.sin(math.pi * s) * rest.hip_height * 0.06
        solve_leg(side, "front", carpus, bend=1, flat=rest.dirs[f"Front_Leg_Ankle_{side}"].lerp(FLAT, s).normalized())
    # La cabeza compensa la caída del pecho y mira al frente; dormido, descansa sobre las manos.
    level_head(rest, extra=(LIE["head"] + 38 * sleep) * s)
    if sleep:
        pitch("Chin", -4 * sleep)  # boca cerrada al dormir
    if look:
        yaw("Head", look)
    tail(lift=-30 * s)


# ─── Clips ──────────────────────────────────────────────────────────────────

def record(arm, name, frames, pose_at):
    """Crea la acción `name` con `frames` cuadros llamando a `pose_at(fracción)` en cada uno."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    for f in range(frames + 1):
        pose_at(f / frames)
        for b in POSE.bones:
            b.rotation_mode = "QUATERNION"
            b.keyframe_insert("rotation_quaternion", frame=f)
            b.keyframe_insert("location", frame=f)
    arm.animation_data.action = None
    log("clip:", name, f"{frames / FPS:.1f} s")
    return action


def make_clips(arm, rest, existing=()):
    angle = sit_angle(rest)
    log(f"inclinación al sentarse: {angle}°")

    def idle(t):
        reset()
        body(rest, head_yaw=6 * math.sin(2 * math.pi * t), head_pitch=2 * math.sin(4 * math.pi * t))
        breathe(t * 3)
        plant_standing(rest)
        ears(lift=4 * max(0.0, math.sin(2 * math.pi * t * 2)))
        tail(swing=10, phase=2 * math.pi * t * 2)

    def alert(t):
        reset()
        body(rest, head_roll=12, head_pitch=-4, head_yaw=4 * math.sin(2 * math.pi * t))
        breathe(t * 2)
        plant_standing(rest)
        ears(lift=-14, spread=-6)
        tail(swing=4, lift=8, phase=2 * math.pi * t)

    stride = rest.hip_height * 0.55
    lift_h = rest.hip_height * 0.17
    phases = {("L", "back"): 0.0, ("L", "front"): 0.25, ("R", "back"): 0.5, ("R", "front"): 0.75}

    def walk(t):
        reset()
        body(rest, head_pitch=3 * math.cos(4 * math.pi * (t - 0.25)))
        move("Hips", Vector((0, 0, rest.hip_height * 0.022 * math.cos(4 * math.pi * t))))
        roll("Hips", 1.5 * math.sin(2 * math.pi * t))
        for (side, kind), offset in phases.items():
            p = (t + offset) % 1.0
            duty = 0.62
            if p < duty:
                ahead, lift, flick = stride * (0.5 - p / duty), 0.0, 0.0
            else:
                q = (p - duty) / (1 - duty)
                ahead, lift = stride * (smooth(q) - 0.5), lift_h * math.sin(math.pi * q)
                flick = math.radians(50) * math.sin(math.pi * min(1.0, q * 1.3))
            joint = f"{'Back' if kind == 'back' else 'Front'}_Leg_Ankle_{side}"
            target = rest.joint[joint] + FORWARD * ahead + UP * lift
            dirs = {name.format(side): Matrix.Rotation(flick * (1.0 + i * 0.3), 3, LATERAL) @ rest.dirs[name.format(side)] for i, name in enumerate(LEGS[kind][2:])}
            solve_leg(side, kind, target, bend=-1 if kind == "back" else 1, rest_dirs=dirs)
        tail(swing=12, phase=2 * math.pi * t)

    def happy(t):
        reset()
        envelope = math.sin(math.pi * t)
        hop = abs(math.sin(2 * math.pi * t * 2)) * envelope
        body(rest, head_pitch=-8 * envelope)
        move("Hips", Vector((0, 0, rest.hip_height * 0.06 * hop)))
        plant_standing(rest)
        ears(lift=-10 * envelope)
        tail(swing=30 * envelope, lift=20 * envelope, phase=2 * math.pi * t * 6)

    def play(t):
        reset()
        s = smooth(min(1.0, t / 0.3)) * smooth(min(1.0, (1 - t) / 0.3))
        # Reverencia: el pecho baja hasta los codos y la grupa queda arriba.
        body(rest, chest_pitch=0)
        spine_len = (rest.joint["Spine_2001"] - rest.joint["Hips"]).length
        drop = rest.shoulder_height * 0.45 * s
        pitch("Spine_1", math.degrees(math.atan2(drop, spine_len)))
        for side in SIDES:
            solve_leg(side, "back", rest.joint[f"Back_Leg_Ankle_{side}"], bend=-1, rest_dirs=rest.dirs)
            shoulder = head(leg(side, "front")[0])
            l1, l2 = rest.front
            height = max(shoulder.z - (rest.ground + rest.foot_lift), 0.0)
            elbow_back = math.sqrt(max(l1 * l1 - height * height, 0.0))
            end = Vector((rest.joint[f"Front_Leg_Ankle_{side}"].x, shoulder.y + elbow_back - l2 * 0.97, rest.ground + rest.foot_lift))
            solve_leg(side, "front", rest.joint[f"Front_Leg_Ankle_{side}"].lerp(end, s), bend=1, flat=rest.dirs[f"Front_Leg_Ankle_{side}"].lerp(FLAT, s).normalized())
        pitch("Spine_3", -math.degrees(math.atan2(drop, spine_len)) * 0.8)
        tail(swing=28 * s, lift=30 * s, phase=2 * math.pi * t * 5)
        ears(lift=-8 * s)

    clips = {
        "idle": record(arm, "idle", 4 * FPS, idle),
        "alert": record(arm, "alert", 3 * FPS, alert),
        "walk": record(arm, "walk", FPS, walk),
        "sit_down": record(arm, "sit_down", int(1.1 * FPS), lambda t: pose_sit(rest, smooth(t), angle)),
        "sit_idle": record(arm, "sit_idle", 4 * FPS, lambda t: pose_sit(rest, 1.0, angle, t=t * 2, look=5 * math.sin(2 * math.pi * t))),
        "lie_down": record(arm, "lie_down", int(1.6 * FPS), lambda t: pose_lie(rest, smooth(t))),
        "lie_idle": record(arm, "lie_idle", 4 * FPS, lambda t: pose_lie(rest, 1.0, t=t * 2, look=6 * math.sin(2 * math.pi * t))),
        "sleep": record(arm, "sleep", 6 * FPS, lambda t: pose_lie(rest, 1.0, t=t * 2, sleep=1.0)),
        # Si el GLB ya trae «Tail_Wag» (Meshy), ese hace de alegría y no se crea otro.
        **({} if any(n.lower().replace("_", "") == "tailwag" for n in existing) else {"happy": record(arm, "happy", int(1.5 * FPS), happy)}),
        "play_bow": record(arm, "play_bow", 2 * FPS, play),
    }
    return clips


# ─── Capturas de control ────────────────────────────────────────────────────

def renders(arm, body_obj, clips, rest):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.resolution_x, scene.render.resolution_y = 560, 420
    scene.world = bpy.data.worlds.new("fondo")
    camera = bpy.data.objects.new("cámara", bpy.data.cameras.new("cámara"))
    scene.collection.objects.link(camera)
    scene.camera = camera
    corners = [body_obj.matrix_world @ Vector(c) for c in body_obj.bound_box]
    center = sum(corners, Vector()) / 8
    size = max((max(c[i] for c in corners) - min(c[i] for c in corners)) for i in range(3))
    target = Vector((center.x, center.y, rest.ground + size * 0.32))

    def shot(name, direction):
        camera.location = target + Vector(direction).normalized() * size * 2.3
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(RENDERS, name + ".png")
        bpy.ops.render.render(write_still=True)

    plan = [("sit_idle", 0, "lado"), ("sit_idle", 0, "tres"), ("lie_idle", 0, "lado"), ("lie_idle", 0, "tres"), ("sleep", 0, "tres"), ("play_bow", 30, "lado"),
            ("walk", 0, "lado"), ("walk", 8, "lado"), ("walk", 15, "lado"), ("walk", 23, "lado"), ("sit_down", 16, "lado"), ("lie_down", 24, "lado")]
    views = {"lado": (1, 0, 0.12), "tres": (0.7, -0.7, 0.3)}
    for clip, frame, view in plan:
        arm.animation_data.action = clips[clip]
        scene.frame_set(frame)
        shot(f"{clip}_{frame:02d}_{view}", views[view])
    arm.animation_data.action = None
    reset()
    log("capturas en", RENDERS)


# ─── Proceso ────────────────────────────────────────────────────────────────

def main():
    global ARM, ARM_INV, POSE
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body_obj = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
    for obj in list(bpy.data.objects):
        if obj not in (arm, body_obj):
            bpy.data.objects.remove(obj)
    # Las animaciones que ya trae el GLB (por ejemplo las de Meshy: Shake, Trot, Tail_Wag) se
    # conservan; se desactivan mientras se mide el reposo y se crean las demás.
    imported = list(bpy.data.actions)
    for action in imported:
        action.use_fake_user = True
    if arm.animation_data:
        arm.animation_data.action = None
        for track in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(track)
    log("animaciones del GLB:", ", ".join(a.name for a in imported) or "ninguna")
    bpy.context.scene.render.fps = FPS
    update()
    ARM, ARM_INV, POSE = arm.matrix_world.copy(), arm.matrix_world.inverted(), arm.pose
    rest = measure(body_obj)
    clips = make_clips(arm, rest, [a.name for a in imported])
    if RENDERS:
        os.makedirs(RENDERS, exist_ok=True)
        renders(arm, body_obj, clips, rest)
    reset()
    bpy.ops.object.select_all(action="DESELECT")
    body_obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=TARGET, export_format="GLB", use_selection=True, export_skins=True, export_animations=True,
                              export_animation_mode="ACTIONS", export_image_format="JPEG", export_jpeg_quality=88, export_yup=True)
    log("exportado:", TARGET, f"{os.path.getsize(TARGET) / 1e6:.1f} MB")


main()
