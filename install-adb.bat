@echo off
echo ================================
echo Installing ADB for USB debugging
echo ================================
echo.

echo Checking if ADB is already installed...
adb version >nul 2>&1
if %errorlevel% == 0 (
    echo ADB is already installed!
    adb version
    goto :check_device
)

echo ADB not found. Installing via Chocolatey...
echo.

echo Checking if Chocolatey is installed...
choco -v >nul 2>&1
if %errorlevel% == 0 (
    echo Chocolatey found, installing ADB...
    choco install adb -y
    goto :check_adb
)

echo Chocolatey not found. You need to install ADB manually.
echo.
echo Option 1: Install Android Studio (includes ADB)
echo https://developer.android.com/studio
echo.
echo Option 2: Download ADB platform tools
echo https://developer.android.com/studio/releases/platform-tools
echo.
echo After downloading, extract to C:\adb\ and add to PATH
echo.
pause
goto :end

:check_adb
echo Checking ADB installation...
adb version
if %errorlevel% == 0 (
    echo ADB installed successfully!
) else (
    echo ADB installation failed.
    goto :end
)

:check_device
echo.
echo ================================
echo Checking for connected devices
echo ================================
echo Make sure your Android device is:
echo 1. Connected via USB
echo 2. USB Debugging enabled
echo 3. Screen unlocked
echo 4. USB mode set to "File Transfer"
echo.
pause

echo Listing connected devices...
adb devices
echo.

echo If you see "unauthorized", check your phone for permission dialog
echo If you see "device", your phone is ready for debugging!
echo.

echo Killing and restarting ADB server...
adb kill-server
adb start-server
echo.

echo Final device check...
adb devices
echo.

echo ================================
echo Next steps:
echo 1. Open Chrome
echo 2. Go to chrome://inspect/#devices  
echo 3. Make sure "Discover USB devices" is checked
echo 4. Your device should appear in the list
echo ================================
echo.
pause

:end
echo.
echo If you have issues, try the web-based diagnostic instead:
echo https://electro-interfaces.github.io/tradeframe-builder/quick-mobile-test.html
echo.
pause