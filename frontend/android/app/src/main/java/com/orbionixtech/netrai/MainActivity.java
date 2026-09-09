package com.orbionixtech.netrai;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NetrAIFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
