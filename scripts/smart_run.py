#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
smart_run.py - Interceptor de terminal para Heavy Task Optimization.

Uso:
    python scripts/smart_run.py "npm run build"
    python scripts/smart_run.py npm run build

Guarda TODO el output crudo en .cache/logs/last_run.log y devuelve al agente
solo lo minimo necesario para razonar, ahorrando tokens.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(ROOT, ".cache", "logs")
LOG_PATH = os.path.join(LOG_DIR, "last_run.log")
LOG_REL = ".cache/logs/last_run.log"

QUERY_TRUNCATE = 2500
ERROR_TAIL_LINES = 30

# Comandos de "consulta": salida = informacion que el agente necesita leer.
QUERY_CMDS = {
    "git", "grep", "rg", "cat", "ls", "dir", "find", "head", "tail", "type",
    "wc", "diff", "which", "where", "echo", "pwd", "tree", "stat", "sed",
    "awk", "jq", "gh", "curl",
}

ANSI_RE = re.compile(r"\x1B(?:[@-Z\-_]|\[[0-?]*[ -/]*[@-~])")

NOISE_SUBSTRINGS = (
    "node_modules",
    "site-packages",
    "/.pnpm/",
    "/.pnpm\\",
    "/.venv/",
    "/.venv\\",
    "internal/modules/cjs",
    "at process.processTicksAndRejections",
    "webpack-internal:",
    "(node:internal/",
    "npm WARN deprecated",
    "npm notice",
)


def strip_ansi(text):
    return ANSI_RE.sub("", text)


def is_query_command(argv):
    """Primer token ejecutable del comando (ignora asignaciones VAR=x)."""
    for token in argv:
        token = token.strip().strip('"').strip("'")
        if not token or "=" in token.split(" ")[0] and not token.startswith("-"):
            if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", token):
                continue
        base = os.path.basename(token).lower()
        base = base[:-4] if base.endswith(".exe") else base
        return base in QUERY_CMDS
    return False


def build_command(args):
    """Un solo argumento -> string de shell. Varios -> se unen."""
    if len(args) == 1:
        return args[0]
    return " ".join(args)


def run(cmd):
    proc = subprocess.run(
        cmd,
        shell=True,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return proc.returncode, proc.stdout or ""


def write_log(cmd, exit_code, output):
    os.makedirs(LOG_DIR, exist_ok=True)
    with open(LOG_PATH, "w", encoding="utf-8", errors="replace") as fh:
        fh.write("$ %s\n" % cmd)
        fh.write("# exit=%d\n" % exit_code)
        fh.write("-" * 60 + "\n")
        fh.write(output)


def filter_error(output):
    lines = strip_ansi(output).splitlines()
    keep = []
    for line in lines:
        if not line.strip():
            continue
        low = line.lower()
        if any(noise.lower() in low for noise in NOISE_SUBSTRINGS):
            continue
        keep.append(line.rstrip())
    if not keep:
        keep = [l.rstrip() for l in lines if l.strip()]
    return keep[-ERROR_TAIL_LINES:]


def emit(text):
    try:
        sys.stdout.write(text + "\n")
    except UnicodeEncodeError:
        sys.stdout.write(text.encode("ascii", "replace").decode("ascii") + "\n")


def main():
    args = sys.argv[1:]
    if not args:
        emit("Uso: python scripts/smart_run.py \"<comando>\"")
        return 2

    cmd = build_command(args)
    exit_code, output = run(cmd)
    write_log(cmd, exit_code, output)

    if is_query_command(args if len(args) > 1 else cmd.split()):
        clean = strip_ansi(output)
        if len(clean) > QUERY_TRUNCATE:
            emit(clean[:QUERY_TRUNCATE])
            emit("\n... [truncado a %d chars. Log completo en %s]" % (QUERY_TRUNCATE, LOG_REL))
        else:
            emit(clean.rstrip())
        return exit_code

    # Comando de accion
    if exit_code == 0:
        emit("\u2705 Comando exitoso (Exit 0). Salida omitida para ahorrar tokens. Log en %s" % LOG_REL)
        return 0

    emit("\u274c Comando fallido (Exit %d). Ultimas %d lineas relevantes:" % (exit_code, ERROR_TAIL_LINES))
    emit("-" * 60)
    for line in filter_error(output):
        emit(line)
    emit("-" * 60)
    emit("Log completo (sin filtrar) en %s" % LOG_REL)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
