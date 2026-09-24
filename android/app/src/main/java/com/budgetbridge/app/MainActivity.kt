package com.budgetbridge.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var backPressedTime: Long = 0
    private var backToast: Toast? = null

    companion object {
        var activeInstance: MainActivity? = null
        private const val PERMISSION_REQUEST_CODE = 101
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeInstance = this

        webView = WebView(this)
        setContentView(webView)

        setupWebView()
        checkAndRequestSmsPermissions()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (activeInstance == this) {
            activeInstance = null
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = true

        // Register Native Android Bridge
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidSmsBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Notify web app that Android Native container is ready
                val isPermitted = checkSmsPermissionsGranted()
                webView.evaluateJavascript(
                    "window.onAndroidBridgeReady && window.onAndroidBridgeReady({ hasPermission: $isPermitted });",
                    null
                )
            }
        }

        // Point to the mobile web app url or local asset
        val appUrl = "https://budget-bridge-k9zr.onrender.com"
        webView.loadUrl(appUrl)
    }

    fun requestNativeSmsPermissions() {
        val permissions = arrayOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
        ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE)
    }

    private fun checkSmsPermissionsGranted(): Boolean {
        val receive = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val read = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        return receive && read
    }

    private fun checkAndRequestSmsPermissions() {
        if (!checkSmsPermissionsGranted()) {
            requestNativeSmsPermissions()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                Toast.makeText(this, "Canara Bank SMS Listener Enabled", Toast.LENGTH_SHORT).show()
            }
            webView.evaluateJavascript(
                "window.onAndroidPermissionChanged && window.onAndroidPermissionChanged($allGranted);",
                null
            )
        }
    }

    /**
     * Handle Android hardware and gesture back navigation:
     * 1. If WebView has navigation history (e.g. Analytics / Settings tab), navigate back to Home (Dashboard)
     * 2. If already on Home (Dashboard), require double-tap within 2 seconds before exiting the app.
     */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            if (backPressedTime + 2000 > System.currentTimeMillis()) {
                backToast?.cancel()
                super.onBackPressed()
            } else {
                backToast = Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT)
                backToast?.show()
                backPressedTime = System.currentTimeMillis()
            }
        }
    }

    /**
     * Dispatch an incoming SMS payload directly to the React application in real-time
     */
    fun dispatchSmsToWebView(sender: String, message: String, timestamp: Long) {
        val payload = JSONObject().apply {
            put("sender", sender)
            put("message", message)
            put("timestamp", timestamp)
        }

        val script = "window.onNativeSmsReceived && window.onNativeSmsReceived(${payload.toString()});"
        webView.evaluateJavascript(script, null)
    }
}
