@echo off
setlocal enabledelayedexpansion

echo 🚀 BookOracle APK Build Script for Windows
echo ==========================================

REM Parse command line arguments
set "CHECK_ONLY="
set "SKIP_ICONS="
set "SKIP_DEPS="
set "SKIP_SYNC="

:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="--check-only" set "CHECK_ONLY=1"
if "%~1"=="--skip-icons" set "SKIP_ICONS=1"
if "%~1"=="--skip-deps" set "SKIP_DEPS=1"
if "%~1"=="--skip-sync" set "SKIP_SYNC="
if "%~1"=="--help" goto :show_help
shift
goto :parse_args
:end_parse

REM Show help if requested
if "%1"=="--help" goto :show_help

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

REM Check if Node.js is available (try multiple paths)
set "NODE_FOUND="
set "NPM_FOUND="

REM Try system PATH first
node --version >nul 2>&1
if not errorlevel 1 (
    set "NODE_FOUND=1"
    echo ✅ Node.js found in PATH
)

REM Try npm in PATH
npm --version >nul 2>&1
if not errorlevel 1 (
    set "NPM_FOUND=1"
    echo ✅ npm found in PATH
)

REM If not found in PATH, try common installation locations
if not defined NODE_FOUND (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_FOUND=1"
        set "PATH=C:\Program Files\nodejs;%PATH%"
        echo ✅ Node.js found in Program Files
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_FOUND=1"
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
        echo ✅ Node.js found in Program Files (x86)
    )
)

if not defined NPM_FOUND (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "NPM_FOUND=1"
        echo ✅ npm found in Program Files
    ) else if exist "C:\Program Files (x86)\nodejs\npm.cmd" (
        set "NPM_FOUND=1"
        echo ✅ npm found in Program Files (x86)
    )
)

REM Final check
if not defined NODE_FOUND (
    echo ❌ Node.js is not found
    echo.
    echo Please try one of these solutions:
    echo 1. Install Node.js from https://nodejs.org/
    echo 2. Make sure Node.js is added to your PATH during installation
    echo 3. Restart your command prompt after installing Node.js
    echo 4. Try running the Python script directly: python build_apk.py
    echo.
    pause
    exit /b 1
)

if not defined NPM_FOUND (
    echo ❌ npm is not found
    echo.
    echo Please try one of these solutions:
    echo 1. Reinstall Node.js from https://nodejs.org/
    echo 2. Make sure npm is included in the Node.js installation
    echo 3. Try running the Python script directly: python build_apk.py
    echo.
    pause
    exit /b 1
)

REM Show detected versions
for /f "tokens=*" %%i in ('node --version 2^>nul') do echo ✅ Node.js version: %%i
for /f "tokens=*" %%i in ('npm --version 2^>nul') do echo ✅ npm version: %%i
echo.

REM Build command arguments
set "PYTHON_ARGS="
if defined CHECK_ONLY set "PYTHON_ARGS=!PYTHON_ARGS! --check-only"
if defined SKIP_ICONS set "PYTHON_ARGS=!PYTHON_ARGS! --skip-icons"
if defined SKIP_DEPS set "PYTHON_ARGS=!PYTHON_ARGS! --skip-deps"
if defined SKIP_SYNC set "PYTHON_ARGS=!PYTHON_ARGS! --skip-sync"

REM Run the Python build script
echo Starting build process...
python build_apk.py %PYTHON_ARGS%

REM Check if build was successful
if errorlevel 1 (
    echo.
    echo ❌ Build failed! Please check the error messages above.
    echo.
    echo 💡 Troubleshooting tips:
    echo - Make sure Android SDK is installed and ANDROID_HOME is set
    echo - Make sure Java JDK is installed and JAVA_HOME is set
    echo - Try running: python build_apk.py --check-only
    echo - Try running: python build_apk.py --help
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.
echo 📋 Next steps:
echo 1. Transfer the APK to your Android device
echo 2. Enable 'Install from unknown sources' in device settings
echo 3. Install the APK on your device
echo 4. Test the app functionality
echo.
echo ⚠️  Note: This is a debug build for testing purposes.
echo    For Play Store release, you'll need to create a release build with proper signing.
echo.
pause
exit /b 0

:show_help
echo.
echo BookOracle APK Build Script - Usage
echo ===================================
echo.
echo build_apk.bat [options]
echo.
echo Options:
echo   --check-only    Only check requirements without building
echo   --skip-icons    Skip icon generation step
echo   --skip-deps     Skip dependency installation
echo   --skip-sync     Skip Capacitor sync step
echo   --help          Show this help message
echo.
echo Examples:
echo   build_apk.bat                    # Full build
echo   build_apk.bat --check-only       # Check requirements only
echo   build_apk.bat --skip-icons       # Build without regenerating icons
echo.
pause
exit /b 0 