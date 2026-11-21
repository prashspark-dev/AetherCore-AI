@echo off
title AetherCore-AI Master Windows Installer Builder (Lean Production Mode)
echo ============================================================================
echo   AetherCore-AI v1.0.0 - Lean Commercial Windows Installer Builder
echo ============================================================================
echo.
echo [STEP 1/3] Compiling Python Autonomous AI Engine (Lean ~35MB .exe)...
cd /d "%~dp0ai-engine"
pyinstaller --noconfirm --onefile --noconsole --clean ^
  --exclude-module torch ^
  --exclude-module torchvision ^
  --exclude-module torchaudio ^
  --exclude-module tensorflow ^
  --exclude-module keras ^
  --exclude-module scipy ^
  --exclude-module matplotlib ^
  --exclude-module pandas ^
  --exclude-module cv2 ^
  --exclude-module pygame ^
  --exclude-module PIL ^
  --exclude-module IPython ^
  --exclude-module jupyter ^
  --exclude-module sqlalchemy ^
  --exclude-module h5py ^
  --exclude-module onnxruntime ^
  --name "aethercore-engine" main_service.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python AI Engine compilation failed!
    pause
    exit /b 1
)
echo.
echo [STEP 2/3] Building Optimized React Desktop UI...
cd /d "%~dp0desktop-app"
call npm install --no-audit --no-fund
call npm run build:ui
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] React UI build failed!
    pause
    exit /b 1
)
echo.
echo [STEP 3/3] Packaging Final Windows Installer (AetherCore-AI-Setup-1.0.0.exe)...
call npx electron-builder --win nsis
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Electron Installer packaging failed!
    pause
    exit /b 1
)
echo.
echo ============================================================================
echo   BUILD COMPLETE! Your Windows Installer is ready in File Explorer:
echo   %~dp0installer-build\AetherCore-AI-Setup-1.0.0.exe
echo ============================================================================
explorer "%~dp0installer-build"
pause