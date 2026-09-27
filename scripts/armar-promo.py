"""Arma la promo vertical 1080x1920 a partir de videos/guion-locucion.md.

Uso:  python scripts/armar-promo.py [--solo CLAVE ...] [--sin-borrador]

Por cada bloque del guion (en orden) busca, con la clave del bloque
(ej. "01-aforo", "00-hook", "99-cierre"):
  - videos/voz/<clave>.mp3|wav      locución final (ElevenLabs). Si falta, genera
                                    un borrador con Edge TTS en videos/voz/borrador/.
  - videos/tomas/<clave>.mp4|mov|png|jpg|webp
                                    toma IA con celular en verde: el clip se pega
                                    en la pantalla verde, cuadro por cuadro. Si falta,
                                    usa un fondo oscuro con un celular dibujado.
  - videos/pantallas/<clip>.mp4     grabación real de la app (la del encabezado).
  - videos/musica.mp3               opcional, de fondo al 9 %.
Salida: videos/promo-borrador.mp4
"""

import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
VID = RAIZ / "videos"
GUION = VID / "guion-locucion.md"
W, H, FPS = 1080, 1920, 30
VERDE_MARCA = (16, 231, 160)  # #10e7a0
FONDO = (10, 13, 12)
FUENTE = "C:/Windows/Fonts/segoeuib.ttf"
VOZ_BORRADOR = "es-AR-TomasNeural"


