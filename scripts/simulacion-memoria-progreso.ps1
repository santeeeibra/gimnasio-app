<#
  Simulacion: cuanto pesaria una tabla "registro_progreso" (memoria de
  entrenamiento por cliente) contra el limite de 500 MB de Supabase free tier.
  Fila = 1 ejercicio entrenado en 1 sesion (no 1 fila por serie).

  Uso:
    .\simulacion-memoria-progreso.ps1
    .\simulacion-memoria-progreso.ps1 -Gimnasios 100 -ClientesPorGimnasio 150 -SemanasRetencion 52
#>

param(
    [int]$Gimnasios = 50,
    [int]$ClientesPorGimnasio = 100,
    [int]$EjerciciosPorSemanaCliente = 20,   # ~4 sesiones x 5 ejercicios
    [int]$SemanasRetencion = 26,             # 6 meses antes de purgar filas viejas
    [int]$BytesPorFila = 150,                # conservador: fila + overhead + indices
    [double]$LimiteMB = 500                  # limite real Supabase free tier (2026)
)

$clientesTotales = $Gimnasios * $ClientesPorGimnasio
$filasPorSemanaTotal = $clientesTotales * $EjerciciosPorSemanaCliente
$filasEnVentanaRetencion = $filasPorSemanaTotal * $SemanasRetencion

$bytesTotales = $filasEnVentanaRetencion * $BytesPorFila
$mbTotales = [math]::Round($bytesTotales / 1MB, 2)
$porcentajeLimite = [math]::Round(($mbTotales / $LimiteMB) * 100, 2)

$crecimientoSemanalMB = [math]::Round(($filasPorSemanaTotal * $BytesPorFila) / 1MB, 4)
$semanasHastaLimiteSinPurga = if ($crecimientoSemanalMB -gt 0) {
    [math]::Round($LimiteMB / $crecimientoSemanalMB, 1)
} else { [double]::PositiveInfinity }
$aniosHastaLimiteSinPurga = [math]::Round($semanasHastaLimiteSinPurga / 52, 1)

Write-Host "=== Simulacion: tabla registro_progreso ==="
Write-Host "Gimnasios:                     $Gimnasios"
Write-Host "Clientes por gimnasio:         $ClientesPorGimnasio"
Write-Host "Clientes totales:              $clientesTotales"
Write-Host "Ejercicios/semana por cliente: $EjerciciosPorSemanaCliente"
Write-Host "Filas nuevas por semana:       $filasPorSemanaTotal"
Write-Host ""
Write-Host "--- Con retencion de $SemanasRetencion semanas (purgando filas viejas) ---"
Write-Host "Filas en la ventana:            $filasEnVentanaRetencion"
Write-Host "Peso estimado:                  $mbTotales MB"
Write-Host "Porcentaje del limite ($LimiteMB MB free tier): $porcentajeLimite %"
Write-Host ""
Write-Host "--- Sin purgar nunca (peor caso) ---"
Write-Host "Crecimiento por semana:          $crecimientoSemanalMB MB"
Write-Host "Semanas hasta tocar el limite:   $semanasHastaLimiteSinPurga  (~$aniosHastaLimiteSinPurga anios)"
Write-Host ""

if ($porcentajeLimite -ge 90) {
    Write-Host "ALERTA: con estos numeros y sin purga, se acerca al limite. Revisar retencion." -ForegroundColor Red
} elseif ($porcentajeLimite -ge 70) {
    Write-Host "AVISO: uso moderado-alto del limite. Vigilar crecimiento." -ForegroundColor Yellow
} else {
    Write-Host "OK: muy por debajo del limite con estos parametros." -ForegroundColor Green
}
