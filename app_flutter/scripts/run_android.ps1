param(
    [string]$DeviceId = "",
    [string]$ApiBaseUrl = "http://10.0.2.2:8001/api/v1"
)

$ErrorActionPreference = "Stop"
$flutter = "C:\dev\flutter\bin\flutter.bat"

& $flutter pub get

if ([string]::IsNullOrWhiteSpace($DeviceId)) {
    & $flutter devices
    throw "Pasa -DeviceId con el ID del emulador o telefono."
}

& $flutter run -d $DeviceId --dart-define="API_BASE_URL=$ApiBaseUrl"
