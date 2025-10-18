// ============================================================================
// FCM V1 API - READY TO DEPLOY
// ============================================================================
// Copy this entire file to Supabase Dashboard > Edge Functions
// Function name: process-push-notifications
// NO environment variables needed - credentials are embedded
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Firebase Service Account Credentials
const FIREBASE_CONFIG = {
  project_id: "linquo-push-notifications",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrRLOQV/KUmk/M\nIPHR0+PaAECn05CPZjvl9/oM4vZ+pVgSKj6MOjhAX96R+Mnl7KgJDZhdBJ4VdYKj\nRP981AlFlzZS1saYBRqklJ6c1DNcd8Wsfe7EsC1dwIClJv40ul5P7BoL6oCE3rSp\n7kEzaqVtOvayWx37tq6/vWAPpOeWNl9fLc6w6jlFKu37Qze1icY2g7EkdNVTYHY9\nHXxYCAkjpZg+7MJo5CrgPZPBNlH5NwTQsnkeqJmflS9z8zFHxZlU6vnbOZJKlbyK\nGITrY774TaM4vDUcNF4MOsIt9oq+u7aO3UtaW2Veaq2HJ4KaRwjdA6fcLbcV1RYb\nqDzEC2CtAgMBAAECggEANV92FAQMYVoLhyI3Kfw99BiDDaoFUWL7RKn4P17VkVcm\nsJaAooOcNxeJTXU6OhB7t0KI2mgPecGCoi3k7rpHX2wFrmAnSIXCrUpxeY85qFXd\nAOnH6Hy8zowoqw8RRk5UCNUbst30CjQ7Gf/ZStQv1G/9JEz39ZMTN0alcoqh7zHk\nNmwaXYitUk7cqqlObQaG9fQdOnoa6zegg9fZUDYKqgEWUSO+6IKYLwFYFoLiuAP5\ngWMP0IkkJ00042YAIJd6oS1bRA2EoegKCd8x6Da2CSm/2r3uO7qhg3WG/U7cVOWp\nmM/HRmBV3+uongpp06WmIPF8Xqc+7sVfhHUctt2rkwKBgQDrRs2dSCUp60OzDJSi\nQ+NQj2lUT8rApZnXOzsBA2pEORwJ7rtdFgY48d7yV6HLJgDYfTPjCRsjzW2eT6w3\nXGHQs9tSuTcSZQsXltl873UBBi8CBlzRhnks+XTS0SWgc7/GexrD7gEUbCpGAVnm\n1v1OJZS9xrwMTIOgMaA7bpzBYwKBgQC6WpeMYi6sAJX2awTiHSLr/4vJJ0aOuVaj\n+kpalualldzzYgw0gStwClCtqRfeDFRLIbGZd6FEzh7D6wB7QAjS4Wa80Z2c2ju1\nYLub399YrJlrD13A6LsLZKxyU2+R5VQpmt8mj3K/zIWmtP08OThL7Bbvv2YgwvwC\nPa3d7H56rwKBgE5uKObwgOsLcWMDo5zAEsvtMsiXXNiBm9oi9ZVt5QPfIdixy6XJ\nTMO45YBV9Cp7fbatbhmWFIUH2y32E0vVMQpYmplmAtTP+DWh5NiAHrn7rLn5EwIJ\n2OVEN0x7yhZF370zloWQFq4PLLxvgN+x9XkSkBX/ZPqYmxxQzsBhLEJPAoGASOpn\nf+Nu1ZhJFSkcuQijgGn2HRgEEJZOY0zsyPNgfgvcb1K+6dBc2bL/jGOsVhLG7Lrb\nTew0KsLn4MrT3mXYzgKp+1mdbSEq2bZm0f/P2Vd3lB9oFLI7daLHotgowJJV0w2p\nIOJiCNASv37z0xukfnh7JQXkBQ+mIY5WuI3vkzsCgYEAy+QlmboPEXmICT3jNqin\niRB3JvDJc9I+3pj1ho+H6h7dd2Tl8FaETr/tECGgmrgVAQZYGc+EpMpWfNB6XE/E\nPSIZLsmd6oSpI5+QiGpXdr8FGRKaQsFQLWovpA+r4wKszREttjvxpF4LSFVLEW7t\nIur9rwGBn+lWh/zcKDfQNHc=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@linquo-push-notifications.iam.gserviceaccount.com"
};

// Get OAuth2 access token using service account
async function getAccessToken(): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: FIREBASE_CONFIG.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
  
  // Import private key
  const pemKey = FIREBASE_CONFIG.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${jwtHeader}.${jwtClaimSet}.${signatureBase64}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  return data.access_token;
}

// Send notification using FCM v1 API
async function sendFCMv1Notification(accessToken: string, deviceToken: string, title: string, body: string, data: any): Promise<boolean> {
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${FIREBASE_CONFIG.project_id}/messages:send`;
  
  const message = {
    message: {
      token: deviceToken,
      notification: {
        title: title,
        body: body
      },
      data: data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      }
    }
  };

  const response = await fetch(fcmEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  return response.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting FCM v1 push notification processing...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get OAuth2 access token
    console.log('🔑 Getting OAuth2 access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Processing ${pendingNotifications.length} notifications`);

    let successCount = 0;
    let failCount = 0;

    for (const notification of pendingNotifications) {
      try {
        const { data: deviceTokens, error: tokensError } = await supabaseClient
          .from('agent_device_tokens')
          .select('device_token, platform')
          .eq('agent_id', notification.agent_id)
          .eq('is_active', true);

        if (tokensError) throw tokensError;

        if (!deviceTokens || deviceTokens.length === 0) {
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: 'No device tokens found',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          failCount++;
          continue;
        }

        let allTokensFailed = true;
        
        for (const token of deviceTokens) {
          try {
            const success = await sendFCMv1Notification(
              accessToken,
              token.device_token,
              notification.title,
              notification.body,
              notification.data
            );

            if (success) {
              allTokensFailed = false;
              console.log(`✅ Sent to ${token.device_token.substring(0, 20)}...`);
            } else {
              console.error(`❌ Failed to send to token`);
              // Mark token as inactive if it fails
              await supabaseClient
                .from('agent_device_tokens')
                .update({ is_active: false })
                .eq('device_token', token.device_token);
            }
          } catch (error) {
            console.error(`Error sending to token:`, error);
          }
        }

        if (allTokensFailed) {
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: 'All tokens failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          failCount++;
        } else {
          const { error: updateError } = await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          
          if (updateError) {
            console.error('❌ Error updating notification status:', updateError);
          } else {
            console.log('✅ Marked notification as sent:', notification.id);
          }
          successCount++;
        }

      } catch (error) {
        const newRetryCount = (notification.retry_count || 0) + 1;
        const maxRetries = notification.max_retries || 3;
        const shouldRetry = newRetryCount < maxRetries;
        
        await supabaseClient
          .from('push_notification_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: newRetryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', notification.id);
        
        failCount++;
      }
    }

    const summary = {
      success: true,
      message: `Processed ${pendingNotifications.length} notifications`,
      details: {
        total: pendingNotifications.length,
        success: successCount,
        failed: failCount
      }
    };

    console.log('✅ Complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

