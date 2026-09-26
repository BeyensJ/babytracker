package com.beyensj.babytracker;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LiveTimerPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && LiveTimerPlugin.ACTION_NOTIFICATION.equals(intent.getAction())) {
            String action = intent.getStringExtra("action");
            String timerType = intent.getStringExtra("timerType");
            LiveTimerPlugin plugin = LiveTimerPlugin.getInstance();
            if (plugin != null && action != null) {
                plugin.handleNotificationAction(action, timerType);
            }
        }
    }
}
