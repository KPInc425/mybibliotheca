#!/usr/bin/env python3
"""
Build script for BookOracle Android APK
This script handles the complete build process for creating a side-loadable APK.
"""

import os
import sys
import subprocess
import shutil
import argparse
from pathlib import Path

def run_command(command, cwd=None, check=True):
    """Run a command and return the result"""
    print(f"🔄 Running: {command}")
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=check, 
                              capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
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
    """Check if all required tools are installed"""
    print("🔍 Checking build requirements...")
    
    # Check Node.js
    node_path = find_node_executable()
    if node_path:
        try:
            result = subprocess.run([node_path, '--version'], capture_output=True, text=True)
            print(f"✅ Node.js: {result.stdout.strip()}")
        except FileNotFoundError:
            print("❌ Node.js not found. Please install Node.js.")
            sys.exit(1)
    else:
        print("❌ Node.js not found. Please install Node.js.")
        sys.exit(1)
    
    # Check npm
    npm_path = find_npm_executable()
    if npm_path:
        try:
            result = subprocess.run([npm_path, '--version'], capture_output=True, text=True)
            print(f"✅ npm: {result.stdout.strip()}")
        except FileNotFoundError:
            print("❌ npm not found. Please install npm.")
            sys.exit(1)
    else:
        print("❌ npm not found. Please install npm.")
        sys.exit(1)
    
    # Check Capacitor CLI
    try:
        result = subprocess.run(['npx', 'cap', '--version'], capture_output=True, text=True)
        print(f"✅ Capacitor CLI: {result.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Capacitor CLI not found. Installing...")
        run_command("npm install -g @capacitor/cli")
    
    # Check Android SDK
    android_home = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if not android_home:
        print("❌ ANDROID_HOME not set. Please set ANDROID_HOME environment variable.")
        sys.exit(1)
    print(f"✅ Android SDK: {android_home}")

def install_dependencies():
    """Install npm dependencies"""
    print("📦 Installing npm dependencies...")
    run_command("npm install")
    
    # Install Capacitor Preferences plugin for auth persistence
    print("🔌 Installing Capacitor Preferences plugin...")
    run_command("npm install @capacitor/preferences@7.0.1")

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
        run_command("pip install Pillow")
    
    # Check if the icon generation script exists
    if os.path.exists("prepare_capacitor_assets.py"):
        print("🔄 Running icon generation script...")
        run_command("python prepare_capacitor_assets.py")
    else:
        print("⚠️ prepare_capacitor_assets.py not found, skipping icon generation")

def sync_capacitor():
    """Sync Capacitor with web assets"""
    print("🔄 Syncing Capacitor...")
    run_command("npx cap sync android")

def build_android():
    """Build the Android APK"""
    print("🏗️ Building Android APK...")
    
    # Change to android directory
    android_dir = Path("android")
    if not android_dir.exists():
        print("❌ Android directory not found. Run 'npx cap add android' first.")
        sys.exit(1)
    
    # Clean previous build
    print("🧹 Cleaning previous build...")
    run_command("gradlew clean", cwd="android")
    
    # Build debug APK
    print("🔨 Building debug APK...")
    result = run_command("gradlew assembleDebug", cwd="android")
    
    if result.returncode == 0:
        print("✅ APK built successfully!")
        
        # Find the APK file
        apk_path = None
        for root, dirs, files in os.walk("android/app/build/outputs/apk/debug"):
            for file in files:
                if file.endswith(".apk"):
                    apk_path = os.path.join(root, file)
                    break
            if apk_path:
                break
        
        if apk_path:
            print(f"📱 APK location: {apk_path}")
            
            # Copy to project root for easy access with proper name
            apk_name = "BookOracle-debug.apk"
            shutil.copy2(apk_path, apk_name)
            print(f"📋 APK copied to: {apk_name}")
        else:
            print("⚠️ APK file not found in expected location")
    else:
        print("❌ APK build failed")
        sys.exit(1)

def main():
    """Main build process"""
    parser = argparse.ArgumentParser(description='Build BookOracle Android APK')
    parser.add_argument('--check-only', action='store_true', 
                       help='Only check requirements without building')
    parser.add_argument('--skip-icons', action='store_true',
                       help='Skip icon generation step')
    parser.add_argument('--skip-deps', action='store_true',
                       help='Skip dependency installation')
    parser.add_argument('--skip-sync', action='store_true',
                       help='Skip Capacitor sync step')
    
    args = parser.parse_args()
    
    print("🚀 Starting BookOracle APK build process...")
    print("=" * 50)
    
    # Check requirements
    check_requirements()
    print()
    
    if args.check_only:
        print("✅ Requirements check completed successfully!")
        return
    
    # Install dependencies
    if not args.skip_deps:
        install_dependencies()
        print()
    
    # Generate icons
    if not args.skip_icons:
        generate_icons()
        print()
    
    # Sync Capacitor
    if not args.skip_sync:
        sync_capacitor()
        print()
    
    # Build Android APK
    build_android()
    print()
    
    print("🎉 Build process completed successfully!")
    print("📱 You can now install the APK on your Android device")

if __name__ == "__main__":
    main() 