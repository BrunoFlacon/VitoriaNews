// Stub: YouTube Analytics — requires YouTube Data API v3 with OAuth
// In local mode, returns empty result to avoid 404.
export default async function collectYoutubeAnalytics(ctx) {
  return {
    status: 200,
    body: {
      data: {
        collected: false,
        message: "YouTube analytics collection not available in local mode.",
        metrics: null,
      },
    },
  };
}
