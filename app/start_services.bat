@echo off
echo Starting PetAI Services...
echo ================================

echo.
echo 1. Installing Node.js dependencies...
call npm install

echo.
echo 2. Starting AI Model Orchestrator Service...
start "AI Service" cmd /k "cd ai_service && python start_ai_service.py"

echo.
echo 3. Waiting for AI service to initialize...
timeout /t 10 /nobreak > nul

echo.
echo 4. Starting Node.js backend...
start "Node.js Backend" cmd /k "npm start"

echo.
echo ================================
echo Services started!
echo.
echo AI Service: http://localhost:5002
echo Node.js Backend: http://localhost:3000
echo AI Analysis Page: http://localhost:3000/ai-analysis
echo.
echo Press any key to exit...
pause > nul
