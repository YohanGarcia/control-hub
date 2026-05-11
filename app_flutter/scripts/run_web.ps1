param(
    [string]$ApiBaseUrl = "http://127.0.0.1:8001/api/v1",
    [string]$Browser = "edge"
)

$ErrorActionPreference = "Stop"
$flutter = "C:\dev\flutter\bin\flutter.bat"

& $flutter pub get
& $flutter run -d $Browser --dart-define="API_BASE_URL=$ApiBaseUrl"
