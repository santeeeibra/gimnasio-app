$doc = "contex-sysgym.md"
$mapa = "MAPA_PROYECTO.md"
if ((Get-Item $doc).LastWriteTime -gt (Get-Item $mapa).LastWriteTime) {
    Write-Host "contex-sysgym.md cambio despues de MAPA_PROYECTO.md -> pedile a Cline que lo regenere." -ForegroundColor Yellow
} else {
    Write-Host "MAPA_PROYECTO.md esta al dia." -ForegroundColor Green
}
