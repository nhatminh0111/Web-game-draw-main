# Deploy DrawGuess lên GitHub để Render tự động build lại.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "DrawGuess - Deploy" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git chưa được cài đặt. Tải Git tại https://git-scm.com/download/win"
}

if (-not (Test-Path '.git')) {
    git init
    git branch -M main
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    $remote = Read-Host 'Nhập URL GitHub repository (ví dụ: https://github.com/user/repo.git)'
    if ([string]::IsNullOrWhiteSpace($remote)) {
        throw 'Chưa nhập URL repository.'
    }
    git remote add origin $remote
} else {
    Write-Host "Remote: $remote" -ForegroundColor DarkGray
}

git add .

$message = Read-Host 'Commit message (Enter để dùng "Update DrawGuess")'
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = 'Update DrawGuess'
}

git commit -m $message
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Không có thay đổi mới để commit.' -ForegroundColor Yellow
}

git push -u origin main

Write-Host ''
Write-Host 'Push thành công. Render sẽ tự động deploy nếu repository đã được kết nối.' -ForegroundColor Green
Write-Host 'Sau khi service Live, kiểm tra /health và /api.' -ForegroundColor Cyan
