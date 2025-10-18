// ============================================================================
// READY TO DEPLOY: process-push-notifications Edge Function
// ============================================================================
// Copy this entire file content to Supabase Dashboard > Edge Functions
// Function name: process-push-notifications
// Environment variable needed: FCM_SERVER_KEY
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Starting push notification processing...');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      console.error('❌ FCM_SERVER_KEY not found in environment');
      throw new Error('FCM_SERVER_KEY not found in environment variables');
    }

    console.log('✅ FCM Server Key found');

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('ℹ️ No pending notifications found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending notifications found'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log(`📨 Processing ${pendingNotifications.length} pending notifications`);

    let successCount = 0;
    let failCount = 0;

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        console.log(`🔄 Processing notification ${notification.id} for agent ${notification.agent_id}`);
        
        // Get device tokens for the agent from agent_device_tokens table
        const { data: deviceTokens, error: tokensError } = await supabaseClient
          .from('agent_device_tokens')
          .select('device_token, platform')
          .eq('agent_id', notification.agent_id)
          .eq('is_active', true);

        if (tokensError) {
          console.error(`❌ Error fetching tokens for agent ${notification.agent_id}:`, tokensError);
          throw tokensError;
        }

        if (!deviceTokens || deviceTokens.length === 0) {
          console.log(`⚠️ No device tokens found for agent ${notification.agent_id}`);
          // No device tokens, mark as failed
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

        console.log(`📱 Found ${deviceTokens.length} device tokens for agent`);

        // Send push notification to each device token
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

            console.log(`📤 Sending to token: ${token.device_token.substring(0, 20)}...`);

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
              console.log(`✅ Notification sent successfully to token`);
            } else {
              const errorText = await response.text();
              console.error(`❌ FCM error for token:`, errorText);
              
              // If token is invalid, mark it as inactive
              if (response.status === 400 || response.status === 404) {
                console.log(`🗑️ Marking token as inactive`);
                await supabaseClient
                  .from('agent_device_tokens')
                  .update({ is_active: false })
                  .eq('device_token', token.device_token);
              }
            }
          } catch (error) {
            console.error(`❌ Error sending to token:`, error);
          }
        }

        // Mark notification as sent or failed
        if (allTokensFailed) {
          console.log(`❌ All tokens failed for notification ${notification.id}`);
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: 'All device tokens failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          failCount++;
        } else {
          console.log(`✅ Notification ${notification.id} sent successfully`);
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
        console.error(`❌ Error processing notification ${notification.id}:`, error);
        
        // Mark as failed and increment retry count
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

    console.log('✅ Processing complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ Fatal error in push-notifications function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

