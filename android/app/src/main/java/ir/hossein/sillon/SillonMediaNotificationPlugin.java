package ir.hossein.sillon;

import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor bridge for Sillon's native media playback notification.
 * JS calls update(...) whenever track / playback state changes.
 */
@CapacitorPlugin(
    name = "SillonMediaNotification",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { android.Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class SillonMediaNotificationPlugin extends Plugin {

    private static final String PERMISSION_ALIAS = "notifications";
    private PluginCall pendingPermissionCall;

    @Override
    public void load() {
        SillonMediaNotificationService.setActionListener(this::forwardAction);
    }

    private void forwardAction(String action) {
        String name;
        switch (action) {
            case SillonMediaNotificationService.ACTION_PLAY:
                name = "play";
                break;
            case SillonMediaNotificationService.ACTION_PAUSE:
                name = "pause";
                break;
            case SillonMediaNotificationService.ACTION_NEXT:
                name = "next";
                break;
            case SillonMediaNotificationService.ACTION_PREV:
                name = "prev";
                break;
            default:
                return;
        }
        JSObject data = new JSObject();
        data.put("action", name);
        notifyListeners("action", data);
    }

    @PluginMethod
    public void update(PluginCall call) {
        ensureNotificationPermission(call, () -> {
            Intent intent = new Intent(getContext(), SillonMediaNotificationService.class);
            intent.setAction(SillonMediaNotificationService.ACTION_UPDATE);
            intent.putExtra(SillonMediaNotificationService.EXTRA_TITLE,
                call.getString("title", "Sillon"));
            intent.putExtra(SillonMediaNotificationService.EXTRA_ARTIST,
                call.getString("artist", ""));
            intent.putExtra(SillonMediaNotificationService.EXTRA_ALBUM,
                call.getString("album", ""));
            intent.putExtra(SillonMediaNotificationService.EXTRA_PLAYING,
                call.getBoolean("playing", false));
            String artUri = call.getString("artUri", "");
            if (artUri == null) artUri = "";
            intent.putExtra(SillonMediaNotificationService.EXTRA_ART_URI, artUri);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent intent = new Intent(getContext(), SillonMediaNotificationService.class);
        intent.setAction(SillonMediaNotificationService.ACTION_HIDE);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        ensureNotificationPermission(call, () -> {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        });
    }

    private boolean hasPostNotificationsPermission() {
        return com.getcapacitor.PermissionState.GRANTED.equals(
            getPermissionState(PERMISSION_ALIAS)
        );
    }

    private void ensureNotificationPermission(PluginCall call, Runnable onReady) {
        if (android.os.Build.VERSION.SDK_INT < 33) {
            onReady.run();
            return;
        }
        if (NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            onReady.run();
            return;
        }
        pendingPermissionCall = call;
        requestPermissionForAlias(PERMISSION_ALIAS, call, "notificationPermCallback");
        // When granted we still resolve original call via callback below
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        if (hasPostNotificationsPermission()) {
            if (call.getMethodName().equals("requestPermissions")) {
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
            } else {
                onReadyPending(call);
            }
        } else {
            // Proceed silently: foreground media notification is exempt from POST_NOTIFICATIONS
            onReadyPending(call);
        }
    }

    private void onReadyPending(PluginCall call) {
        if (call.getMethodName().equals("update")) {
            Intent intent = new Intent(getContext(), SillonMediaNotificationService.class);
            intent.setAction(SillonMediaNotificationService.ACTION_UPDATE);
            intent.putExtra(SillonMediaNotificationService.EXTRA_TITLE,
                call.getString("title", "Sillon"));
            intent.putExtra(SillonMediaNotificationService.EXTRA_ARTIST,
                call.getString("artist", ""));
            intent.putExtra(SillonMediaNotificationService.EXTRA_ALBUM,
                call.getString("album", ""));
            intent.putExtra(SillonMediaNotificationService.EXTRA_PLAYING,
                call.getBoolean("playing", false));
            String artUri = call.getString("artUri", "");
            if (artUri == null) artUri = "";
            intent.putExtra(SillonMediaNotificationService.EXTRA_ART_URI, artUri);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } else if (call.getMethodName().equals("requestPermissions")) {
            JSObject result = new JSObject();
            result.put("granted", hasPostNotificationsPermission());
            call.resolve(result);
        } else {
            call.resolve();
        }
    }
}
