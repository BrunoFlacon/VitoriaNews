async function testBothUrls() {
  const url1 = "https://ghtkdkauseesambzqfrd.supabase.co/storage/v1/object/sign/media/38cd9720-494e-406a-853d-19d81ae85e99/51411d45-49ec-49ef-b7d7-8390fe72bd32.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yZDcwMmViOC1kMGQwLTQ4MTYtYjcyZi00YjFmMmMzMTQ5MzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8zOGNkOTcyMC00OTRlLTQwNmEtODUzZC0xOWQ4MWFlODVlOTkvNTE0MTFkNDUtNDllYy00OWVmLWI3ZDctODM5MGZlNzJiZDMyLnBuZyIsImlhdCI6MTc4MDk4OTc4MSwiZXhwIjoxNzgxNTk0NTgxfQ.a1ZwWeOz95jsN9aK-OvFzO5dIYOi5sbY7gVkZI7w7Os";
  const url2 = "https://ghtkdkauseesambzqfrd.supabase.co/storage/v1/object/sign/media/38cd9720-494e-406a-853d-19d81ae85e99/cf580f5e-4f21-4710-864a-5747c883e3c1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yZDcwMmViOC1kMGQwLTQ4MTYtYjcyZi00YjFmMmMzMTQ5MzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8zOGNkOTcyMC00OTRlLTQwNmEtODUzZC0xOWQ4MWFlODVlOTkvY2Y1ODBmNWUtNGYyMS00NzEwLTg2NGEtNTc0N2M4ODNlM2MxLmpwZyIsImlhdCI6MTc4MDk3NzY0NiwiZXhwIjoxNzgxNTgyNDQ2fQ.IeQFXJy6mCHU0cbE0AGaKMI04hhRNoL4s3vBf7KkgjI";

  const publicUrl1 = url1.replace("/object/sign/", "/object/public/").split('?')[0];
  const publicUrl2 = url2.replace("/object/sign/", "/object/public/").split('?')[0];

  console.log("=== TESTING URL 1 ===");
  const res1 = await fetch(publicUrl1);
  console.log("URL 1:", publicUrl1);
  console.log("Status:", res1.status, res1.statusText, "Content-Type:", res1.headers.get("content-type"), "Size:", res1.headers.get("content-length"));

  console.log("\n=== TESTING URL 2 ===");
  const res2 = await fetch(publicUrl2);
  console.log("URL 2:", publicUrl2);
  console.log("Status:", res2.status, res2.statusText, "Content-Type:", res2.headers.get("content-type"), "Size:", res2.headers.get("content-length"));
}

testBothUrls();
