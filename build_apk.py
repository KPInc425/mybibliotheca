#!/usr/bin/env python3
"""
Build script for BookOracle Android APK
This script handles the complete build process for creating a side-loadable APK.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description, check=True):
    """Run a shell command and handle errors."""
    print(f"\n🔄 {description}")
    print(f"Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=check, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def find_node_executable():
    """Find Node.js executable on Windows."""
    possible_paths = [
        "node",
        "node.exe",
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        os.path.expanduser(r"~\AppData\Roaming\npm\node.exe"),
    ]
    
    for path in possible_paths:
        try:
            result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return path
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            continue
    
    return None

def find_npm_executable():
    """Find npm executable on Windows."""
    # First try the system npm directly
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return "npm"  # Use the system npm
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        pass
    
    # Fallback to specific paths
    possible_paths = [
        "npm.cmd",
        "npm.exe",
        r"C:\Program Files\nodejs\npm.cmd",
        r"C:\Program Files (x86)\nodejs\npm.cmd",
        os.path.expanduser(r"~\AppData\Roaming\npm\npm.cmd"),
    ]
    
    for path in possible_paths:
        try:
            result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return path
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            continue
    
    return None

def check_requirements():
    """Check if all required tools are installed."""
    print("🔍 Checking build requirements...")
    
    # Check if Node.js and npm are installed
    node_path = find_node_executable()
    npm_path = find_npm_executable()
    
    if node_path and npm_path:
        print(f"✅ Node.js found at: {node_path}")
        print(f"✅ npm found at: {npm_path}")
        
        # Test versions
        try:
            node_version = subprocess.run([node_path, "--version"], capture_output=True, text=True, timeout=10)
            npm_version = subprocess.run([npm_path, "--version"], capture_output=True, text=True, timeout=10)
            print(f"✅ Node.js version: {node_version.stdout.strip()}")
            print(f"✅ npm version: {npm_version.stdout.strip()}")
        except subprocess.TimeoutExpired:
            print("⚠️  Could not verify Node.js/npm versions")
    else:
        print("❌ Node.js and npm are required but not found")
        print("Please install Node.js from https://nodejs.org/")
        print("Make sure to add Node.js to your PATH during installation")
        sys.exit(1)
    
    # Check if Android SDK is available
    android_home = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if not android_home:
        print("❌ ANDROID_HOME or ANDROID_SDK_ROOT environment variable not set")
        print("Please install Android SDK and set the environment variable")
        sys.exit(1)
    else:
        print(f"✅ Android SDK found at: {android_home}")
    
    # Check if Java is available
    try:
        subprocess.run(["java", "-version"], check=True, capture_output=True)
        print("✅ Java is available")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Java is required but not found")
        sys.exit(1)
    
    print("✅ All requirements met")

def install_dependencies():
    """Install npm dependencies."""
    print("\n📦 Installing npm dependencies...")
    npm_path = find_npm_executable()
    if npm_path:
        run_command(f'"{npm_path}" install', "Installing npm packages")
    else:
        run_command("npm install", "Installing npm packages")

def generate_icons():
    """Generate Android app icons from the logo."""
    print("\n🎨 Generating app icons...")
    
    # Check if PIL is available
    try:
        import PIL
        print("✅ PIL/Pillow is available")
    except ImportError:
        print("❌ PIL/Pillow is required for icon generation")
        print("Installing Pillow...")
        run_command("pip install Pillow", "Installing Pillow")
    
    # Run icon generation script
    run_command("python generate_app_icons.py", "Generating Android app icons")

def sync_capacitor():
    """Sync the web app with Capacitor."""
    print("\n🔄 Syncing with Capacitor...")
    node_path = find_node_executable()
    if node_path:
        run_command(f'"{node_path}" npx cap sync android', "Syncing web app with Android project")
    else:
        run_command("npx cap sync android", "Syncing web app with Android project")

def build_apk():
    """Build the Android APK."""
    print("\n🔨 Building Android APK...")
    
    # Change to android directory
    os.chdir("android")
    
    # Clean previous builds
    run_command("./gradlew clean", "Cleaning previous builds", check=False)
    
    # Build debug APK (suitable for side-loading)
    result = run_command("./gradlew assembleDebug", "Building debug APK")
    
    # Check if build was successful
    if result.returncode == 0:
        apk_path = "app/build/outputs/apk/debug/app-debug.apk"
        if os.path.exists(apk_path):
            # Copy APK to project root with a better name
            output_path = "../BookOracle-debug.apk"
            shutil.copy2(apk_path, output_path)
            print(f"\n✅ APK built successfully!")
            print(f"📱 APK location: {os.path.abspath(output_path)}")
            print(f"📏 APK size: {os.path.getsize(output_path) / (1024*1024):.1f} MB")
        else:
            print("❌ APK file not found after build")
            sys.exit(1)
    else:
        print("❌ APK build failed")
        sys.exit(1)
    
    # Return to project root
    os.chdir("..")

def main():
    """Main build process."""
    print("🚀 BookOracle APK Build Script")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists("package.json"):
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Check requirements
    check_requirements()
    
    # Install dependencies
    install_dependencies()
    
    # Generate app icons
    generate_icons()
    
    # Sync with Capacitor
    sync_capacitor()
    
    # Build APK
    build_apk()
    
    print("\n🎉 Build process completed successfully!")
    print("\n📋 Next steps:")
    print("1. Transfer the APK to your Android device")
    print("2. Enable 'Install from unknown sources' in device settings")
    print("3. Install the APK on your device")
    print("4. Test the app functionality")
    print("\n⚠️  Note: This is a debug build for testing purposes.")
    print("   For Play Store release, you'll need to create a release build with proper signing.")

if __name__ == '__main__':
    main() 