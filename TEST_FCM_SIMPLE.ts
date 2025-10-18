// ============================================================================
// SIMPLE FCM V1 TEST - For Debugging
// ============================================================================
// This is a simplified version to test FCM v1 API
// Deploy this temporarily to see detailed error logs
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const FIREBASE_CONFIG = {
  project_id: "linquo-push-notifications",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrRLOQV/KUmk/M\nIPHR0+PaAECn05CPZjvl9/oM4vZ+pVgSKj6MOjhAX96R+Mnl7KgJDZhdBJ4VdYKj\nRP981AlFlzZS1saYBRqklJ6c1DNcd8Wsfe7EsC1dwIClJv40ul5P7BoL6oCE3rSp\n7kEzaqVtOvayWx37tq6/vWAPpOeWNl9fLc6w6jlFKu37Qze1icY2g7EkdNVTYHY9\nHXxYCAkjpZg+7MJo5CrgPZPBNlH5NwTQsnkeqJmflS9z8zFHxZlU6vnbOZJKlbyK\nGITrY774TaM4vDUcNF4MOsIt9oq+u7aO3UtaW2Veaq2HJ4KaRwjdA6fcLbcV1RYb\nqDzEC2CtAgMBAAECggEANV92FAQMYVoLhyI3Kfw99BiDDaoFUWL7RKn4P17VkVcm\nsJaAooOcNxeJTXU6OhB7t0KI2mgPecGCoi3k7rpHX2wFrmAnSIXCrUpxeY85qFXd\nAOnH6Hy8zowoqw8RRk5UCNUbst30CjQ7Gf/ZStQv1G/9JEz39ZMTN0alcoqh7zHk\nNmwaXYitUk7cqqlObQaG9fQdOnoa6zegg9fZUDYKqgEWUSO+6IKYLwFYFoLiuAP5\ngWMP0IkkJ00042YAIJd6oS1bRA2EoegKCd8x6Da2CSm/2r3uO7qhg3WG/U7cVOWp\nmM/HRmBV3+uongpp06WmIPF8Xqc+7sVfhHUctt2rkwKBgQDrRs2dSCUp60OzDJSi\nQ+NQj2lUT8rApZnXOzsBA2pEORwJ7rtdFgY48d7yV6HLJgDYfTPjCRsjzW2eT6w3\nXGHQs9tSuTcSZQsXltl873UBBi8CBlzRhnks+XTS0SWgc7/GexrD7gEUbCpGAVnm\n1v1OJZS9xrwMTIOgMaA7bpzBYwKBgQC6WpeMYi6sAJX2awTiHSLr/4vJJ0aOuVaj\n+kpalualldzzYgw0gStwClCtqRfeDFRLIbGZd6FEzh7D6wB7QAjS4Wa80Z2c2ju1\nYLub399YrJlrD13A6LsLZKxyU2+R5VQpmt8mj3K/zIWmtP08OThL7Bbvv2YgwvwC\nPa3d7H56rwKBgE5uKObwgOsLcWMDo5zAEsvtMsiXXNiBm9oi9ZVt5QPfIdixy6XJ\nTMO45YBV9Cp7fbatbhmWFIUH2y32E0vVMQpYmplmAtTP+DWh5NiAHrn7rLn5EwIJ\n2OVEN0x7yhZF370zloWQFq4PLLxvgN+x9XkSkBX/ZPqYmxxQzsBhLEJPAoGASOpn\nf+Nu1ZhJFSkcuQijgGn2HRgEEJZOY0zsyPNgfgvcb1K+6dBc2bL/jGOsVhLG7Lrb\nTew0KsLn4MrT3mXYzgKp+1mdbSEq2bZm0f/P2Vd3lB9oFLI7daLHotgowJJV0w2p\nIOJiCNASv37z0xukfnh7JQXkBQ+mIY5WuI3vkzsCgYEAy+QlmboPEXmICT3jNqin\niRB3JvDJc9I+3pj1ho+H6h7dd2Tl8FaETr/tECGgmrgVAQZYGc+EpMpWfNB6XE/E\nPSIZLsmd6oSpI5+QiGpXdr8FGRKaQsFQLWovpA+r4wKszREttjvxpF4LSFVLEW7t\nIur9rwGBn+lWh/zcKDfQNHc=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@linquo-push-notifications.iam.gserviceaccount.com"
};

async function getAccessToken(): Promise<string> {
  console.log('🔑 Getting access token...');
  
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: FIREBASE_CONFIG.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
  
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

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  console.log('✅ Access token obtained');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting test...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getAccessToken();

    // Get ONE pending notification
    const { data: notifications } = await supabaseClient
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No pending notifications' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const notification = notifications[0];
    console.log('📨 Processing notification:', notification.id);

    // Get device token
    const { data: tokens } = await supabaseClient
      .from('agent_device_tokens')
      .select('*')
      .eq('agent_id', notification.agent_id)
      .eq('is_active', true)
      .limit(1);

    if (!tokens || tokens.length === 0) {
      console.log('❌ No device tokens found');
      return new Response(JSON.stringify({ success: false, error: 'No device tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const deviceToken = tokens[0].device_token;
    console.log('📱 Sending to token:', deviceToken.substring(0, 30) + '...');

    // Send FCM v1 notification
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_CONFIG.project_id}/messages:send`;
    
    const fcmMessage = {
      message: {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          test: 'true',
          message_id: notification.message_id || 'test'
        }
      }
    };

    console.log('📤 Sending FCM request...');
    console.log('URL:', fcmUrl);
    console.log('Message:', JSON.stringify(fcmMessage, null, 2));

    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmMessage)
    });

    const fcmData = await fcmResponse.text();
    console.log('FCM Response Status:', fcmResponse.status);
    console.log('FCM Response Body:', fcmData);

    if (fcmResponse.ok) {
      console.log('✅ Notification sent successfully!');
      await supabaseClient
        .from('push_notification_queue')
        .update({ status: 'sent', processed_at: new Date().toISOString() })
        .eq('id', notification.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification sent!',
        fcmResponse: fcmData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('❌ FCM Error:', fcmData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'FCM error',
        fcmResponse: fcmData,
        status: fcmResponse.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

