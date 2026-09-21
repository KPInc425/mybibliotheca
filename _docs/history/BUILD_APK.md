# Building BookOracle APK for Side-Loading

This guide will help you build a debug APK of BookOracle that can be side-loaded on Android devices for testing before publishing to the Play Store.

## Prerequisites

Before building the APK, ensure you have the following installed:

### 1. Node.js and npm
- Download and install from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` and `npm --version`

### 2. Android SDK
- Download Android Studio from [developer.android.com](https://developer.android.com/studio)
- Install Android SDK through Android Studio
- Set environment variables:
  - `ANDROID_HOME` or `ANDROID_SDK_ROOT` pointing to your Android SDK location
  - Add `$ANDROID_HOME/tools` and `$ANDROID_HOME/platform-tools` to your PATH

### 3. Java Development Kit (JDK)
- Install JDK 17 or later
- Set `JAVA_HOME` environment variable
- Add Java to your PATH

### 4. Python and Pillow
- Install Python 3.7 or later
- Install Pillow: `pip install Pillow`

## Quick Build (Windows)

If you're on Windows, you can use the provided batch file:

```bash
build_apk.bat
```

This will run the complete build process automatically.

## Manual Build Process

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Generate App Icons

```bash
python generate_app_icons.py
```

This script will:
- Read the `app/static/bo-app-logo.png` file
- Generate all required Android icon sizes
- Create adaptive icons for modern Android devices
- Place icons in the correct Android resource directories

### Step 3: Sync with Capacitor

```bash
npx cap sync android
```

This copies your web app files to the Android project.

### Step 4: Build the APK

```bash
cd android
./gradlew assembleDebug
```

The APK will be created at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Automated Build Script

For convenience, use the automated build script:

```bash
python build_apk.py
```

This script will:
1. Check all prerequisites
2. Install dependencies
3. Generate app icons
4. Sync with Capacitor
5. Build the APK
6. Copy the APK to the project root as `BookOracle-debug.apk`

## Installing the APK

### On Android Device

1. **Enable Unknown Sources**:
   - Go to Settings → Security → Unknown Sources
   - Enable "Install from unknown sources"

2. **Transfer the APK**:
   - Copy `BookOracle-debug.apk` to your Android device
   - Use USB, email, cloud storage, or any file transfer method

3. **Install the APK**:
   - Open the APK file on your device
   - Follow the installation prompts
   - Grant necessary permissions when prompted

### Using ADB (for developers)

```bash
adb install BookOracle-debug.apk
```

## App Configuration

The app is configured with:

- **App Name**: BookOracle
- **Package ID**: `com.ilgaming.bookoracle`
- **Version**: 1.0.0
- **Icon**: Generated from `bo-app-logo.png`
- **Permissions**: Internet, Camera, Vibrate, Wake Lock

## Troubleshooting

### Common Issues

1. **"ANDROID_HOME not set"**
   - Set the `ANDROID_HOME` environment variable
   - Restart your terminal/command prompt

2. **"Java not found"**
   - Install JDK 17 or later
   - Set `JAVA_HOME` environment variable

3. **"Pillow not found"**
   - Install Pillow: `pip install Pillow`

4. **Build fails with Gradle errors**
   - Clean the project: `cd android && ./gradlew clean`
   - Try building again

5. **APK won't install**
   - Ensure "Unknown Sources" is enabled
   - Check that the APK is not corrupted
   - Verify the device architecture matches the APK

### Build Logs

If the build fails, check the logs in:
- `android/app/build/outputs/logs/`
- Terminal output for specific error messages

## Next Steps

After successfully building and testing the APK:

1. **Test thoroughly** on different devices and Android versions
2. **Fix any issues** found during testing
3. **Prepare for Play Store release**:
   - Create a release keystore
   - Update version numbers
   - Configure release signing
   - Build a release APK

## File Structure

```
mybibliotheca/
├── app/static/bo-app-logo.png          # Source logo
├── android/app/src/main/res/           # Generated icons
│   ├── mipmap-*/                      # Different density icons
│   └── values/                        # App strings and colors
├── generate_app_icons.py              # Icon generation script
├── build_apk.py                       # Build automation script
├── build_apk.bat                      # Windows build script
└── BookOracle-debug.apk               # Output APK
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the build logs for specific errors
3. Ensure all prerequisites are properly installed
4. Verify environment variables are set correctly 