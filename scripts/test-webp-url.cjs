async function testWebpUrl() {
  const signedUrl = "https://ghtkdkauseesambzqfrd.supabase.co/storage/v1/object/sign/media/38cd9720-494e-406a-853d-19d81ae85e99/5141544c-8ea7-4a8f-9f4b-debb96be12b5.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yZDcwMmViOC1kMGQwLTQ4MTYtYjcyZi00YjFmMmMzMTQ5MzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8zOGNkOTcyMC00OTRlLTQwNmEtODUzZC0xOWQ4MWFlODVlOTkvNTE0MTU0NGMtOGVhNy00YThmLTlmNGItZGViYjk2YmUxMmI1LndlYnAiLCJpYXQiOjE3ODA5ODk4MTQsImV4cCI6MTc4MTU5NDYxNH0.MJwRfsYeL52-xha0EiaqyekF7_MA0t-9eQiocgP1onU";
  const publicUrl = signedUrl.replace("/object/sign/", "/object/public/").split('?')[0];

  console.log("Testing Converted WebP Public URL:", publicUrl);
  const res = await fetch(publicUrl);
  console.log("Status:", res.status, res.statusText, "Content-Type:", res.headers.get("content-type"), "Size:", res.headers.get("content-length"));
}

testWebpUrl();
