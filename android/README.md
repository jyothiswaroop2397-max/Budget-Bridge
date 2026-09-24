# Budget Bridge - Native Android Integration

## Overview
This directory contains the production-grade native Android background SMS listener module for the **Budget Bridge** application.

### Architecture & Pipeline
1. **SMS Arrival**: The Android OS receives an incoming SMS via cellular broadcast (`android.provider.Telephony.SMS_RECEIVED`).
2. **BroadcastReceiver (`SmsBroadcastReceiver.kt`)**: 
   - Intercepts incoming SMS with priority `999`.
   - Filters sender addresses against Canara Bank (`CANBNK`, `CNRBNK`), HDFC (`HDFCBK`), State Bank of India (`SBINB`), ICICI (`ICICIB`), Axis Bank (`AXISBK`), and UPI channels (GPay, PhonePe, Paytm).
3. **Dual Dispatching**:
   - **Foreground**: If `MainActivity` is active, dispatches directly into the React WebView via `window.onNativeSmsReceived()`.
   - **Background**: If the phone is locked or the app is closed, enqueues an asynchronous AndroidX `WorkManager` job (`BankSmsWorker.kt`) with network constraints and exponential backoff.
4. **Gemini API Verification (`/api/parse-sms`)**:
   - The message body is transmitted to the backend server.
   - The Gemini AI financial copilot verifies whether the message is a legitimate financial debit or credit transaction (filtering out OTPs, password resets, and marketing spam).
   - Extracts exact monetary amount, counterparty/merchant, category, and whether it represents a personal expense or peer-to-peer loan.
5. **Dashboard & Budget Bridge Update**:
   - Automatically updates the Daily Box (Daily Spend Limit, Monthly Total Expenditure, Spent Today).
   - If a counterparty is detected (e.g. transfer to Sam), updates Sam's P2P net balance automatically.

### File Structure
```
android/
├── app/
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml          # Declares RECEIVE_SMS, READ_SMS, FOREGROUND_SERVICE
│           └── java/com/budgetbridge/app/
│               ├── MainActivity.kt          # WebView container, runtime permission requests, JS bridge
│               ├── SmsBroadcastReceiver.kt  # Native broadcast receiver for SMS_RECEIVED
│               ├── BankSmsWorker.kt         # WorkManager background worker syncing with /api/parse-sms
│               └── WebAppInterface.kt       # @JavascriptInterface bridge (window.AndroidSmsBridge)
└── README.md
```

### Runtime Permissions Required
- `android.permission.RECEIVE_SMS`: Enables real-time interception of incoming bank SMS alerts.
- `android.permission.READ_SMS`: Allows verifying concatenated multi-part SMS messages.
- `android.permission.INTERNET`: Communicates with the backend server API.
- `android.permission.POST_NOTIFICATIONS`: Posts native Android transaction alerts upon verification.

