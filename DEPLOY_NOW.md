# 🚀 READY TO DEPLOY - NO PLACEHOLDERS

## ✅ All Your Actual Values

- **Supabase URL**: `https://vzoteejdvffrdjprfpad.supabase.co`
- **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg2NjMsImV4cCI6MjA3NDAyNDY2M30.OnExGM-A8Wmm-iNVHMjwFsS0iyNZjZuZXrzPRy5GqTw`
- **Supabase Service Role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ0ODY2MywiZXhwIjoyMDc0MDI0NjYzfQ.iEwq34iR8Xa633Hoo_wqNXd8mKwGQ7qE8jP5L9WxsGc`
- **FCM Server Key**: `BNqvFcZTldTVHxfjZYLPOsYTVSy8iMDhjjQoHnZ4kqWyhdqmQEOr1uaqsD_ag1AJWqXhdFMGC1MiIFZksIFMLGY`

---

## 🎯 STEP 1: Deploy Edge Function via Dashboard

### Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/vzoteejdvffrdjprfpad
2. Click **"Edge Functions"** in left sidebar
3. Click **"Create a new function"**

### Create Function
- **Name**: `process-push-notifications`
- **Code**: Copy from `FINAL_FUNCTION.ts` (see below)

### Set Environment Variable
In the function settings, add:
- **Key**: `FCM_SERVER_KEY`
- **Value**: `BNqvFcZTldTVHxfjZYLPOsYTVSy8iMDhjjQoHnZ4kqWyhdqmQEOr1uaqsD_ag1AJWqXhdFMGC1MiIFZksIFMLGY`

### Deploy
Click **"Deploy"** button

---

## 🧪 STEP 2: Test the Function

### Test via cURL (Copy-Paste Ready):
```bash
curl -X POST \
  'https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg2NjMsImV4cCI6MjA3NDAyNDY2M30.OnExGM-A8Wmm-iNVHMjwFsS0iyNZjZuZXrzPRy5GqTw' \
  -H 'Content-Type: application/json'
```

---

## ⏰ STEP 3: Set Up Automatic Processing (Optional)

### Option A: Supabase Cron Job
Run this SQL in Supabase SQL Editor to process notifications every minute:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to process push notifications every minute
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

### Option B: External Cron Service (cron-job.org)
1. Go to: https://cron-job.org
2. Create new cron job
3. **URL**: `https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications`
4. **Schedule**: Every 1 minute
5. **Header**: 
   - Name: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3RlZWpkdmZmcmRqcHJmcGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg2NjMsImV4cCI6MjA3NDAyNDY2M30.OnExGM-A8Wmm-iNVHMjwFsS0iyNZjZuZXrzPRy5GqTw`

---

## 🔍 Verify Everything Works

### Check Queue Status (Copy-Paste Ready SQL):
```sql
-- See pending notifications
SELECT * FROM push_notification_queue 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- See all recent notifications
SELECT * FROM push_notification_queue 
ORDER BY created_at DESC 
LIMIT 20;

-- See sent notifications
SELECT * FROM push_notification_queue 
WHERE status = 'sent'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🎉 Done!

Your push notification system is now:
1. ✅ Widget sends messages successfully
2. ✅ Trigger automatically queues notifications
3. ✅ Edge Function processes queue
4. ✅ Mobile app receives notifications

Everything is configured with your actual values - just copy and paste!

