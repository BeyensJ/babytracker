package com.beyensj.babytracker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "LiveTimer",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class LiveTimerPlugin extends Plugin {
    public static final String CHANNEL_ID = "babytracker_live_timer";
    public static final int NOTIFICATION_ID = 1001;
    public static final String ACTION_NOTIFICATION = "com.beyensj.babytracker.NOTIFICATION_ACTION";

    private static LiveTimerPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        createNotificationChannel();
    }

    public static LiveTimerPlugin getInstance() {
        return instance;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Live Active Timers";
            String description = "Persistent live ticking stopwatch for active nursing, sleep, and pumping timers";
            int importance = NotificationManager.IMPORTANCE_LOW;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.setShowBadge(true);
            channel.setSound(null, null);
            channel.enableVibration(false);

            NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @PluginMethod
    public void startTimer(PluginCall call) {
        String title = call.getString("title", "Baby Tracker");
        String text = call.getString("text", "Timer running");
        Long startTimeMs = call.getLong("startTimeMs");
        if (startTimeMs == null || startTimeMs <= 0) {
            startTimeMs = System.currentTimeMillis();
        }
        String timerType = call.getString("timerType", "timer");
        JSArray actions = call.getArray("actions");

        Context context = getContext();

        // PendingIntent to bring app to foreground when tapping notification body
        Intent contentIntent = new Intent(context, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            context,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setWhen(startTimeMs)
            .setUsesChronometer(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentPendingIntent);

        // Add action buttons (e.g. "Switch Side", "Woke Up", "Finish & Save")
        if (actions != null) {
            for (int i = 0; i < actions.length(); i++) {
                try {
                    JSONObject actionObj = actions.getJSONObject(i);
                    String actionId = actionObj.optString("id");
                    String actionTitle = actionObj.optString("title");

                    if (!actionId.isEmpty() && !actionTitle.isEmpty()) {
                        Intent actionIntent = new Intent(context, MainActivity.class);
                        actionIntent.setAction(ACTION_NOTIFICATION);
                        actionIntent.putExtra("action", actionId);
                        actionIntent.putExtra("timerType", timerType);
                        actionIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                        PendingIntent pendingAction = PendingIntent.getActivity(
                            context,
                            i + 1,
                            actionIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                        );

                        builder.addAction(0, actionTitle, pendingAction);
                    }
                } catch (JSONException e) {
                    // Ignore malformed action entry
                }
            }
        }

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
            call.resolve();
        } catch (SecurityException se) {
            call.reject("Notification permission denied", se);
        } catch (Exception e) {
            call.reject("Failed to show timer notification: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopTimer(PluginCall call) {
        try {
            NotificationManagerCompat.from(getContext()).cancel(NOTIFICATION_ID);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to cancel timer notification: " + e.getMessage(), e);
        }
    }

    public void handleNotificationAction(String action, String timerType) {
        JSObject ret = new JSObject();
        ret.put("action", action);
        ret.put("timerType", timerType);
        notifyListeners("timerAction", ret);
    }
}
