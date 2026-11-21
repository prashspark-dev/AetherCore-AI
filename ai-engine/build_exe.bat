@echo off
echo ============================================================================
echo  Building AetherCore-AI Autonomous Engine into Standalone Windows .exe
echo ============================================================================
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed ^
  --name "aethercore-engine" ^
  --add-data "config/whitelist.json;config" ^
  --add-data "ml_brain;ml_brain" ^
  main_service.py
echo.
echo [DONE] Standalone engine built at: dist\aethercore-engine.exe
pause
