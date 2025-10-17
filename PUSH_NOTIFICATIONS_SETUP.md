# Push Notifications Setup Guide

This guide explains how to set up push notifications for the Linquo mobile app using a dedicated `push_notifications` table.

## Architecture Overview

The push notification system uses a **separate table** (`push_notifications`) to store device tokens, ensuring no modifications to existing tables like `agents`.

### Database Schema

```sql
push_notifications
├── id (UUID, Primary Key)
├── agent_id (UUID, References agents)
├── user_id (UUID, References auth.users)
├── org_id (UUID, References organizations)
├── push_token (TEXT, Unique)
├── device_type (TEXT: 'ios' or 'android')
├── device_name (TEXT)
├── is_active (BOOLEAN, Default: true)
├── last_used_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Prerequisites

1. **Expo Account**: Create an account at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install EAS CLI globally
   ```bash
   npm install -g eas-cli
   ```
3. **Physical Device**: Push notifications only work on physical devices, not simulators/emulators

## Setup Steps

### 1. Initialize EAS Project

```bash
cd linquo-mobile-app
eas login
eas init
```

This will create a project and give you a **Project ID**. Copy this ID.

### 2. Update app.json

Replace `"your-project-id-here"` in `app.json` with your actual EAS Project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_ACTUAL_PROJECT_ID"
      }
    }
  }
}
```

### 3. Run Database Migrations

Run these migrations in your Supabase SQL Editor **in order**:

#### Migration 1: Create push_notifications table
```sql
-- File: supabase/migrations/create_push_notifications_table.sql
```

This creates:
- `push_notifications` table with all necessary columns
- Indexes for fast queries
- RLS policies for security
- Auto-update trigger for `updated_at`

#### Migration 2: Add push notification webhook
```sql
-- File: supabase/migrations/add_push_notification_webhook.sql
```

This creates:
- Database trigger that fires on new customer messages
- Calls Supabase Edge Function via `pg_net`

### 4. Enable pg_net Extension

In Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

This extension allows the database to make async HTTP requests to the Edge Function.

### 5. Deploy Supabase Edge Function

```bash
cd intercom-clone
supabase functions deploy send-push-notification
```

### 6. Set Supabase Configuration

In your Supabase project, go to **Database > Settings** and add these settings:

```sql
-- Set your Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://your-project.supabase.co';

-- Set your service role key (keep this secret!)
ALTER DATABASE postgres SET app.settings.service_role_key TO 'your-service-role-key';
```

**Alternative**: You can also set these in the Edge Function environment variables in the Supabase Dashboard.

### 7. Build and Test

#### For Development (Expo Go - Limited Push Notification Support)

```bash
cd linquo-mobile-app
npx expo start
```

**Note**: Expo Go has limited push notification support. For full testing, use a development build.

#### For Development Build (Recommended)

**Android**:
```bash
eas build --profile development --platform android
```

**iOS**:
```bash
eas build --profile development --platform ios
```

Install the development build on your physical device and run:
```bash
npx expo start --dev-client
```

#### For Production

**Android**:
```bash
eas build --profile production --platform android
```

**iOS**:
```bash
eas build --profile production --platform ios
```

## How It Works

### 1. **Token Registration Flow**

```
App Starts
    ↓
Request Notification Permissions
    ↓
Get Expo Push Token
    ↓
Fetch agent_id and org_id from agents table
    ↓
Insert/Update token in push_notifications table
    ↓
Token stored with device info
```

**Code**: `src/services/notificationService.ts` → `savePushTokenToDatabase()`

### 2. **Sending Notifications Flow**

```
Customer sends message
    ↓
Database INSERT trigger fires (messages table)
    ↓
Calls Supabase Edge Function via pg_net
    ↓
Edge Function queries push_notifications table
    ↓
Filters by org_id and is_active = true
    ↓
Sends to Expo Push Notification Service
    ↓
Updates last_used_at for successful sends
    ↓
Marks invalid tokens as is_active = false
```

**Code**: 
- Trigger: `supabase/migrations/add_push_notification_webhook.sql`
- Edge Function: `supabase/functions/send-push-notification/index.ts`

### 3. **Receiving Notifications**

- **App in Foreground**: Notification is shown as an in-app alert
- **App in Background**: Notification appears in the system tray
- **Tapping Notification**: Opens the app (can be configured to open specific conversation)

**Code**: `App.tsx` → `setupNotificationListeners()`

## Benefits of Separate Table

### ✅ Advantages

1. **No Schema Changes**: Existing `agents` table remains untouched
2. **Multiple Devices**: Each agent can have multiple devices (phone, tablet)
3. **Better Tracking**: Track device type, last used, active status
4. **Easy Cleanup**: Mark tokens inactive instead of deleting
5. **Audit Trail**: Know when tokens were created/updated
6. **Scalability**: Can add more fields without affecting agents table

