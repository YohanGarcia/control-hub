param(
    [ValidateSet("web", "windows", "apk", "appbundle")]
    [string]$Target = "web",
    [string]$ApiBaseUrl = "https://tu-dominio/api/v1"
)

$ErrorActionPreference = "Stop"
$flutter = "C:\dev\flutter\bin\flutter.bat"

& $flutter pub get

switch ($Target) {
    "web" {
        & $flutter build web --release --dart-define="API_BASE_URL=$ApiBaseUrl"
    }
    "windows" {
        & $flutter config --enable-windows-desktop
        & $flutter build windows --release --dart-define="API_BASE_URL=$ApiBaseUrl"
    }
    "apk" {
        & $flutter build apk --release --dart-define="API_BASE_URL=$ApiBaseUrl"
    }
    "appbundle" {
        & $flutter build appbundle --release --dart-define="API_BASE_URL=$ApiBaseUrl"
    }
}
