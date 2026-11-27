package ir.hossein.sillon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that renders the Sillon media playback notification
 * (notification shade + lock screen) with play/pause, next and previous actions.
 */
public class SillonMediaNotificationService extends Service {

    public static final String CHANNEL_ID = "sillon_media_playback";
    public static final int NOTIFICATION_ID = 8471;

    public static final String ACTION_UPDATE = "ir.hossein.sillon.NOTIFICATION_UPDATE";
    public static final String ACTION_HIDE = "ir.hossein.sillon.NOTIFICATION_HIDE";
    public static final String ACTION_PLAY = "ir.hossein.sillon.NOTIFICATION_PLAY";
    public static final String ACTION_PAUSE = "ir.hossein.sillon.NOTIFICATION_PAUSE";
    public static final String ACTION_NEXT = "ir.hossein.sillon.NOTIFICATION_NEXT";
    public static final String ACTION_PREV = "ir.hossein.sillon.NOTIFICATION_PREV";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";
    public static final String EXTRA_PLAYING = "playing";
    public static final String EXTRA_ART_URI = "artUri";

    private static volatile ActionListener actionListener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ActionListener {
        void onAction(String action);
    }

    public static void setActionListener(ActionListener listener) {
        actionListener = listener;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    private void createChannel() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Sillon Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Sillon music playback controls");
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (ACTION_HIDE.equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_UPDATE.equals(action)) {
            Notification notification = buildNotification(intent);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } else if (ACTION_PLAY.equals(action)
            || ACTION_PAUSE.equals(action)
            || ACTION_NEXT.equals(action)
            || ACTION_PREV.equals(action)) {
            ActionListener listener = actionListener;
            if (listener != null) {
                mainHandler.post(() -> listener.onAction(action));
            }
            // Keep the current notification alive; JS will send an update with new state
        }
        return START_STICKY;
    }

    private Notification buildNotification(Intent intent) {
        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String album = intent.getStringExtra(EXTRA_ALBUM);
        boolean playing = intent.getBooleanExtra(EXTRA_PLAYING, false);
        String artUri = intent.getStringExtra(EXTRA_ART_URI);

        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPi = PendingIntent.getActivity(
            this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(title == null ? "Sillon" : title)
                .setContentText(artist == null || artist.isEmpty() ? (album == null ? "" : album) : artist)
                .setSubText(album)
                .setContentIntent(openPi)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setShowWhen(false)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);

        Bitmap art = loadArtBitmap(artUri);
        if (art != null) {
            builder.setLargeIcon(art);
        }

        buildAction(builder, ACTION_PREV, android.R.drawable.ic_media_previous, "Previous", 1);
        if (playing) {
            buildAction(builder, ACTION_PAUSE, android.R.drawable.ic_media_pause, "Pause", 2);
        } else {
            buildAction(builder, ACTION_PLAY, android.R.drawable.ic_media_play, "Play", 2);
        }
        buildAction(builder, ACTION_NEXT, android.R.drawable.ic_media_next, "Next", 3);

        return builder.build();
    }

    private void buildAction(NotificationCompat.Builder builder, String action, int iconRes, String label, int requestCode) {
        Intent intent = new Intent(this, SillonMediaNotificationService.class);
        intent.setAction(action);
        PendingIntent pi = PendingIntent.getService(
            this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        builder.addAction(iconRes, label, pi);
    }

    private Bitmap loadArtBitmap(String artUri) {
        if (artUri == null || artUri.isEmpty()) return null;
        try {
            Bitmap bitmap = null;
            if (artUri.startsWith("content://")) {
                java.io.InputStream is = getContentResolver().openInputStream(Uri.parse(artUri));
                if (is != null) {
                    BitmapFactory.Options opts = new BitmapFactory.Options();
                    opts.inSampleSize = 2;
                    bitmap = BitmapFactory.decodeStream(is, null, opts);
                    is.close();
                }
            } else if (artUri.startsWith("data:")) {
                int comma = artUri.indexOf(',');
                if (comma > 0 && artUri.contains(";base64,")) {
                    byte[] data = android.util.Base64.decode(artUri.substring(comma + 1), android.util.Base64.DEFAULT);
                    bitmap = BitmapFactory.decodeByteArray(data, 0, data.length);
                }
            }
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }
}