### 📊 Example Data

```sql
-- Agent has 2 devices
push_notifications
├── iPhone 14 Pro (active)
└── iPad Air (inactive - uninstalled app)
```

## Testing Push Notifications

### Option 1: Test via Widget

1. Open the widget in a browser
2. Send a message as a customer
3. Check your mobile device for the push notification

### Option 2: Test via Expo Push Tool

1. Get your push token from the app logs
2. Go to [Expo Push Notification Tool](https://expo.dev/notifications)
3. Enter your token and send a test notification

### Option 3: Test via API

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "your-message-id",
    "conversation_id": "your-conversation-id"
  }'
```

### Option 4: Query Database

Check if tokens are being saved:

```sql
SELECT 
  pn.push_token,
  pn.device_type,
  pn.device_name,
  pn.is_active,
  pn.last_used_at,
  a.display_name as agent_name
FROM push_notifications pn
JOIN agents a ON a.id = pn.agent_id
WHERE pn.org_id = 'your-org-id'
ORDER BY pn.created_at DESC;
```

## Troubleshooting

### "Must use physical device for Push Notifications"
- Push notifications don't work on iOS Simulator or Android Emulator
- Use a real device for testing

### "Project ID not found"
- Make sure you've run `eas init` and updated `app.json` with the correct Project ID
- Restart the Metro bundler after updating `app.json`

### "Failed to get push token"
- Check that you've granted notification permissions
- Ensure you're using a development build (not Expo Go) for full support
- Check device settings to ensure notifications are enabled for the app

### "Notifications not arriving"
- Check that the push token is saved in the database:
  ```sql
  SELECT * FROM push_notifications WHERE is_active = true;
  ```
- Verify the Edge Function is deployed:
  ```bash
  supabase functions list
  ```
- Check Edge Function logs:
  ```bash
  supabase functions logs send-push-notification
  ```
- Ensure `pg_net` extension is enabled:
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'pg_net';
  ```
- Verify database settings are configured correctly

### "DeviceNotRegistered" or "InvalidCredentials" errors
- These tokens are automatically marked as `is_active = false`
- User needs to reinstall the app or re-login to get a new token
- Old tokens remain in database for audit purposes

### Token not being saved
- Check RLS policies are enabled
- Verify user is authenticated
- Check that agent exists for the user:
  ```sql
  SELECT * FROM agents WHERE user_id = 'your-user-id';
  ```

## Database Queries

### View all active tokens
```sql
SELECT 
  pn.*,
  a.display_name,
  o.name as org_name
FROM push_notifications pn
JOIN agents a ON a.id = pn.agent_id
JOIN organizations o ON o.id = pn.org_id
WHERE pn.is_active = true;
```

### Count tokens per organization
```sql
SELECT 
  o.name,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE pn.is_active) as active_tokens
FROM push_notifications pn
JOIN organizations o ON o.id = pn.org_id
GROUP BY o.id, o.name;
```

### Find inactive tokens older than 30 days
```sql
SELECT *
FROM push_notifications
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';
```

### Cleanup old inactive tokens
```sql
DELETE FROM push_notifications
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

## Production Considerations

1. **APNs (iOS)**:
   - For production iOS builds, you'll need an Apple Developer account
   - Configure APNs credentials in your Expo account

2. **FCM (Android)**:
   - For production Android builds, you may need to configure FCM
   - Expo handles this automatically for most cases

3. **Rate Limiting**:
   - Expo has rate limits on push notifications
   - Consider batching notifications or implementing a queue system for high-volume apps

4. **Token Cleanup**:
   - Implement a cron job to delete old inactive tokens (90+ days)
   - Keeps database size manageable

5. **Analytics**:
   - Track notification delivery rates
   - Monitor invalid token removal
   - Log notification open rates
   - Use `last_used_at` to identify stale tokens

6. **Multi-Device Support**:
   - Each agent can have multiple devices
   - All active devices receive notifications
   - Users can manage devices in settings (future feature)

## Files Created/Modified

### Mobile App
- `src/services/notificationService.ts` - Push notification service
- `App.tsx` - Integrated notification setup
- `app.json` - Added expo-notifications plugin

### Backend
- `supabase/migrations/create_push_notifications_table.sql` - New table schema
- `supabase/migrations/add_push_notification_webhook.sql` - Database trigger
- `supabase/functions/send-push-notification/index.ts` - Edge Function
- `src/app/api/notifications/send-push/route.ts` - Alternative Next.js API route

### No Changes To
- ❌ `agents` table - Completely untouched
- ❌ `organizations` table - No modifications
- ❌ Any other existing tables

## Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_net Documentation](https://supabase.com/docs/guides/database/extensions/pg_net)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
