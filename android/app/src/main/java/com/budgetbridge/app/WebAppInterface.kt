package com.budgetbridge.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * JavaScript Interface Bridge between Android Native Environment and React App
 * Bound to window.AndroidSmsBridge
 */
class WebAppInterface(private val activity: MainActivity) {

    @JavascriptInterface
    fun isAndroidNative(): Boolean {
        return true
    }

    @JavascriptInterface
    fun isSmsPermissionGranted(): Boolean {
        val receiveGranted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val readGranted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        return receiveGranted && readGranted
    }

    @JavascriptInterface
    fun requestSmsPermission() {
        activity.requestNativeSmsPermissions()
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val json = JSONObject().apply {
            put("platform", "Android")
            put("osVersion", Build.VERSION.RELEASE)
            put("sdkInt", Build.VERSION.SDK_INT)
            put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("appPackage", activity.packageName)
        }
        return json.toString()
    }

    @JavascriptInterface
    fun triggerSimulatedSms(sender: String, message: String) {
        activity.dispatchSmsToWebView(sender, message, System.currentTimeMillis())
    }
}
