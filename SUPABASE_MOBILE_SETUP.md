# Supabase Mobile OAuth Setup

## Quick Fix for Google OAuth Redirect Issue

The Google OAuth is redirecting to your web app instead of the mobile app because the mobile deep link isn't configured in your Supabase project settings.

### Steps to Fix:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your Linquo project

2. **Navigate to Authentication Settings**
   - Go to `Authentication` → `Providers`
   - Click on `Google` provider

3. **Add Mobile Redirect URL**
   - In the "Redirect URLs" section, add:
   ```
   linquo://auth/callback
   ```
   - Make sure to keep your existing web app URL as well:
   ```
   https://admin.linquo.app/auth/callback
   ```

4. **Save the changes**

### Current Redirect URLs Should Include:
- `https://admin.linquo.app/auth/callback` (for web app)
- `linquo://auth/callback` (for mobile app)

### After Adding the Mobile URL:
- The Google OAuth will properly redirect back to your mobile app
- Users will be automatically logged in after Google authentication
- The deep link handler in the app will process the OAuth callback

### Alternative Temporary Solution:
If you can't access the Supabase dashboard right now, the current implementation will:
1. Show an alert explaining the process
2. Open Google OAuth in the browser
3. User completes authentication on web
4. User manually returns to the app
5. App will detect the session and log them in

The proper fix is to add the mobile redirect URL to your Supabase settings as described above.
