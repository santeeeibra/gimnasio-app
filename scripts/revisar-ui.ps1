<#
  revisar-ui.ps1 - chequeo rapido de patrones de UI prohibidos.

  No es CI: corrolo a mano antes de dar por terminada una pantalla o antes de
  pedir revision. Complementa el checklist manual de REGLAS_UI_EMIL.md (S21),
  no lo reemplaza (contraste, alineacion y "se probo en oscuro" son a ojo).

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\revisar-ui.ps1
    powershell -ExecutionPolicy Bypass -File scripts\revisar-ui.ps1 -Fix:$false

  Salida: lista de hallazgos archivo:linea. Exit 1 si hay alguno.
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root "src"

# Archivos donde SI se permiten hex crudos y var(--volt) (definen el tema).
$permitidos = @(
  "src\lib\tema.ts",
  "src\lib\contraste.ts",
  "src\app\globals.css"
) | ForEach-Object { Join-Path $root $_ }

$permitidosPrefijo = @(
  (Join-Path $root "src\lib\logo")   # extraccion de color del logo
)

function EsPermitido($path) {
  if ($permitidos -contains $path) { return $true }
  foreach ($p in $permitidosPrefijo) { if ($path.StartsWith($p)) { return $true } }
  return $false
}

$archivos = Get-ChildItem -Path $src -Recurse -Include *.tsx, *.ts, *.css -File
$hallazgos = @()

function Agregar($regla, $file, $line, $text) {
  $rel = $file.FullName.Substring($root.Length + 1)
  $script:hallazgos += [pscustomobject]@{
    Regla = $regla
    Ref   = "{0}:{1}" -f $rel, $line
    Linea = $text.Trim()
  }
}

foreach ($f in $archivos) {
  $path = $f.FullName
  $permit = EsPermitido $path
  $n = 0
  foreach ($linea in Get-Content -LiteralPath $path) {
    $n++

    # 1) Hex de color en el codigo (fuera de tema.ts / globals.css / logo).
    #    Excepciones legitimas: comentario de referencia, placeholder de input,
    #    themeColor del manifest PWA (metadata estatica, no admite var()).
    if (-not $permit -and $linea -match '#[0-9a-fA-F]{6}\b' -and
        $linea -notmatch '//.*#[0-9a-fA-F]{6}' -and
        $linea -notmatch 'placeholder=' -and
        $linea -notmatch 'themeColor') {
      Agregar "hex-literal" $f $n $linea
    }

    # 2) var(--volt) fuera de los archivos de tema. Usar --accent.
    if (-not $permit -and $linea -match 'var\(--volt\b') {
      Agregar "var(--volt)-fuera-de-tema" $f $n $linea
    }

    # 3) Link de texto con className armado a mano (debe ir por linkClasses).
    if ($linea -match 'underline-offset-2' -or
        ($linea -match 'text-ink-soft' -and $linea -match '\bunderline\b' -and $linea -notmatch 'linkClasses')) {
      if ($f.Name -ne "ui.tsx") {
        Agregar "link-sin-linkClasses" $f $n $linea
      }
    }

    # 4) Scrim de modal hardcodeado.
    if ($linea -match 'bg-ink/60' -or $linea -match 'bg-black/[0-9]') {
      Agregar "scrim-hardcodeado (usar var(--scrim))" $f $n $linea
    }

    # 5) bg-white / bg-black / text-gray-* (tokens, no Tailwind por defecto).
    if ($linea -match '\bbg-white\b' -or $linea -match '\bbg-black\b' -or $linea -match '\btext-gray-[0-9]') {
      Agregar "color-tailwind-por-defecto" $f $n $linea
    }
  }
}

if ($hallazgos.Count -eq 0) {
  Write-Host "revisar-ui: sin hallazgos." -ForegroundColor Green
  exit 0
}

$hallazgos | Group-Object Regla | ForEach-Object {
  Write-Host ""
  Write-Host ("== {0} ({1}) ==" -f $_.Name, $_.Count) -ForegroundColor Yellow
  $_.Group | ForEach-Object {
    Write-Host ("  {0}" -f $_.Ref) -ForegroundColor Cyan
    Write-Host ("    {0}" -f $_.Linea) -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host ("revisar-ui: {0} hallazgo(s). Revisar antes de commitear." -f $hallazgos.Count) -ForegroundColor Red
exit 1
