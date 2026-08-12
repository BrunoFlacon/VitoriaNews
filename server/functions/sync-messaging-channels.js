// Stub: Sync Messaging Channels
// This function syncs messaging channels from external platforms.
// In local mode, returns empty result to avoid 404.
export default async function syncMessagingChannels(ctx) {
  return {
    status: 200,
    body: {
      success: true,
      data: {
        synced: false,
        message: "sync-messaging-channels not available in local mode.",
        channels: [],
        count: 0,
      },
    },
  };
}
