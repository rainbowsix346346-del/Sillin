package ir.hossein.sillon;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SillonMediaScanner",
    permissions = {
        @Permission(
            alias = "audio",
            strings = {
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class SillonMediaScannerPlugin extends Plugin {

    @PluginMethod
    public void scanAllAudio(PluginCall call) {
        if (!hasAudioPermission()) {
            requestPermissionForAlias("audio", call, "audioPermsCallback");
            return;
        }
        requestNotificationsIfNeeded();
        queryMediaStore(call);
    }

    @PermissionCallback
    private void audioPermsCallback(PluginCall call) {
        if (hasAudioPermission()) {
            requestNotificationsIfNeeded();
            queryMediaStore(call);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("tracks", new JSArray());
            call.resolve(ret);
        }
    }

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return getPermissionState("audio") == PermissionState.GRANTED
                || getContext().checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            return getPermissionState("audio") == PermissionState.GRANTED
                || getContext().checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
    }

    private void requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                try {
                    getActivity().requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 9042);
                } catch (Exception ignored) {}
            }
        }
    }

    private void queryMediaStore(PluginCall call) {
        new Thread(() -> {
            JSArray tracks = new JSArray();
            ContentResolver resolver = getContext().getContentResolver();
            Uri collection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

            String[] projection = new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.YEAR
            };

            String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
            String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

            try (Cursor cursor = resolver.query(collection, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                    int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                    int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                    int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                    int albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);
                    int durCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                    int dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA);
                    int yearCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.YEAR);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        String title = cursor.getString(titleCol);
                        String artist = cursor.getString(artistCol);
                        String album = cursor.getString(albumCol);
                        long albumId = cursor.getLong(albumIdCol);
                        long durationMs = cursor.getLong(durCol);
                        String filePath = cursor.getString(dataCol);
                        int year = cursor.getInt(yearCol);

                        if (durationMs < 5000) continue; // skip tiny UI sounds

                        Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                        Uri artUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);

                        String folderPath = "Device Music";
                        if (filePath != null && filePath.contains("/")) {
                            int lastSlash = filePath.lastIndexOf('/');
                            folderPath = filePath.substring(0, lastSlash);
                        }

                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("title", title != null ? title : "Unknown Track");
                        item.put("artist", (artist != null && !artist.equals("<unknown>")) ? artist : "Unknown Artist");
                        item.put("album", (album != null && !album.equals("<unknown>")) ? album : "Singles");
                        item.put("duration", Math.round(durationMs / 1000.0));
                        item.put("contentUri", contentUri.toString());
                        item.put("filePath", filePath != null ? filePath : "");
                        item.put("folderPath", folderPath);
                        item.put("albumArtUri", artUri.toString());
                        item.put("year", year > 1900 ? year : 2025);
                        tracks.put(item);
                    }
                }
            } catch (Exception e) {
                call.reject("MediaStore scan failed: " + e.getMessage());
                return;
            }

            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("tracks", tracks);
            call.resolve(result);
        }).start();
    }
}
