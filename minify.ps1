# Minify CSS and JS files
param(
    [string]$cssFile = "assets/style/homepage.css",
    [string]$jsFiles = "src/script/main.js,src/script/dropdown.js"
)

function Minify-CSS {
    param([string]$inputPath, [string]$outputPath)
    
    if (-not (Test-Path $inputPath)) {
        Write-Host "❌ CSS file not found: $inputPath"
        return
    }
    
    $content = Get-Content $inputPath -Raw
    
    # Remove comments
    $content = $content -replace '/\*[\s\S]*?\*/', ''
    
    # Remove whitespace around special characters
    $content = $content -replace '\s*([{};:,>+~])\s*', '$1'
    
    # Remove unnecessary whitespace
    $content = $content -replace '\s+', ' '
    
    # Trim
    $content = $content.Trim()
    
    Set-Content -Path $outputPath -Value $content -NoNewline
    
    $originalSize = (Get-Item $inputPath).Length
    $minifiedSize = (Get-Item $outputPath).Length
    $ratio = [math]::Round(($minifiedSize / $originalSize) * 100, 1)
    
    Write-Host "✅ CSS Minified: $inputPath ($originalSize bytes) → $outputPath ($minifiedSize bytes, $ratio%)"
}

# Minify CSS
Minify-CSS -inputPath $cssFile -outputPath "assets/style/homepage.min.css"

Write-Host "`n✅ Minification complete!"
Write-Host "Update your HTML link tag to use: <link rel='stylesheet' href='/assets/style/homepage.min.css'>"
