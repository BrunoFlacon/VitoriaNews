async function testPublicUrl() {
  const signedUrl = "https://ghtkdkauseesambzqfrd.supabase.co/storage/v1/object/sign/media/38cd9720-494e-406a-853d-19d81ae85e99/51411d45-49ec-49ef-b7d7-8390fe72bd32.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yZDcwMmViOC1kMGQwLTQ4MTYtYjcyZi00YjFmMmMzMTQ5MzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8zOGNkOTcyMC00OTRlLTQwNmEtODUzZC0xOWQ4MWFlODVlOTkvNTE0MTFkNDUtNDllYy00OWVmLWI3ZDctODM5MGZlNzJiZDMyLnBuZyIsImlhdCI6MTc4MDk4OTc4MSwiZXhwIjoxNzgxNTk0NTgxfQ.a1ZwWeOz95jsN9aK-OvFzO5dIYOi5sbY7gVkZI7w7Os";
  const publicUrl = signedUrl.replace("/object/sign/", "/object/public/").split('?')[0];

  console.log("Testing Signed URL:", signedUrl);
  const res1 = await fetch(signedUrl);
  console.log("Signed URL Status:", res1.status, res1.statusText);

  console.log("Testing Converted Public URL:", publicUrl);
  const res2 = await fetch(publicUrl);
  console.log("Public URL Status:", res2.status, res2.statusText, "Content-Type:", res2.headers.get("content-type"), "Content-Length:", res2.headers.get("content-length"));
}

testPublicUrl();
