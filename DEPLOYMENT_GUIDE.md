# 🚀 Push Notifications Deployment Guide

## ✅ Prerequisites Complete
- Database tables created ✅
- Triggers fixed ✅
- Mobile app code ready ✅
- FCM token available ✅

## 📋 Deploy via Supabase Dashboard (Easiest Method)

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project: `vzoteejdvffrdjprfpad`

### Step 2: Navigate to Edge Functions
1. Click **"Edge Functions"** in the left sidebar
2. Click **"Create a new function"** button

### Step 3: Create the Function
1. **Function name**: `process-push-notifications`
2. **Copy the code**:
   - Open the file: `DEPLOY_READY.ts`
   - Copy ALL the code (Cmd+A, Cmd+C)
   - Paste into the function editor

### Step 4: Set Environment Variables
1. Before deploying, click on **"Secrets"** or **"Environment Variables"**
2. Add a new secret:
   - **Key**: `FCM_SERVER_KEY`
   - **Value**: `BNqvFcZTldTVHxfjZYLPOsYTVSy8iMDhjjQoHnZ4kqWyhdqmQEOr1uaqsD_ag1AJWqXhdFMGC1MiIFZksIFMLGY`

### Step 5: Deploy
1. Click **"Deploy"** button
2. Wait for deployment to complete
3. You should see "Function deployed successfully"

### Step 6: Get Function URL
After deployment, you'll get a URL like:
```
https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications
```

## 🧪 Test the Function

### Test via Supabase Dashboard
1. In the Edge Function page, click **"Invoke"**
2. You should see a response showing how many notifications were processed

### Test via cURL
```bash
curl -X POST \
  'https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Check the Queue
Run this in Supabase SQL Editor to see pending notifications:
```sql
SELECT * FROM push_notification_queue 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

## ⏰ Schedule Automatic Processing (Optional)

### Option 1: Supabase Cron Jobs
1. Go to **Database > Cron Jobs** in Supabase Dashboard
2. Create a new cron job:
   - **Schedule**: `*/1 * * * *` (every minute)
   - **Command**: Call the Edge Function
   ```sql
   SELECT
     net.http_post(
       url:='https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications',
       headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     ) as request_id;
   ```

### Option 2: External Cron (like cron-job.org)
1. Sign up at https://cron-job.org
2. Create a new cron job
3. Set URL: Your function URL
4. Set schedule: Every minute
5. Add header: `Authorization: Bearer YOUR_ANON_KEY`

## 🎉 Verify Everything Works

### 1. Send a Test Message
- Open your widget on the website
- Send a message as a customer
- Message should save successfully ✅

### 2. Check the Queue
```sql
SELECT * FROM push_notification_queue 
ORDER BY created_at DESC 
LIMIT 5;
```
You should see the notification queued ✅

### 3. Process the Queue
- Invoke the Edge Function (via dashboard or cURL)
- Check queue again - status should change to 'sent' ✅

### 4. Check Mobile App
- If you have the mobile app installed
- You should receive a push notification ✅

## 🔧 Troubleshooting

### Function won't deploy
- Make sure you copied the entire code
- Check that FCM_SERVER_KEY is set
- Verify you have the correct permissions

### No notifications being sent
- Check if notifications are in the queue (SQL query above)
- Verify FCM_SERVER_KEY is correct
- Check function logs in Supabase dashboard

### Mobile app not receiving notifications
- Verify device token is registered in `agent_device_tokens`
- Check if token is marked as `is_active = true`
- Test FCM token directly using Firebase Console

## 📚 Files Reference

- `DEPLOY_READY.ts` - Edge Function code (ready to deploy)
- `FIX_TRIGGERS.sql` - Database trigger fix (already applied)
- `index.ts` - Original Edge Function source
- This file - Deployment guide

## 🎯 Summary

Your push notification system:
1. ✅ Widget sends message → Trigger queues notification
2. ✅ Edge Function processes queue → Sends via FCM
3. ✅ Mobile app receives push notification

Everything is ready to deploy! 🚀

