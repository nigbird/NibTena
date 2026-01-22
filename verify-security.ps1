$url = "http://localhost:3000/api/appointments/status?transactionId=null"

Write-Host "Testing Unauthenticated Access to: $url"
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ FAILED: Server returned $($response.StatusCode). Expected 401 Unauthorized." -ForegroundColor Red
    Write-Host "Response Content: $($response.Content)"
    Write-Host "ACTION REQUIRED: Please restart your Next.js server to apply the security fixes." -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::Unauthorized) {
        Write-Host "✅ PASSED: Server returned 401 Unauthorized as expected." -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Server returned $($_.Exception.Response.StatusCode). Expected 401." -ForegroundColor Red
    }
}
