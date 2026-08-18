const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all Instagram connections...");
  const { data: connections, error } = await supabase
    .from('social_connections')
    .select('*')
    .eq('platform', 'instagram')
    .eq('is_connected', true);

  if (error) {
    console.error("Error fetching connections:", error);
    return;
  }

  console.log(`Found ${connections.length} connected Instagram accounts.`);

  for (const conn of connections) {
    if (!conn.access_token || !conn.platform_user_id) continue;

    console.log(`Updating ${conn.page_name || conn.platform_user_id}...`);
    try {
      const igUserId = conn.platform_user_id;
      const fields = "profile_picture_url,username,name";
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`
      );
      const data = await res.json();

      if (data && data.profile_picture_url) {
        const profilePic = data.profile_picture_url;
        
        console.log(`Found new picture URL for ${data.username || igUserId}`);
        
        // Optionally upload to Supabase Storage to prevent expiration
        let finalUrl = profilePic;
        try {
          const imgResp = await fetch(profilePic);
          if (imgResp.ok) {
            const imgBlob = await imgResp.blob();
            const ext = "jpg";
            const fileName = `instagram/${igUserId}.${ext}`;
            
            // For Node.js fetch blob, we might need an array buffer
            const arrayBuffer = await imgBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('profile-photos')
              .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

            if (!uploadError) {
              const { data: pubUrlData } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(fileName);
              finalUrl = pubUrlData.publicUrl;
              console.log(`Successfully uploaded to storage: ${finalUrl}`);
            } else {
              console.error(`Storage upload error:`, uploadError);
            }
          }
        } catch (storageErr) {
          console.error("Error uploading to storage:", storageErr.message);
        }

        // Update social_connections
        await supabase
          .from('social_connections')
          .update({ profile_image_url: finalUrl })
          .eq('id', conn.id);

        // Update social_accounts
        await supabase
          .from('social_accounts')
          .update({ profile_picture: finalUrl })
          .eq('platform', 'instagram')
          .eq('platform_user_id', igUserId);

        console.log(`Updated successfully.`);
      } else {
        console.log(`No profile_picture_url returned for ${igUserId}`, data);
      }
    } catch (e) {
      console.error(`Error processing ${conn.platform_user_id}:`, e.message);
    }
  }
  console.log("Done!");
}

run();
