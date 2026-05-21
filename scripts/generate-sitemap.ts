// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://vitoria-net.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yttsmficdfnbvvuhhdmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/news", changefreq: "hourly", priority: "0.9" },
  { path: "/manual", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/profile/bruno-flacon", changefreq: "weekly", priority: "0.6" },
];

async function fetchArticles(): Promise<SitemapEntry[]> {
  if (!SUPABASE_KEY) return [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .limit(5000);
    if (error || !data) return [];
    return data
      .filter((a: any) => !!a.slug)
      .map((a: any) => ({
        path: `/news/${a.slug}`,
        lastmod: a.updated_at ? new Date(a.updated_at).toISOString().split("T")[0] : undefined,
        changefreq: "weekly" as const,
        priority: "0.7",
      }));
  } catch (e) {
    console.warn("[sitemap] Could not load articles:", e);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const dynamicEntries = await fetchArticles();
  const entries = [...staticEntries, ...dynamicEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
})();
