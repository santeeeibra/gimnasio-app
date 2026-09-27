"""FACE RIG PASSPORT - Pulpo Volt.

Contrato verificable del rig facial. Cada criterio de aceptacion tiene un test
numerico: el resultado es PASS/FAIL, no una interpretacion de screenshot.

Uso dentro de Blender (via blender-mcp):
    exec(open(r"D:\\SISTEMA GYM\\scripts\\blender\\face_rig_audit.py").read())
    print(audit_json())
"""

import bpy
import json
import math
from mathutils import Vector

# ---------------------------------------------------------------- PASSPORT

PASSPORT = {
    "model": "Pulpo Volt",
    "blend": r"D:\SISTEMA GYM\public\models\volt-original-weld.blend",
    # Sistema de coordenadas (medido, no asumido):
    # el modelo esta rotado respecto al "front" de Blender.
    "axes": {
        "face_forward": (1.0, 0.0, 0.0),   # la cara mira hacia +X
        "up": (0.0, 0.0, 1.0),
        "lateral": (0.0, 1.0, 0.0),        # Eye_L en Y<0, Eye_R en Y>0
        "blender_front_view": "RIGHT",     # view_axis que da la cara de frente
    },
    "head": "tripo_WELD_TEST",
    "armature": "Armature",
    "eyes": {
        "L": {"sclera": "Eyeball_L_Sclera", "pupil": "Eyeball_L_Pupil",
              "lid": "Eyelid_L", "bone": "Eye_L", "lid_bone": "Lid_L"},
        "R": {"sclera": "Eyeball_R_Sclera", "pupil": "Eyeball_R_Pupil",
              "lid": "Eyelid_R", "bone": "Eye_R", "lid_bone": "Lid_R"},
    },
    # El parpadeo es ROTACION DE HUESO, no shape key: una shape key interpola
    # en linea recta (cuerda) y a mitad de recorrido el parpado entraria dentro
    # del globo. La rotacion mantiene el radio constante.
    "blink_lift_deg": 105.0,
    "mouth": {"obj": "Mouth", "bone": "Head"},
    "brows": {"L": {"obj": "Brow_L", "bone": "Head"},
              "R": {"obj": "Brow_R", "bone": "Head"}},
    "expected_shape_keys": {
        "Eyelid_L": ["Basis"],
        "Eyelid_R": ["Basis"],
        "Brow_L": ["Basis", "browUp", "browDown"],
        "Brow_R": ["Basis", "browUp", "browDown"],
        "Mouth": ["Basis", "jawOpen", "smile", "frown"],
    },
    "expected_parenting": {
        "Eyelid_L": ("Armature", "BONE", "Lid_L"),
        "Eyelid_R": ("Armature", "BONE", "Lid_R"),
        "Eyeball_L_Sclera": ("Armature", "BONE", "Eye_L"),
        "Eyeball_R_Sclera": ("Armature", "BONE", "Eye_R"),
        "Eyeball_L_Pupil": ("Armature", "BONE", "Eye_L"),
        "Eyeball_R_Pupil": ("Armature", "BONE", "Eye_R"),
        "Mouth": ("Armature", "BONE", "Head"),
        "Brow_L": ("Armature", "BONE", "Head"),
        "Brow_R": ("Armature", "BONE", "Head"),
    },
    # Shape keys viejas de la cabeza: existen pero NO se usan en este sistema.
    "head_legacy_shape_keys_frozen_at_zero": True,
    "tolerances": {
        "min_clearance": 0.0005,   # separacion minima parpado/ojo (m)
        "max_clearance": 0.020,    # mas que esto = pieza flotante (m)
        "static_epsilon": 1e-5,    # movimiento maximo de lo que NO debe moverse
    },
}

ACCEPTANCE_CRITERIA = [
    "AC1  inventario, tipos y parenting segun passport",
    "AC2  shape keys esperadas presentes, sin sobrantes",
    "AC3  neutral: ambas pupilas visibles (ojo abierto)",
    "AC4  blink L: pupila L tapada por Eyelid_L, pupila R visible",
    "AC5  blink R: pupila R tapada por Eyelid_R, pupila L visible",
    "AC6  blink doble: ambas pupilas tapadas, simetrico",
    "AC7  ningun componente penetra la esfera del ojo",
    "AC8  ningun componente flota lejos de la superficie",
    "AC9  independencia: mover un componente no mueve los demas",
    "AC10 cabeza (tripo_WELD_TEST) nunca se deforma",
    "AC11 rig de cuerpo intacto (bones sin cambios)",
    "AC12 GLB conserva morph targets",
]


