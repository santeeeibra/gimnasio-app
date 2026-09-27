# Arma los reels de IG (1080x1920, 30 fps) a partir de las grabaciones de
# videos/pantallas, las placas de reel-assets (render.cjs reels.html) y la
# locución borrador de videos/voz/borrador.
# Uso (desde la raíz del repo): python marketing/instagram/fuente/build_reels.py
import subprocess, os, tempfile, glob, shutil

ROOT = os.getcwd()
A = "marketing/instagram/fuente/reel-assets"
CLIPS = "videos/pantallas-fix"  # generado por fix_racha.py
VOZ = "videos/voz/final" if os.path.isdir("videos/voz/final") else "videos/voz/borrador"
OUT = "marketing/instagram/reels"
TMP = tempfile.mkdtemp()
ENC = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-crf", "18", "-preset", "medium"]


def buscar_ffmpeg():
    """ffmpeg con libx264: FFMPEG_PATH, el build "full" de winget o el del PATH."""
    winget = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Packages")
    for c in [os.environ.get("FFMPEG_PATH"), *glob.glob(f"{winget}/*FFmpeg*/*/bin/ffmpeg.exe"), shutil.which("ffmpeg")]:
        if c and "libx264" in subprocess.run([c, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout:
            return c
    raise SystemExit("No encontré un ffmpeg con libx264 (definí FFMPEG_PATH).")


FFMPEG = buscar_ffmpeg()



def ff(*args):
    subprocess.run([FFMPEG, "-loglevel", "error", "-y", *args], check=True)


def card(png, dur, name):
    """Placa fija con zoom lento."""
    frames = int(dur * 30)
    out = f"{TMP}/{name}.mp4"
    ff("-loop", "1", "-i", f"{A}/{png}", "-vf",
       f"scale=2160:-1,zoompan=z='1+0.04*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
       "-t", str(dur), *ENC, out)
    return out


def phone(clip, name, caps, trim=None, speed=1.0, hold=0.0):
    """Grabación dentro del marco del teléfono + textos arriba.
    trim: lista de (desde, hasta) en segundos del clip original, se concatenan.
    caps: lista de (png, desde, hasta) en segundos del segmento final.
    hold: segundos que se congela el último cuadro."""
    trim = trim or [(0, None)]
    parts = []
    for i, (a, b) in enumerate(trim):
        end = f":end={b}" if b is not None else ""
        parts.append(f"[1:v]trim=start={a}{end},setpts=PTS-STARTPTS[t{i}]")
    chain = ";".join(parts)
    chain += ";" + "".join(f"[t{i}]" for i in range(len(trim))) + f"concat=n={len(trim)}:v=1:a=0,setpts=PTS/{speed},tpad=stop_mode=clone:stop_duration={hold},scale=660:1428,fps=30[v]"
    chain += ";[2:v]format=gray,scale=660:1428[m];[v][m]alphamerge[vm]"
    chain += ";[0:v][vm]overlay=210:380:shortest=1[b0]"
    inputs = ["-loop", "1", "-i", f"{A}/bg.png", "-i", f"{CLIPS}/{clip}", "-loop", "1", "-i", f"{A}/mask.png"]
    last = "b0"
    for k, (png, t0, t1) in enumerate(caps):
        inputs += ["-loop", "1", "-i", f"{A}/{png}"]
        chain += f";[{last}][{3 + k}:v]overlay=0:0:enable='between(t,{t0},{t1})':shortest=1[b{k + 1}]"
        last = f"b{k + 1}"
    largo = sum((b if b is not None else dur(f"{CLIPS}/{clip}")) - a for a, b in trim) / speed + hold
    out = f"{TMP}/{name}.mp4"
    ff(*inputs, "-filter_complex", chain, "-map", f"[{last}]", "-t", f"{largo:.3f}", *ENC, out)
    return out


def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return float(r.stdout)


def reel(segs, voces, out):
    """segs: lista de mp4; voces: lista de (mp3, inicio_seg)."""
    lista = f"{TMP}/lista.txt"
    with open(lista, "w") as f:
        f.writelines(f"file '{s}'\n" for s in segs)
    video = f"{TMP}/video.mp4"
    ff("-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", video)
    total = dur(video)
    ins, fil = ["-i", video], []
    for i, (mp3, t) in enumerate(voces):
        ins += ["-i", f"{VOZ}/{mp3}"]
        ms = int(t * 1000)
        fil.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
    fil.append("".join(f"[a{i}]" for i in range(len(voces))) +
               f"amix=inputs={len(voces)}:normalize=0,loudnorm=I=-14:TP=-1.5[a]")
    ff(*ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
       "-t", f"{total:.3f}", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out)
    print(out, round(total, 1), "s")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)

    # Reel 2 — cobro de la cuota: vencida → "Ya transferí" → al día → QR
    h = card("r2-hook.png", 3.0, "r2h")
    b = phone("02-pago-cuota.mp4", "r2b",
              [("r2-c1.png", 0, 3), ("r2-c2.png", 3, 8), ("r2-c3.png", 8, 10.4), ("r2-c4.png", 10.4, 14)],
              # 15.0-16.55: la credencial abre vacía hasta que cae el QR; se saltea
              trim=[(0, 8), (12.3, 15.0), (16.55, None)], hold=1.2)
    e = card("end.png", 6.6, "r2e")
    tb = 3.0 + dur(b)
    reel([h, b, e], [("00-hook.mp3", 0.2), ("02-pago-cuota.mp3", 4.5), ("99-cierre.mp3", max(tb + 0.8, 17.7))],
         f"{OUT}/reel-cobro-cuota.mp4")

    # Reel 4 — app del socio: aforo, rutina que cuida el hombro, ranking y retos
    h = card("r4-hook.png", 2.2, "r4h")
    s1 = phone("01-aforo.mp4", "r4a", [("r4-c1.png", 0, 7)])
    s2 = phone("03-rutina-hombro.mp4", "r4b", [("r4-c2.png", 0, 4), ("r4-c3.png", 4, 11)], speed=1.5)
    s3 = phone("08-ranking.mp4", "r4c", [("r4-c4.png", 0, 10)])
    e = card("end.png", 5.6, "r4e")
    t1 = 2.2 + dur(s1); t2 = t1 + dur(s2); t3 = t2 + dur(s3)
    reel([h, s1, s2, s3, e], [("01-aforo.mp3", 1.0), ("03-rutina-hombro.mp3", t1 + 0.2),
                              ("08-ranking.mp3", t2 + 0.2), ("99-cierre.mp3", t3 + 0.3)],
         f"{OUT}/reel-app-socio.mp4")
