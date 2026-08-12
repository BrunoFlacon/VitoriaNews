// Stub: Google Analytics — requires Google Analytics Data API v1 with OAuth
// In local mode, returns empty result to avoid 404.
export default async function collectGoogleAnalytics(ctx) {
  return {
    status: 200,
    body: {
      data: {
        collected: false,
        message: "Google Analytics collection not available in local mode.",
        metrics: null,
      },
    },
  };
}
