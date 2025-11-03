# Seed Database Script
# This script will seed your database with sample data

$seedUrl = "http://localhost:3000/api/seed"

Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $seedUrl -Method POST -UseBasicParsing
    
    if ($response.StatusCode -eq 201) {
        $result = $response.Content | ConvertFrom-Json
        Write-Host "✅ Database seeded successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Seeded data:" -ForegroundColor Yellow
        Write-Host "  Users: $($result.data.users)"
        Write-Host "  Products: $($result.data.products)"
        Write-Host "  Warehouses: $($result.data.warehouses)"
        Write-Host ""
        Write-Host "Default login credentials:" -ForegroundColor Yellow
        Write-Host "  Admin: $($result.defaultCredentials.admin.email) / $($result.defaultCredentials.admin.password)"
        Write-Host "  User: $($result.defaultCredentials.user.email) / $($result.defaultCredentials.user.password)"
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  Database already contains data!" -ForegroundColor Yellow
        Write-Host "   Use DELETE method to clear first, or check status with GET" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error seeding database:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "Make sure your Next.js server is running on http://localhost:3000" -ForegroundColor Yellow
    }
}

