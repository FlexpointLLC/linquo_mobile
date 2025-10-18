// ============================================================================
// COPY THIS ENTIRE FILE TO SUPABASE DASHBOARD
// Function Name: process-push-notifications
// Environment Variable: FCM_SERVER_KEY = BNqvFcZTldTVHxfjZYLPOsYTVSy8iMDhjjQoHnZ4kqWyhdqmQEOr1uaqsD_ag1AJWqXhdFMGC1MiIFZksIFMLGY
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting push notification processing...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY not found');
    }

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
            const fcmPayload = {
              to: token.device_token,
              notification: {
                title: notification.title,
                body: notification.body,
                icon: 'ic_notification',
                sound: 'default'
              },
              data: notification.data || {},
              priority: 'high',
              content_available: true
            };

            const response = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Authorization': `key=${fcmServerKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fcmPayload)
            });

            if (response.ok) {
              allTokensFailed = false;
              console.log(`✅ Sent to ${token.device_token.substring(0, 20)}...`);
            } else {
              const errorText = await response.text();
              console.error(`❌ FCM error:`, errorText);
              
              if (response.status === 400 || response.status === 404) {
                await supabaseClient
                  .from('agent_device_tokens')
                  .update({ is_active: false })
                  .eq('device_token', token.device_token);
              }
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
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
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
            error_message: error.message,
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
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

