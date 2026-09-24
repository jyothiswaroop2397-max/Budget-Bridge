package com.budgetbridge.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Background WorkManager Worker:
 * Transmits the intercepted bank SMS to the Gemini verification backend (/api/parse-sms).
 * If verified as a legitimate debit or credit payment, updates ledger balances and posts a notification.
 */
class BankSmsWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "BankSmsWorker"
        private const val CHANNEL_ID = "bank_sms_channel"
        private const val API_BASE_URL = "https://budget-bridge-k9zr.onrender.com/api/parse-sms"
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val sender = inputData.getString("sender") ?: "Bank"
        val message = inputData.getString("message") ?: return@withContext Result.failure()
        val timestamp = inputData.getLong("timestamp", System.currentTimeMillis())

        Log.d(TAG, "Processing SMS in background from $sender...")

        try {
            val jsonPayload = JSONObject().apply {
                put("sender", sender)
                put("smsText", message)
                put("timestamp", timestamp)
            }

            val requestBody = jsonPayload.toString()
                .toRequestBody("application/json; charset=utf-8".toMediaType())

            val request = Request.Builder()
                .url(API_BASE_URL)
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.w(TAG, "API verification returned HTTP ${response.code}")
                return@withContext Result.retry()
            }

            val responseBody = response.body?.string() ?: return@withContext Result.failure()
            val resultJson = JSONObject(responseBody)

            if (resultJson.optBoolean("success", false)) {
                val data = resultJson.optJSONObject("data")
                val isFinancial = data?.optBoolean("isFinancialSms", false) ?: false

                if (isFinancial) {
                    val amount = data?.optDouble("amount", 0.0) ?: 0.0
                    val direction = data?.optString("direction", "DEBIT") ?: "DEBIT"
                    val bankName = data?.optString("bankName", "Canara Bank") ?: "Canara Bank"
                    val reason = data?.optString("reason", "Bank Transaction") ?: "Bank Transaction"
                    val type = data?.optString("type", "PERSONAL_EXPENSE") ?: "PERSONAL_EXPENSE"

                    Log.i(TAG, "Successfully verified $direction of Rs.$amount via Gemini API ($bankName)")

                    // Post Android Notification
                    showTransactionNotification(bankName, direction, amount, reason)
                } else {
                    Log.d(TAG, "SMS discarded safely: Non-financial (OTP/promo/alert)")
                }
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Error executing background SMS sync: ${e.message}", e)
            Result.retry()
        }
    }

    private fun showTransactionNotification(
        bankName: String,
        direction: String,
        amount: Double,
        reason: String
    ) {
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Bank Transaction Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Real-time updates from Canara Bank and UPI transactions"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val title = if (direction == "DEBIT") "₹$amount Debited • $bankName" else "₹$amount Credited • $bankName"
        val subtitle = "Logged to Budget Bridge Daily Box: $reason"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), notification)
    }
}
