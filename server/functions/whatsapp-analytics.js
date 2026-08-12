// Stub: WhatsApp Analytics — real data requires Meta Cloud API + WABA
// In local mode, returns empty analytics to avoid crash.
// Shape matches WhatsAppMetrics interface in WhatsAppMetricsDashboard.tsx
export default async function whatsappAnalytics(ctx) {
  return {
    status: 200,
    body: {
      total: 0,
      period: "7d",
      byStatus: {},
      bySender: { bot: 0, human: 0 },
      conversations: 0,
      responseRate: 0,
      botzap: {
        enviadas: 0,
        respondidas: 0,
        apagadas: 0,
      },
      byConnection: {},
    },
  };
}
