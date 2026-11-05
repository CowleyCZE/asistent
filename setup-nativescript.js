const fs = require('fs');
const path = require('path');

// Vytvoření základní struktury projektu
const directories = [
  'app/assets/sounds',
  'App_Resources/Android/src/main/res/values',
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Vytvoření potřebných konfiguračních souborů
const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- INTERNET je nutný pro ns preview (synchronizace bundlu) i pro webhooky -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <application
        android:name="com.tns.NativeScriptApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        <activity
            android:name="com.tns.NativeScriptActivity"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

if (!fs.existsSync('App_Resources/Android/src/main/AndroidManifest.xml')) {
  fs.writeFileSync('App_Resources/Android/src/main/AndroidManifest.xml', androidManifest);
}

// Vytvoření strings.xml pro Android
const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Czech Voice Assistant</string>
    <string name="title_activity_kimera">Czech Voice Assistant</string>
</resources>`;

if (!fs.existsSync('App_Resources/Android/src/main/res/values/strings.xml')) {
  fs.writeFileSync('App_Resources/Android/src/main/res/values/strings.xml', stringsXml);
}

console.log('NativeScript setup completed successfully!');
