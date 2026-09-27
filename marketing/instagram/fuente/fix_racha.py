# Corrige el ícono de "Racha activa" en las grabaciones: al grabar, next/image
# no llegó a cargar /mascota/racha-activa.png (se ve el alt text o un cuadro
# vacío). Se ubica la tarjeta cuadro a cuadro buscando el rótulo "RACHA ACTIVA"
# (sigue el scroll) y se pega encima la imagen real.
# Uso (desde la raíz del repo): python marketing/instagram/fuente/fix_racha.py
import cv2, numpy as np, subprocess, os, shutil, sys

sys.path.insert(0, os.path.dirname(__file__))
from build_reels import FFMPEG  # noqa: E402  (busca el ffmpeg con libx264)

SRC, DST = "videos/pantallas", "videos/pantallas-fix"
REF = "marketing/instagram/fuente/img/socio-aldia.png"   # cuadro de 01-aforo, scroll 0
BOX = (124, 1972, 192, 190)                              # x, y, w, h de la cajita del ícono en REF
LABEL = (355, 1940, 265, 60)                             # rótulo "RACHA ACTIVA" usado como plantilla
UMBRAL = 0.8

ref = cv2.imread(REF)
lx, ly, lw, lh = LABEL
tpl = cv2.cvtColor(ref[ly:ly + lh, lx:lx + lw], cv2.COLOR_BGR2GRAY)
dx, dy = BOX[0] - lx, BOX[1] - ly

# Parche: fondo de la cajita + imagen de 168 px con esquinas redondeadas (igual que en la app).
bx, by, bw, bh = BOX
parche = ref[by:by + bh, bx:bx + bw].copy()
fondo = tuple(int(c) for c in ref[by + 95, bx + 6])
mask_in = np.zeros((bh, bw), np.uint8)
cv2.rectangle(mask_in, (5, 5), (bw - 6, bh - 6), 255, -1)
parche[mask_in > 0] = fondo
img = cv2.imread("public/mascota/racha-activa.png", cv2.IMREAD_UNCHANGED)
img = cv2.resize(img, (168, 168), interpolation=cv2.INTER_AREA)
alpha = img[:, :, 3] / 255.0 if img.shape[2] == 4 else np.ones((168, 168))
redondo = np.zeros((168, 168), np.uint8)
cv2.rectangle(redondo, (30, 0), (137, 167), 255, -1)
cv2.rectangle(redondo, (0, 30), (167, 137), 255, -1)
for cx, cy in [(30, 30), (137, 30), (30, 137), (137, 137)]:
    cv2.circle(redondo, (cx, cy), 30, 255, -1)
alpha = alpha * (redondo / 255.0)
ox, oy = (bw - 168) // 2, (bh - 168) // 2
zona = parche[oy:oy + 168, ox:ox + 168].astype(float)
parche[oy:oy + 168, ox:ox + 168] = (zona * (1 - alpha[..., None]) + img[:, :, :3] * alpha[..., None]).astype(np.uint8)
# Solo se reemplaza el interior de la cajita (el borde original queda).
mask_p = mask_in


def corregir(nombre):
    cap = cv2.VideoCapture(f"{SRC}/{nombre}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = subprocess.Popen([FFMPEG, "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                            "-s", f"{w}x{h}", "-r", str(fps), "-i", "-", "-c:v", "libx264", "-pix_fmt",
                            "yuv420p", "-crf", "14", "-preset", "medium", f"{DST}/{nombre}"], stdin=subprocess.PIPE)
    n = hits = 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        n += 1
        res = cv2.matchTemplate(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), tpl, cv2.TM_CCOEFF_NORMED)
        _, score, _, (mx, my) = cv2.minMaxLoc(res)
        if score >= UMBRAL:
            x, y = mx + dx, my + dy
            # recorte si la cajita queda parcialmente fuera de pantalla
            y0, y1 = max(y, 0), min(y + bh, h)
            if y1 > y0:
                sub = f[y0:y1, x:x + bw]
                p = parche[y0 - y:y1 - y]
                m = mask_p[y0 - y:y1 - y] > 0
                sub[m] = p[m]
                hits += 1
        out.stdin.write(f.tobytes())
    out.stdin.close()
    out.wait()
    print(nombre, f"{hits}/{n} cuadros corregidos")


os.makedirs(DST, exist_ok=True)
for nombre in sorted(os.listdir(SRC)):
    if not nombre.endswith(".mp4"):
        continue
    if nombre[:2] in ("01", "02", "08"):
        corregir(nombre)
    else:
        shutil.copy(f"{SRC}/{nombre}", f"{DST}/{nombre}")
