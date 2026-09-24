package com.budgetbridge.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * Native Android Background SMS BroadcastReceiver
 * Captures incoming SMS from Canara Bank and other banking/UPI senders,
 * extracts message parts, and triggers background verification with Gemini API.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsBroadcastReceiver"

        // Bank sender codes in India typically end with or contain bank identifiers
        private val TARGET_BANK_HEADERS = listOf(
            "CANBNK", "CNRBNK", "CANARA",  // Canara Bank
            "HDFCBK", "HDFC",              // HDFC Bank
            "SBINB", "SBIUPI", "SBIPSG",   // State Bank of India
            "ICICIB", "ICICI",             // ICICI Bank
            "AXISBK", "AXIS",              // Axis Bank
            "KOTAKB", "KOTAK",             // Kotak Mahindra Bank
            "PAYTM", "PYTM",               // Paytm Payments Bank
            "AIRTEL", "JIOFIN",            // Telecom Banks
            "UPI", "NPCI"                  // Unified Payments Interface
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0].originatingAddress ?: "Unknown"
            val fullBody = buildString {
                for (sms in messages) {
                    sms.displayMessageBody?.let { append(it) }
                }
            }
            val timestamp = messages[0].timestampMillis

            Log.d(TAG, "Incoming SMS received from: $sender")

            // Check if sender matches Canara Bank or banking/UPI headers
            val isBankSender = TARGET_BANK_HEADERS.any { header ->
                sender.contains(header, ignoreCase = true)
            }

            // Also check keywords in body if sender is shortcode or alphanumeric
            val hasFinancialKeywords = fullBody.contains("debited", ignoreCase = true) ||
                    fullBody.contains("credited", ignoreCase = true) ||
                    fullBody.contains("Rs.", ignoreCase = true) ||
                    fullBody.contains("INR", ignoreCase = true) ||
                    fullBody.contains("Canara", ignoreCase = true)

            if (isBankSender || hasFinancialKeywords) {
                Log.i(TAG, "Financial/Bank SMS detected. Enqueueing background Gemini verification worker...")

                // 1. Pass directly to Active WebView if app is currently visible in foreground
                MainActivity.activeInstance?.runOnUiThread {
                    MainActivity.activeInstance?.dispatchSmsToWebView(sender, fullBody, timestamp)
                }

                // 2. Schedule reliable WorkManager task for background execution even when phone is locked
                val workData = Data.Builder()
                    .putString("sender", sender)
                    .putString("message", fullBody)
                    .putLong("timestamp", timestamp)
                    .build()

                val smsWorkRequest = OneTimeWorkRequestBuilder<BankSmsWorker>()
                    .setInputData(workData)
                    .addTag("bank_sms_verification")
                    .build()

                WorkManager.getInstance(context).enqueue(smsWorkRequest)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming SMS: ${e.message}", e)
        }
    }
}
