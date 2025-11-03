Write-Host "Fixing Prisma Client permissions..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Checking for running Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found Node.js processes. Please stop your dev server first." -ForegroundColor Yellow
    Write-Host "Press any key to continue anyway, or Ctrl+C to cancel..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Write-Host "Step 2: Waiting for file handles to release..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Step 3: Removing Prisma client cache..." -ForegroundColor Yellow
$prismaClientPath = "node_modules\.prisma"
if (Test-Path $prismaClientPath) {
    Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed Prisma client cache" -ForegroundColor Green
}

Write-Host "Step 4: Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Prisma client generated successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Failed to generate Prisma client. Please:" -ForegroundColor Red
    Write-Host "1. Stop your dev server completely" -ForegroundColor Yellow
    Write-Host "2. Close your IDE/editor" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
