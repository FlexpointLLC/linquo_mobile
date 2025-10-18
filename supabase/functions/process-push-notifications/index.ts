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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY not found in environment variables');
    }

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
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

    console.log(`Processing ${pendingNotifications.length} pending notifications`);

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Get device tokens for the agent from agent_device_tokens table
        const { data: deviceTokens, error: tokensError } = await supabaseClient
          .from('agent_device_tokens')
          .select('device_token, platform')
          .eq('agent_id', notification.agent_id)
          .eq('is_active', true);

        if (tokensError) {
          throw tokensError;
        }

        if (!deviceTokens || deviceTokens.length === 0) {
          // No device tokens, mark as failed
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: 'No device tokens found',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          continue;
        }

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
              console.log(`Notification sent successfully to token: ${token.device_token}`);
            } else {
              const errorText = await response.text();
              console.error(`FCM error for token ${token.device_token}:`, errorText);
              
              // If token is invalid, mark it as inactive
              if (response.status === 400 || response.status === 404) {
                await supabaseClient
                  .from('agent_device_tokens')
                  .update({ is_active: false })
                  .eq('device_token', token.device_token);
              }
            }
          } catch (error) {
            console.error(`Error sending notification to token ${token.device_token}:`, error);
          }
        }

        // Mark notification as sent or failed
        if (allTokensFailed) {
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: 'All device tokens failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        } else {
          await supabaseClient
            .from('push_notification_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingNotifications.length} notifications`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in process-push-notifications function:', error);
    
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