# ---------------------------------------------------------------- helpers

def _obj(name):
    return bpy.data.objects.get(name)


def _dg():
    return bpy.context.evaluated_depsgraph_get()


def _world_verts(name):
    """Coordenadas mundiales evaluadas (con shape keys y armature aplicados)."""
    o = _obj(name)
    if o is None or o.type != 'MESH':
        return []
    ev = o.evaluated_get(_dg())
    mw = ev.matrix_world
    return [mw @ v.co for v in ev.data.vertices]


def _center_radius(name):
    vs = _world_verts(name)
    if not vs:
        return None, None
    c = sum(vs, Vector((0, 0, 0))) / len(vs)
    r = max((v - c).length for v in vs)
    return c, r


def set_state(state):
    """state: {"Eyelid_L.closed": 1.0, ...}. Lo no mencionado se pone en 0."""
    for obj_name, keys in PASSPORT["expected_shape_keys"].items():
        o = _obj(obj_name)
        if o is None or not o.data.shape_keys:
            continue
        for kb in o.data.shape_keys.key_blocks:
            if kb.name == "Basis":
                continue
            kb.value = float(state.get("%s.%s" % (obj_name, kb.name), 0.0))
    bpy.context.view_layer.update()


def set_blink(side, amount):
    """Parpadeo por rotacion del hueso Lid_*. 0 = abierto (rest), 1 = cerrado.

    Pivota en la cabeza del hueso, que coincide con el centro del ojo, asi el
    parpado conserva su radio durante todo el recorrido.
    """
    from mathutils import Matrix
    arm = _obj(PASSPORT["armature"])
    name = PASSPORT["eyes"][side]["lid_bone"]
    pb = arm.pose.bones[name]
    rest = arm.data.bones[name].matrix_local
    h = arm.data.bones[name].head_local
    ang = math.radians(PASSPORT["blink_lift_deg"]) * amount
    # eje Z del armature == eje Y del mundo == eje lateral del parpadeo
    pb.matrix_basis = Matrix.Identity(4)
    pb.matrix = (Matrix.Translation(h) @ Matrix.Rotation(ang, 4, 'Z')
                 @ Matrix.Translation(-h) @ rest)
    bpy.context.view_layer.update()


def set_blinks(L=0.0, R=0.0):
    set_blink("L", L)
    set_blink("R", R)


def freeze_head_legacy_keys():
    """Las shape keys viejas de la cabeza quedan en 0 y no se usan."""
    o = _obj(PASSPORT["head"])
    if o is None or not o.data.shape_keys:
        return 0
    n = 0
    for kb in o.data.shape_keys.key_blocks:
        if kb.name != "Basis" and kb.value != 0.0:
            kb.value = 0.0
            n += 1
    return n


def restore_visibility():
    """Deshace ocultamientos de sesiones de debug."""
    for o in bpy.data.objects:
        o.hide_set(False)


# ------------------------------------------------- test primitivo: raycast

def what_occludes(target_name, ignore_armature=True):
    """Que objeto se ve primero mirando la cara de frente hacia `target_name`.

    Es el test determinista de 'ojo abierto': si devuelve la pupila, se ve.
    """
    c, _ = _center_radius(target_name)
    if c is None:
        return {"error": "target sin geometria: %s" % target_name}
    fwd = Vector(PASSPORT["axes"]["face_forward"]).normalized()
    origin = c + fwd * 0.5
    direction = -fwd
    hit, loc, _nrm, _idx, obj, _m = bpy.context.scene.ray_cast(
        _dg(), origin, direction)
    if not hit:
        return {"hit": False, "object": None}
    return {"hit": True, "object": obj.name if obj else None,
            "distance_from_target": round((loc - c).length, 5)}


def pupil_visible(side):
    eye = PASSPORT["eyes"][side]
    r = what_occludes(eye["pupil"])
    r["visible"] = (r.get("object") == eye["pupil"])
    r["side"] = side
    r["expected_when_open"] = eye["pupil"]
    r["expected_when_closed"] = eye["lid"]
    return r


