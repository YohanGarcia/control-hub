param(
    [string]$ApiBaseUrl = "http://127.0.0.1:8001/api/v1"
)

$ErrorActionPreference = "Stop"
$flutter = "C:\dev\flutter\bin\flutter.bat"

& $flutter pub get
& $flutter config --enable-windows-desktop
& $flutter run -d windows --dart-define="API_BASE_URL=$ApiBaseUrl"
