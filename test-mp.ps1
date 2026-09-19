$token = Read-Host "Pega tu Access Token de MP"
$userId = "1167234668"
$posId = "CAJA01"

Write-Host ""
Write-Host "=== TEST 1: Validar credenciales ===" -ForegroundColor Cyan
try {
  $me = Invoke-RestMethod -Uri "https://api.mercadopago.com/users/me" -Headers @{ Authorization = "Bearer $token" } -Method GET
  Write-Host "OK - Credenciales validas" -ForegroundColor Green
  Write-Host "   ID real: $($me.id)"
  Write-Host "   Nickname: $($me.nickname)"
  if ($me.id -ne $userId) {
    Write-Host "OJO: El token pertenece al user_id $($me.id), NO a $userId" -ForegroundColor Yellow
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== TEST 2: Listar sucursales ===" -ForegroundColor Cyan
try {
  $stores = Invoke-RestMethod -Uri "https://api.mercadopago.com/users/$userId/stores/search" -Headers @{ Authorization = "Bearer $token" } -Method GET
  Write-Host "Sucursales: $($stores.results.Count)" -ForegroundColor Green
  if ($stores.results.Count -eq 0) {
    Write-Host "NO HAY SUCURSALES CREADAS EN MP" -ForegroundColor Red
  } else {
    foreach ($s in $stores.results) {
      Write-Host "   Sucursal: $($s.name) (id: $($s.id))"
      $posList = Invoke-RestMethod -Uri "https://api.mercadopago.com/pos?store_id=$($s.id)" -Headers @{ Authorization = "Bearer $token" } -Method GET
      if ($posList.results.Count -eq 0) {
        Write-Host "     SIN CAJAS en esta sucursal" -ForegroundColor Red
      } else {
        foreach ($p in $posList.results) {
          Write-Host "     Caja: $($p.name) (external_id: $($p.external_id))" -ForegroundColor Green
        }
      }
    }
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== TEST 3: Crear QR de prueba ===" -ForegroundColor Cyan
$body = @{
  external_reference = "test-" + (Get-Date -Format "yyyyMMddHHmmss")
  title = "Prueba"
  description = "Prueba"
  total_amount = 10
  items = @(@{
    sku_number = "TEST"
    category = "marketplace"
    title = "Prueba"
    description = "Prueba"
    unit_price = 10
    quantity = 1
    unit_measure = "unit"
    total_amount = 10
  })
} | ConvertTo-Json -Depth 5

$url = "https://api.mercadopago.com/instore/orders/qr/seller/collectors/$userId/pos/$posId/qrs"

try {
  $r = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $token" } -Method POST -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
  Write-Host "OK - QR generado" -ForegroundColor Green
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "ERROR al crear QR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "Detalle:" -ForegroundColor Yellow
  Write-Host $_.ErrorDetails.Message
}