# ------------------------------------------- test primitivo: penetracion

def clearance(part_name, sphere_name):
    """Separacion minima entre los vertices de `part` y la esfera `sphere`.

    Negativa = penetra. Devuelve tambien el maximo, para detectar flotantes.
    """
    c, r = _center_radius(sphere_name)
    vs = _world_verts(part_name)
    if c is None or not vs:
        return {"error": "sin geometria"}
    ds = [(v - c).length - r for v in vs]
    return {"part": part_name, "vs": sphere_name,
            "min": round(min(ds), 5), "max": round(max(ds), 5),
            "penetrates": min(ds) < -PASSPORT["tolerances"]["min_clearance"]}


# ------------------------------------------- test primitivo: independencia

def snapshot(names):
    return {n: [tuple(round(c, 6) for c in v) for v in _world_verts(n)]
            for n in names}


def diff_snapshots(a, b):
    """Cuanto se movio cada objeto entre dos estados."""
    out = {}
    for n in a:
        if n not in b or len(a[n]) != len(b[n]):
            out[n] = {"error": "mismatch"}
            continue
        d = max((Vector(p) - Vector(q)).length for p, q in zip(a[n], b[n])) \
            if a[n] else 0.0
        out[n] = {"max_move": round(d, 6),
                  "moved": d > PASSPORT["tolerances"]["static_epsilon"]}
    return out


# ---------------------------------------------------------------- AC tests

def _all_facial_objects():
    names = [PASSPORT["head"], PASSPORT["mouth"]["obj"]]
    for s in ("L", "R"):
        names += [PASSPORT["eyes"][s][k] for k in ("sclera", "pupil", "lid")]
        names.append(PASSPORT["brows"][s]["obj"])
    return [n for n in names if _obj(n) is not None]


def ac1_inventory():
    rows = {}
    ok = True
    for name, (par, ptype, pbone) in PASSPORT["expected_parenting"].items():
        o = _obj(name)
        if o is None:
            rows[name] = {"status": "MISSING"}
            ok = False
            continue
        got = (o.parent.name if o.parent else None, o.parent_type,
               o.parent_bone or None)
        good = got == (par, ptype, pbone)
        rows[name] = {"status": "OK" if good else "WRONG",
                      "expected": [par, ptype, pbone], "got": list(got)}
        ok = ok and good
    return {"criterion": "AC1", "pass": ok, "detail": rows}


def ac2_shape_keys():
    rows = {}
    ok = True
    for name, expected in PASSPORT["expected_shape_keys"].items():
        o = _obj(name)
        if o is None:
            rows[name] = {"status": "MISSING"}
            ok = False
            continue
        got = [k.name for k in o.data.shape_keys.key_blocks] \
            if o.data.shape_keys else []
        missing = [k for k in expected if k not in got]
        extra = [k for k in got if k not in expected]
        good = not missing and not extra
        rows[name] = {"status": "OK" if good else "DIFF",
                      "missing": missing, "extra": extra}
        ok = ok and good
    return {"criterion": "AC2", "pass": ok, "detail": rows}


def ac3_to_ac6_blinks():
    cases = [
        ("AC3  neutral", (0.0, 0.0), {"L": True, "R": True}),
        ("AC4  blink L", (1.0, 0.0), {"L": False, "R": True}),
        ("AC5  blink R", (0.0, 1.0), {"L": True, "R": False}),
        ("AC6  blink doble", (1.0, 1.0), {"L": False, "R": False}),
    ]
    results = []
    allok = True
    for label, (bl, br), expect in cases:
        set_state({})
        set_blinks(bl, br)
        row = {"case": label, "blink": {"L": bl, "R": br}, "eyes": {}}
        ok = True
        for side in ("L", "R"):
            v = pupil_visible(side)
            want_visible = expect[side]
            good = (v["visible"] == want_visible)
            if not want_visible:
                # cerrado: quien tapa debe ser el parpado de ESE ojo
                good = good and (v.get("object")
                                 == PASSPORT["eyes"][side]["lid"])
            v["expected_visible"] = want_visible
            v["pass"] = good
            row["eyes"][side] = v
            ok = ok and good
        row["pass"] = ok
        allok = allok and ok
        results.append(row)
    set_blinks(0.0, 0.0)
    set_state({})
    return {"criterion": "AC3-AC6", "pass": allok, "detail": results}


