import fs from 'fs';
import path from 'path';

const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  const permissions = [
    '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />'
  ];

  permissions.forEach((perm) => {
    const permName = perm.match(/android:name="([^"]+)"/)[1];
    if (!manifest.includes(permName)) {
      manifest = manifest.replace('<application', `${perm}\n    <application`);
    }
  });

  if (!manifest.includes('android:requestLegacyExternalStorage="true"')) {
    manifest = manifest.replace(
      '<application',
      '<application android:requestLegacyExternalStorage="true" android:usesCleartextTraffic="true"'
    );
  }

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('AndroidManifest.xml updated successfully for Sillon!');
}
