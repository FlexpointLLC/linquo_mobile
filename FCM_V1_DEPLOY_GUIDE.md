# 🚀 FCM v1 API Deployment Guide

## ✅ What's Different

This version uses the **new FCM HTTP v1 API** with your service account credentials embedded directly in the code. No environment variables needed!

---

## 📋 STEP 1: Update Edge Function

### Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/vzoteejdvffrdjprfpad
2. Click **"Edge Functions"** in left sidebar
3. Find your existing `process-push-notifications` function
4. Click on it to edit

### Replace the Code
1. **Delete all existing code** in the editor
2. **Open the file**: `FCM_V1_FUNCTION.ts`
3. **Copy ALL code** (Cmd+A, Cmd+C)
4. **Paste** into the Supabase editor
5. Click **"Deploy"**

### Remove Old Environment Variable
Since credentials are now embedded, you can **delete** the old `FCM_SERVER_KEY` environment variable if it exists.

---

## 🧪 STEP 2: Test the Function

### Test via cURL:
```bash
curl -X POST \
  'https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg2NjMsImV4cCI6MjA3NDAyNDY2M30.OnExGM-A8Wmm-iNVHMjwFsS0iyNZjZuZXrzPRy5GqTw' \
  -H 'Content-Type': 'application/json'
```

You should see:
```json
{
  "success": true,
  "message": "No pending notifications found"
}
```

Or if there are pending notifications:
```json
{
  "success": true,
  "message": "Processed X notifications",
  "details": {
    "total": X,
    "success": Y,
    "failed": Z
  }
}
```

---

## ⏰ STEP 3: Set Up Automatic Processing

### Option A: Supabase Cron Job
Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old cron job if it exists
SELECT cron.unschedule('process-push-notifications');

-- Create new cron job to process push notifications every minute
SELECT cron.schedule(
  'process-push-notifications',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications',
      headers:=jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ0ODY2MywiZXhwIjoyMDc0MDI0NjYzfQ.iEwq34iR8Xa633Hoo_wqNXd8mKwGQ7qE8jP5L9WxsGc',
        'Content-Type', 'application/json'
      )
    ) as request_id;
  $$
);
```

### Verify cron job is running:
```sql
SELECT * FROM cron.job;
```

---

## 🔍 Debugging

### Check Function Logs
1. Go to Supabase Dashboard → Edge Functions
2. Click on `process-push-notifications`
3. Click on "Logs" tab
4. Look for error messages

### Check Queue Status
```sql
-- See all notifications
SELECT 
  id,
  agent_id,
  title,
  status,
  error_message,
  retry_count,
  created_at,
  processed_at
FROM push_notification_queue 
ORDER BY created_at DESC 
LIMIT 20;

-- Count by status
SELECT status, COUNT(*) 
FROM push_notification_queue 
GROUP BY status;
```

### Check Device Tokens
```sql
-- See all registered devices
SELECT * FROM agent_device_tokens;

-- Count active tokens
SELECT COUNT(*) FROM agent_device_tokens WHERE is_active = true;
```

---

## ✅ What's Next

### To Actually Receive Notifications:

1. **Install mobile app** on a physical device (Android or iOS)
2. **Login as an agent**
3. **Grant notification permissions** when prompted
4. The app will automatically register the device token

### To Test Without Mobile App:

You can manually insert a test device token:
```sql
-- Get your agent_id first
SELECT id, name FROM agents LIMIT 5;

-- Insert test token (replace with your actual FCM token from Firebase)
INSERT INTO agent_device_tokens (
  agent_id,
  device_token,
  platform,
  is_active
) VALUES (
  'YOUR_AGENT_ID_HERE',
  'YOUR_FCM_DEVICE_TOKEN_HERE',
  'android',
  true
);
```

To get a real FCM device token, you need to run the mobile app on a device.

---

## 🎉 Summary

Your push notification system is now using the **latest FCM v1 API**:

- ✅ Widget sends messages
- ✅ Trigger queues notifications  
- ✅ Edge Function processes queue with FCM v1 API
- ✅ Service account authentication (more secure!)
- ⏰ Cron job processes notifications every minute
- 📱 Just need device tokens from mobile app

Everything is deployed and ready to go! 🚀