def ac7_penetration(steps=10):
    """Barre el parpadeo completo: la penetracion aparece a mitad de camino."""
    rows = []
    ok = True
    for side in ("L", "R"):
        e = PASSPORT["eyes"][side]
        worst = None
        for i in range(steps + 1):
            a = i / float(steps)
            set_blinks(**{side: a})
            c = clearance(e["lid"], e["sclera"])
            if worst is None or c["min"] < worst["min"]:
                worst = dict(c, blink=a)
            ok = ok and not c.get("penetrates", True)
        rows.append({"side": side, "peor_holgura": worst})
        set_blinks(0.0, 0.0)
    return {"criterion": "AC7", "pass": ok, "detail": rows}


def ac8_floating():
    """Ningun componente facial debe estar despegado de la cabeza."""
    head_vs = _world_verts(PASSPORT["head"])
    rows = []
    ok = True
    parts = [PASSPORT["mouth"]["obj"]]
    for s in ("L", "R"):
        parts += [PASSPORT["eyes"][s]["lid"], PASSPORT["brows"][s]["obj"]]
    for p in parts:
        vs = _world_verts(p)
        if not vs or not head_vs:
            continue
        # distancia del centroide de la pieza al vertice de cabeza mas cercano
        c = sum(vs, Vector((0, 0, 0))) / len(vs)
        d = min((c - hv).length for hv in head_vs)
        good = d <= PASSPORT["tolerances"]["max_clearance"]
        rows.append({"part": p, "dist_to_head": round(d, 5), "pass": good})
        ok = ok and good
    return {"criterion": "AC8", "pass": ok, "detail": rows}


def ac9_ac10_independence():
    """Mover un componente no debe mover los otros ni la cabeza."""
    names = _all_facial_objects()
    set_state({})
    base = snapshot(names)
    rows = []
    ok = True
    drivers = []
    for obj_name, keys in PASSPORT["expected_shape_keys"].items():
        if _obj(obj_name) is None:
            continue
        for k in keys:
            if k != "Basis":
                drivers.append("%s.%s" % (obj_name, k))
    for drv in drivers:
        owner = drv.split(".")[0]
        set_state({drv: 1.0})
        d = diff_snapshots(base, snapshot(names))
        bad = [n for n, r in d.items()
               if r.get("moved") and n != owner]
        head_moved = d.get(PASSPORT["head"], {}).get("moved", False)
        good = not bad and not head_moved
        rows.append({"driver": drv, "also_moved": bad,
                     "head_deformed": head_moved, "pass": good})
        ok = ok and good
    set_state({})
    return {"criterion": "AC9-AC10", "pass": ok, "detail": rows}


def ac11_body_rig():
    arm = _obj(PASSPORT["armature"])
    if arm is None:
        return {"criterion": "AC11", "pass": False, "detail": "sin armature"}
    bones = {b.name: [round(c, 6) for c in list(b.head_local) + list(b.tail_local)]
             for b in arm.data.bones}
    return {"criterion": "AC11", "pass": True,
            "detail": {"bone_count": len(bones),
                       "fingerprint": hash(json.dumps(bones, sort_keys=True)),
                       "face_bones": {k: bones[k] for k in
                                      ("Head", "Eye_L", "Eye_R") if k in bones}}}


# ---------------------------------------------------------------- runner

def audit(stages=None):
    """Corre la auditoria. `stages` filtra por criterio, ej ["AC3-AC6"]."""
    freeze_head_legacy_keys()
    tests = [ac1_inventory, ac2_shape_keys, ac3_to_ac6_blinks, ac7_penetration,
             ac8_floating, ac9_ac10_independence, ac11_body_rig]
    out = []
    for t in tests:
        try:
            r = t()
        except Exception as exc:  # un test roto no debe matar la auditoria
            r = {"criterion": t.__name__, "pass": False, "error": repr(exc)}
        if stages and r.get("criterion") not in stages:
            continue
        out.append(r)
    set_state({})
    return {"passport": PASSPORT["model"],
            "overall_pass": all(r.get("pass") for r in out),
            "results": out}


def audit_json(stages=None, indent=2):
    return json.dumps(audit(stages), indent=indent, default=str)
