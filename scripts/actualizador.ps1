# actualizador.ps1
# Proceso updater INDEPENDIENTE del POS (sección 47 del prompt):
# "No reemplazar el ejecutable directamente mientras está ejecutándose."
#
# Lo lanza `updater::lanzar_actualizador_y_salir` (src-tauri/src/updater/mod.rs)
# justo antes de que el POS termine su propio proceso. Este script:
# 1. Espera a que el proceso del POS efectivamente haya cerrado.
# 2. Corre el instalador de forma silenciosa.
# 3. Si el instalador falla, NO borra la versión anterior (queda tal cual
#    estaba, sección 47: "Guardar versión anterior para permitir
#    recuperación si la actualización falla").
# 4. Vuelve a abrir el POS.

param(
    [Parameter(Mandatory = $true)][string]$Instalador,
    [Parameter(Mandatory = $true)][string]$AppPath
)

$ErrorActionPreference = "Stop"
$nombreProceso = [System.IO.Path]::GetFileNameWithoutExtension($AppPath)

Write-Host "Esperando a que $nombreProceso cierre..."
$intentos = 0
while ((Get-Process -Name $nombreProceso -ErrorAction SilentlyContinue) -and $intentos -lt 30) {
    Start-Sleep -Seconds 1
    $intentos++
}

if (Get-Process -Name $nombreProceso -ErrorAction SilentlyContinue) {
    Write-Error "El POS no cerró a tiempo. Abortando actualización para no dejar el sistema en un estado inconsistente."
    exit 1
}

Write-Host "Instalando actualización de forma silenciosa..."
$proceso = Start-Process -FilePath $Instalador -ArgumentList "/S" -Wait -PassThru

if ($proceso.ExitCode -ne 0) {
    Write-Error "La instalación falló (código $($proceso.ExitCode)). Se conserva la versión anterior. Reabriendo el POS."
    Start-Process -FilePath $AppPath
    exit $proceso.ExitCode
}

Write-Host "Actualización instalada correctamente. Reabriendo el POS."
Start-Process -FilePath $AppPath
