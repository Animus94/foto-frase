$ErrorActionPreference = "Stop"
$env:BASE_PATH = "/foto-frase"

Write-Host "==> Compilando apps..." -ForegroundColor Cyan
npm run build:public
npm run build:backoffice

Write-Host "==> Empaquetando sitio en carpeta site/..." -ForegroundColor Cyan
if (Test-Path site) { Remove-Item -Recurse -Force site }
New-Item -ItemType Directory -Path site\backoffice -Force | Out-Null
Copy-Item -Recurse apps\public\dist\* site\
Copy-Item -Recurse apps\backoffice\dist\* site\backoffice\
New-Item -ItemType File -Path site\.nojekyll -Force | Out-Null
Copy-Item docs\deploy\404.html site\404.html

Write-Host "==> Publicando en la rama gh-pages..." -ForegroundColor Cyan
Push-Location site
try {
    git init | Out-Null
    git checkout -b gh-pages | Out-Null
    git add -A | Out-Null
    git commit -m "Deploy to GitHub Pages" | Out-Null
    git remote add origin https://github.com/Animus94/foto-frase.git | Out-Null
    git push -f origin gh-pages
} finally {
    Pop-Location
}

if (Test-Path site\.git) {
    Remove-Item -Recurse -Force site\.git
}

Write-Host "==> ¡Despliegue completado con éxito a la rama gh-pages!" -ForegroundColor Green