# ── ffmpeg ────────────────────────────────────────────────────────────────
def buscar_ffmpeg():
    candidatos = [os.environ.get("FFMPEG_PATH"), "ffmpeg"]
    winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget.exists():
        for d in winget.glob("*FFmpeg*"):
            candidatos += [str(b / "bin" / "ffmpeg.exe") for b in d.iterdir()]
    for c in filter(None, candidatos):
        try:
            if "libx264" in subprocess.run([c, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout:
                return c
        except OSError:
            pass
    sys.exit("No encontré un ffmpeg con libx264 (definí FFMPEG_PATH).")


FFMPEG = buscar_ffmpeg()
FFPROBE = str(Path(FFMPEG).with_name("ffprobe.exe")) if FFMPEG.endswith(".exe") else "ffprobe"


def duracion(ruta):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
                         capture_output=True, text=True).stdout
    return float(out.strip())


# ── Guion ─────────────────────────────────────────────────────────────────
def slug(t):
    t = t.lower()
    for a, b in zip("áéíóúñ", "aeioun"):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def leer_guion():
    bloques, actual = [], None
    for linea in GUION.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^## (\d+) · (.+?)(?: — `([^`]+)`)?(?: \(.*\))?$", linea)
        if m:
            num, titulo, clip = m.groups()
            titulo = re.sub(r"\s*\(.*\)$", "", titulo)
            clave = Path(clip).stem if clip else f"{num}-{slug(titulo)}"
            actual = {"clave": clave, "clip": clip, "placas": [], "vo": ""}
            bloques.append(actual)
        elif actual and re.match(r"^\*\*Placas?:\*\*", linea):
            cuerpo = linea.split(":**", 1)[1]
            actual["placas"] = [re.findall(r"`([^`]+)`", p) for p in cuerpo.split("→")]
        elif actual and linea.startswith("**VO:**"):
            actual["vo"] = re.search(r"`(.+)`", linea).group(1)
    return bloques


def primero_que_exista(base, exts):
    for e in exts:
        if (p := base.with_suffix(e)).exists():
            return p
    return None


async def voz_borrador(texto, destino):
    import edge_tts
    limpio = re.sub(r"<break[^>]*>", " ", texto)
    limpio = re.sub(r"\s+", " ", limpio).strip()
    await edge_tts.Communicate(limpio, VOZ_BORRADOR, rate="+6%").save(str(destino))


# ── Gráficos ──────────────────────────────────────────────────────────────
def fuente(tam):
    return ImageFont.truetype(FUENTE, tam)


def envolver(draw, texto, f, ancho):
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if draw.textlength(prueba, font=f) <= ancho or not actual:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    return lineas + [actual]


def render_placa(lineas):
    """Primera línea en píldora verde; las siguientes en blanco debajo. RGBA."""
    lienzo = Image.new("RGBA", (W, 600), (0, 0, 0, 0))
    d = ImageDraw.Draw(lienzo)
    y = 0
    for i, texto in enumerate(lineas):
        f = fuente(62 if i == 0 else 44)
        for ln in envolver(d, texto, f, W - 200):
            x0, y0, x1, y1 = d.textbbox((0, 0), ln, font=f)
            tw, th = x1 - x0, y1 - y0
            x = (W - tw) // 2
            if i == 0:
                d.rounded_rectangle((x - 34, y, x + tw + 34, y + th + 40), radius=28, fill=VERDE_MARCA + (255,))
                d.text((x - x0, y + 20 - y0), ln, font=f, fill=(6, 18, 13, 255))
                y += th + 52
            else:
                d.text((x - x0 + 3, y - y0 + 3), ln, font=f, fill=(0, 0, 0, 170))
                d.text((x - x0, y - y0), ln, font=f, fill=(255, 255, 255, 255))
                y += th + 22
    return np.array(lienzo.crop((0, 0, W, max(y, 1))))


def pegar_rgba(frame, rgba, x, y, alfa=1.0):
    h, w = rgba.shape[:2]
    y1, x1 = min(y + h, H), min(x + w, W)
    if y1 <= y or x1 <= x:
        return
    parte = rgba[: y1 - y, : x1 - x]
    a = parte[..., 3:4].astype(np.float32) / 255 * alfa
    bgr = parte[..., 2::-1].astype(np.float32)
    zona = frame[y:y1, x:x1].astype(np.float32)
    frame[y:y1, x:x1] = (zona * (1 - a) + bgr * a).astype(np.uint8)


def fondo_base():
    f = np.full((H, W, 3), FONDO[::-1], np.uint8)
    brillo = np.zeros((H, W), np.float32)
    cv2.circle(brillo, (W // 2, int(H * 0.45)), 520, 1.0, -1)
    brillo = cv2.GaussianBlur(brillo, (0, 0), 260)[..., None]
    color = np.array(VERDE_MARCA[::-1], np.float32)
    return np.clip(f + brillo * color * 0.22, 0, 255).astype(np.uint8)


FONDO_IMG = fondo_base()

# Celular dibujado (modo sin toma IA)
TEL_W = 720
TEL_H = int(TEL_W * 2532 / 1170)
TEL_X = (W - TEL_W) // 2
TEL_Y = H - TEL_H - 110
BISEL = 16


def mascara_redondeada(w, h, r):
    m = np.zeros((h, w), np.uint8)
    cv2.rectangle(m, (r, 0), (w - r, h), 255, -1)
    cv2.rectangle(m, (0, r), (w, h - r), 255, -1)
    for cx, cy in ((r, r), (w - r, r), (r, h - r), (w - r, h - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return m


MASK_PANTALLA = mascara_redondeada(TEL_W, TEL_H, 64).astype(np.float32)[..., None] / 255
MASK_CUERPO = mascara_redondeada(TEL_W + 2 * BISEL, TEL_H + 2 * BISEL, 64 + BISEL)
SOMBRA = cv2.GaussianBlur(np.pad(MASK_CUERPO, 60).astype(np.float32) / 255, (0, 0), 28)[..., None]


def componer_mockup(frame, pantalla, dy):
    """Dibuja el celular con la pantalla (BGR del tamaño TEL_W x TEL_H) desplazado dy px."""
    y0 = TEL_Y + dy
    sy, sx = y0 - BISEL - 60 + 24, TEL_X - BISEL - 60
    sh = SOMBRA[: H - sy] if sy + SOMBRA.shape[0] > H else SOMBRA
    zona = frame[sy: sy + sh.shape[0], sx: sx + sh.shape[1]].astype(np.float32)
    frame[sy: sy + sh.shape[0], sx: sx + sh.shape[1]] = (zona * (1 - sh * 0.7)).astype(np.uint8)
    cy, cx = y0 - BISEL, TEL_X - BISEL
    cuerpo = MASK_CUERPO.astype(np.float32)[..., None] / 255
    ch = min(cuerpo.shape[0], H - cy)
    zona = frame[cy: cy + ch, cx: cx + cuerpo.shape[1]].astype(np.float32)
    frame[cy: cy + ch, cx: cx + cuerpo.shape[1]] = (zona * (1 - cuerpo[:ch]) + np.array([18, 18, 18]) * cuerpo[:ch]).astype(np.uint8)
    ph = min(TEL_H, H - y0)
    zona = frame[y0: y0 + ph, TEL_X: TEL_X + TEL_W].astype(np.float32)
    frame[y0: y0 + ph, TEL_X: TEL_X + TEL_W] = (zona * (1 - MASK_PANTALLA[:ph]) + pantalla[:ph] * MASK_PANTALLA[:ph]).astype(np.uint8)


# ── Pantalla verde ────────────────────────────────────────────────────────
def mascara_verde(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (38, 90, 70), (88, 255, 255))
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))


def ordenar_esquinas(p):
    p = p.reshape(4, 2).astype(np.float32)
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.array([p[s.argmin()], p[d.argmin()], p[s.argmax()], p[d.argmax()]], np.float32)


def esquinas_verde(m):
    cont, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cont:
        return None
    c = max(cont, key=cv2.contourArea)
    if cv2.contourArea(c) < 0.01 * W * H:
        return None
    hull = cv2.convexHull(c)
    aprox = cv2.approxPolyDP(hull, 0.03 * cv2.arcLength(hull, True), True)
    return ordenar_esquinas(aprox if len(aprox) == 4 else cv2.boxPoints(cv2.minAreaRect(c)))


def rellenar_huecos(m):
    """La IA a veces dibuja íconos o texto sobre el verde: se rellena el interior
    de la mancha principal. Los dedos que entran desde el borde quedan afuera."""
    cont, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cont:
        return m
    lleno = np.zeros_like(m)
    cv2.drawContours(lleno, [max(cont, key=cv2.contourArea)], -1, 255, -1)
    return lleno


def componer_verde(frame, pantalla_full, estado):
    m = rellenar_huecos(mascara_verde(frame))
    esq = esquinas_verde(m)
    if esq is not None:
        estado["esq"] = esq if estado.get("esq") is None else estado["esq"] * 0.4 + esq * 0.6
    if estado.get("esq") is None:
        return
    ph, pw = pantalla_full.shape[:2]
    src = np.array([[0, 0], [pw, 0], [pw, ph], [0, ph]], np.float32)
    M = cv2.getPerspectiveTransform(src, estado["esq"])
    warp = cv2.warpPerspective(pantalla_full, M, (W, H), flags=cv2.INTER_AREA)
    alfa = cv2.GaussianBlur(cv2.dilate(m, np.ones((3, 3), np.uint8)), (5, 5), 0).astype(np.float32)[..., None] / 255
    # Quita el reflejo verde de los bordes del celular.
    banda = cv2.dilate(m, np.ones((25, 25), np.uint8)) > 0
    b, g, r = cv2.split(frame)
    g = np.where(banda, np.minimum(g, np.maximum(b, r)), g)
    frame[:] = cv2.merge([b, g, r])
    frame[:] = (frame.astype(np.float32) * (1 - alfa) + warp.astype(np.float32) * alfa).astype(np.uint8)


# ── Fuentes de cuadros ────────────────────────────────────────────────────
class Clip:
    """Lee un video hacia adelante; pide cuadros por tiempo creciente."""

    def __init__(self, ruta, bucle=False):
        self.ruta, self.bucle = ruta, bucle
        self.cap = cv2.VideoCapture(str(ruta))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
        self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.dur = self.n / self.fps
        self.idx, self.ultimo = -1, None

    def en(self, t):
        objetivo = int(t * self.fps)
        if self.bucle:
            objetivo %= max(self.n, 1)
            if objetivo < self.idx:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self.idx = -1
        objetivo = min(objetivo, self.n - 1)
        while self.idx < objetivo:
            ok, f = self.cap.read()
            if not ok:
                break
            self.ultimo, self.idx = f, self.idx + 1
        return self.ultimo


def cubrir(img):
    h, w = img.shape[:2]
    s = max(W / w, H / h)
    img = cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    y, x = (img.shape[0] - H) // 2, (img.shape[1] - W) // 2
    return img[y: y + H, x: x + W]


class Toma:
    def __init__(self, ruta):
        self.video = Clip(ruta, bucle=True) if ruta.suffix.lower() in (".mp4", ".mov") else None
        self.img = None if self.video else cubrir(cv2.imread(str(ruta)))

    def en(self, t, dur):
        if self.video:
            return cubrir(self.video.en(t))
        z = 1 + 0.06 * t / dur  # zoom lento sobre imagen fija
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z)
        return cv2.warpAffine(self.img, M, (W, H), flags=cv2.INTER_LINEAR)


# ── Armado ────────────────────────────────────────────────────────────────
def ease(k):
    return 1 - (1 - k) ** 3


def render_bloque(b, escritor, logo):
    dur = b["dur"]
    toma = Toma(b["toma"]) if b["toma"] else None
    clip = Clip(VID / "pantallas" / b["clip"]) if b["clip"] else None
    # Acelera la grabación hasta x2 si es más larga que la voz.
    vel = min(2.0, max(1.0, clip.dur / dur)) if clip else 1
    placas = [render_placa(p) for p in b["placas"]]
    estado = {}
    n = round(dur * FPS)
    for i in range(n):
        t = i / FPS
        frame = toma.en(t, dur) if toma else FONDO_IMG.copy()
        if clip:
            pantalla = clip.en(t * vel)
            if toma:
                componer_verde(frame, pantalla, estado)
            else:
                chico = cv2.resize(pantalla, (TEL_W, TEL_H), interpolation=cv2.INTER_AREA)
                componer_mockup(frame, chico, round(60 * (1 - ease(min(1, t / 0.4)))))
        elif logo is not None and b["clave"].startswith("99"):
            pegar_rgba(frame, logo, (W - logo.shape[1]) // 2, int(H * 0.30), min(1, t / 0.3))
        if placas:
            k = min(len(placas) - 1, int(t / dur * len(placas)))
            inicio = k * dur / len(placas)
            y = 110 if clip else (int(H * 0.30) + (logo.shape[0] + 60 if b["clave"].startswith("99") and logo is not None else 300))
            pegar_rgba(frame, placas[k], 0, y, min(1, (t - inicio) / 0.15))
        escritor.stdin.write(frame.tobytes())


def main():
    args = sys.argv[1:]
    solo = set(a for a in args if not a.startswith("--"))
    bloques = [b for b in leer_guion() if not solo or b["clave"] in solo]
    (VID / "voz" / "borrador").mkdir(parents=True, exist_ok=True)

    for b in bloques:
        b["voz"] = primero_que_exista(VID / "voz" / b["clave"], (".mp3", ".wav"))
        if not b["voz"]:
            destino = VID / "voz" / "borrador" / f"{b['clave']}.mp3"
            if not destino.exists():
                asyncio.run(voz_borrador(b["vo"], destino))
            b["voz"], b["es_borrador"] = destino, True
        b["toma"] = primero_que_exista(VID / "tomas" / b["clave"], (".mp4", ".mov", ".png", ".jpg", ".webp"))
        b["dur"] = max(2.5, duracion(b["voz"]) + 0.5)

    logo = None
    if (VID.parent / "public" / "logo-sysgym.png").exists():
        img = Image.open(VID.parent / "public" / "logo-sysgym.png").convert("RGBA")
        img.thumbnail((620, 620))
        logo = np.array(img)
        # El texto del logo es oscuro: se aclara para el fondo negro, el ícono verde queda.
        oscuro = logo[..., :3].max(axis=2) < 110
        logo[oscuro, :3] = 240

    solo_video = VID / "_promo-video.mp4"
    escritor = subprocess.Popen(
        [FFMPEG, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(solo_video)],
        stdin=subprocess.PIPE)
    t0 = 0.0
    for b in bloques:
        b["inicio"] = t0
        modo = "toma IA" if b["toma"] else "celular dibujado"
        voz = "borrador" if b.get("es_borrador") else "final"
        print(f"{b['clave']:<22} {b['dur']:5.1f}s  {modo:<17} voz {voz}", flush=True)
        render_bloque(b, escritor, logo)
        t0 += b["dur"]
    escritor.stdin.close()
    escritor.wait()

    # Audio: cada voz en su lugar + música opcional.
    entradas, filtros = [], []
    for i, b in enumerate(bloques):
        entradas += ["-i", str(b["voz"])]
        ms = int((b["inicio"] + 0.15) * 1000)
        filtros.append(f"[{i + 1}:a]adelay={ms}|{ms},aresample=48000[v{i}]")
    mezcla = "".join(f"[v{i}]" for i in range(len(bloques)))
    musica = VID / "musica.mp3"
    if musica.exists():
        entradas += ["-stream_loop", "-1", "-i", str(musica)]
        j = len(bloques) + 1
        filtros.append(f"[{j}:a]volume=0.09,atrim=0:{t0:.2f},afade=t=out:st={max(0, t0 - 1.5):.2f}:d=1.5[m]")
        mezcla += "[m]"
        n_audio = len(bloques) + 1
    else:
        n_audio = len(bloques)
    filtros.append(f"{mezcla}amix=inputs={n_audio}:normalize=0:duration=longest[a]")
    salida = VID / ("promo-borrador.mp4" if not solo else f"promo-{'-'.join(sorted(solo))}.mp4")
    subprocess.run([FFMPEG, "-y", "-v", "error", "-i", str(solo_video), *entradas,
                    "-filter_complex", ";".join(filtros), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{t0:.2f}", str(salida)], check=True)
    solo_video.unlink()
    print(f"\nListo: {salida.relative_to(VID.parent)}  ({t0:.1f}s)")


if __name__ == "__main__":
    main()
