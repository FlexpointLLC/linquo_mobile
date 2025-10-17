import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface GoogleAuthCallbackResult {
  success: boolean;
  error?: string;
  user?: User | null;
  needsOrganizationSetup?: boolean;
}

interface CreateOrganizationResult {
  success: boolean;
  error?: string;
  orgId?: string;
}

export const handleGoogleAuthCallback = async (): Promise<GoogleAuthCallbackResult> => {
  try {
    // First check for session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return { success: false, error: sessionError.message || "Failed to get session after Google auth" };
    }

    if (!session) {
      return { success: false, error: "No active session found after Google auth" };
    }

    // Then get user from session
    const user = session.user;
    
    if (!user) {
      return { success: false, error: "No user found in session after Google auth" };
    }

    const isGoogleUser = user.app_metadata?.provider === 'google' || 
                         user.app_metadata?.providers?.includes('google');
    
    if (!isGoogleUser) {
      return { success: true, user, needsOrganizationSetup: false }; // Not a Google user, no special setup needed
    }

    const { data: existingAgent, error: agentCheckError } = await supabase
      .from("agents")
      .select("id, org_id")
      .eq("user_id", user.id)
      .single();

    if (agentCheckError && agentCheckError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      return { success: false, error: agentCheckError.message };
    }

    if (existingAgent) {
      return { success: true, user, needsOrganizationSetup: false }; // Agent already exists, no setup needed
    } else {
      return { success: true, user, needsOrganizationSetup: true }; // New Google user, needs organization setup
    }

  } catch (error: any) {
    return { success: false, error: error.message || "Error processing Google auth callback" };
  }
};

export const createDefaultOrganizationForGoogleUser = async (user: User): Promise<CreateOrganizationResult> => {
  try {
    const userMetadata = user.user_metadata;
    const fullName = userMetadata?.full_name || userMetadata?.name || 'New Agent';
    const email = user.email;

    if (!email) {
      throw new Error('User email not found for organization creation.');
    }

    // Create Organization
    const organizationData = {
      name: `${fullName}'s Organization`,
      slug: `${fullName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').trim()}-${Math.random().toString(36).substring(2, 7)}`,
      brand_color: '#3B82F6',
      widget_text_line1: 'Hello there',
      widget_text_line2: 'How can we help?',
      widget_icon_alignment: 'right',
      widget_show_branding: true,
      widget_open_on_load: false,
      chat_header_name: 'Support Team',
      chat_header_subtitle: 'Typically replies within 1 min',
      widget_button_text: 'Start Chat'
    };

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert(organizationData)
      .select('*')
      .single();

    if (orgError) {
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }
    if (!orgData) {
      throw new Error('Failed to create organization - no data returned');
    }

    // Create Agent Record
    const agentData = {
      user_id: user.id,
      display_name: fullName,
      email: email,
      online_status: 'OFFLINE',
      org_id: orgData.id,
      role: 'OWNER'
    };

    const { data: agentRecord, error: agentError } = await supabase
      .from('agents')
      .insert(agentData)
      .select('*')
      .single();

    if (agentError) {
      throw new Error(`Failed to create agent: ${agentError.message}`);
    }
    if (!agentRecord) {
      throw new Error('Failed to create agent - no data returned');
    }

    // Create Role and Role Assignment (non-critical)
    try {
      const roleData = {
        org_id: orgData.id,
        role_key: 'OWNER',
        permissions: {
          'agents:read': true, 'agents:write': true, 'agents:delete': true,
          'customers:read': true, 'customers:write': true, 'customers:delete': true,
          'conversations:read': true, 'conversations:write': true, 'conversations:delete': true,
          'messages:read': true, 'messages:write': true, 'messages:delete': true,
          'settings:read': true, 'settings:write': true
        }
      };

      const { data: roleRecord, error: roleError } = await supabase
        .from('roles')
        .insert(roleData)
        .select('*')
        .single();

      if (!roleError && roleRecord) {
        const assignmentData = {
          org_id: orgData.id,
          agent_id: agentRecord.id,
          role_id: roleRecord.id,
        };
        await supabase.from('agent_role_assignments').insert(assignmentData);
      }
    } catch (roleError) {
      console.warn('Role creation failed (non-critical):', roleError);
    }

    return { success: true, orgId: orgData.id };

  } catch (error: any) {
    console.error('Error creating default organization for Google user:', error);
    return { success: false, error: error.message || "Failed to create default organization" };
  }
};
