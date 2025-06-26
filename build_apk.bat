@echo off
echo 🚀 BookOracle APK Build Script for Windows
echo ==========================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not found in PATH
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

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not found in PATH
    echo.
    echo Please try one of these solutions:
    echo 1. Reinstall Node.js from https://nodejs.org/
    echo 2. Make sure npm is included in the Node.js installation
    echo 3. Try running the Python script directly: python build_apk.py
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    pause
    exit /b 1
)

REM Show detected versions
echo ✅ Python found
echo ✅ Node.js found
echo ✅ npm found
echo.

REM Run the Python build script
echo Starting build process...
python build_apk.py

REM Check if build was successful
if errorlevel 1 (
    echo.
    echo ❌ Build failed! Please check the error messages above.
    echo.
    echo 💡 Troubleshooting tips:
    echo - Make sure Android SDK is installed and ANDROID_HOME is set
    echo - Make sure Java JDK is installed and JAVA_HOME is set
    echo - Try running: python build_apk.py
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