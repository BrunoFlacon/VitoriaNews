// deno-lint-ignore-file
// sync-google-contacts: Sync messaging members to Google Contacts (People API)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { members = [], googleToken } = await req.json().catch(() => ({}));
    
    if (!googleToken) {
      return new Response(JSON.stringify({ error: "Google OAuth token required. Please connect your Google account." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const results: any[] = [];

    for (const member of members) {
      try {
        // Build the Google Contact payload
        const contactBody: any = {
          names: member.full_name ? [{ displayName: member.full_name, givenName: member.first_name || member.full_name, familyName: member.last_name || "" }] : [],
          phoneNumbers: member.phone_number ? [{ value: member.phone_number, type: "mobile" }] : [],
          biographies: [{ value: `Sincronizado via Vitória Net Hub - ${member.platform} - @${member.username || ""}`, contentType: "TEXT_PLAIN" }],
          userDefined: [
            { key: "platform", value: member.platform },
            { key: "channel", value: member.channel_id || "" },
            { key: "role", value: member.role || "member" },
          ]
        };

        if (member.username) {
          contactBody.userDefined.push({ key: "username", value: `@${member.username}` });
        }

        let googleContactId = member.google_contact_id;
        let response;

        if (googleContactId) {
          // Update existing Google contact
          response = await fetch(`https://people.googleapis.com/v1/${googleContactId}:updateContact?updatePersonFields=names,phoneNumbers,biographies,userDefined`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(contactBody)
          });
        } else {
          // Create new Google Contact
          response = await fetch("https://people.googleapis.com/v1/people:createContact", {
            method: "POST",
            headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(contactBody)
          });
        }

        const data = await response.json();
        
        if (response.ok) {
          googleContactId = data.resourceName;
          
          // Update the local database with the google_contact_id
          await supabase
            .from("messaging_members")
            .upsert({
              user_id: user.id,
              channel_id: member.channel_id,
              platform: member.platform,
              phone_number: member.phone_number,
              username: member.username,
              full_name: member.full_name,
              first_name: member.first_name,
              last_name: member.last_name,
              profile_picture: member.profile_picture,
              role: member.role || "member",
              is_admin: member.is_admin || false,
              telegram_user_id: member.telegram_user_id || null,
              google_contact_id: googleContactId,
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id,platform,phone_number" });

          results.push({ member: member.full_name || member.phone_number, success: true, googleContactId });
        } else {
          results.push({ member: member.full_name || member.phone_number, success: false, error: data.error?.message });
        }
      } catch (err: any) {
        results.push({ member: member.full_name || member.phone_number, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
