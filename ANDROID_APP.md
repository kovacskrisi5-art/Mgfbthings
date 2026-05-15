# Android app build

The project now has a Capacitor Android wrapper in the `android/` folder.

It opens the production app:

```text
https://bakery-subscription.vercel.app
```

## One-time setup

Install Android Studio:

```text
https://developer.android.com/studio
```

During install, include:

- Android SDK
- Android SDK Platform Tools
- Android SDK Build Tools
- Android Emulator if you want to test on the computer

Also install a JDK if Android Studio does not add one automatically.

## Open the app project

From this folder:

```powershell
npm.cmd run android:open
```

Or open Android Studio manually and choose:

```text
C:\Users\kovac\Downloads\bakery-subscription\android
```

## Build an APK

In Android Studio:

- Build
- Build Bundle(s) / APK(s)
- Build APK(s)

The APK will appear under:

```text
android\app\build\outputs\apk\debug\
```

## Command line APK

After Java and Android SDK are installed:

```powershell
cd C:\Users\kovac\Downloads\bakery-subscription
android\gradlew.bat assembleDebug
```

## After web app changes

If you change the web app and redeploy to Vercel, the Android wrapper keeps opening the same production URL. If you change Capacitor config, run:

```powershell
npm.cmd run android:sync
```
