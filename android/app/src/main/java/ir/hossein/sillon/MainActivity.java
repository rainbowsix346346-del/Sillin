package ir.hossein.sillon;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SillonMediaScannerPlugin.class);
        registerPlugin(SillonMediaNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
