export interface LiveStreamPayload {
  platform: 'youtube' | 'facebook';
  title: string;
  description?: string;
}

export async function createLiveStream(payload: LiveStreamPayload): Promise<any> {
  // console.log('Creating live stream on:', payload.platform, payload);
  return {
    success: true,
    platform: payload.platform,
    stream_key: `live_${Math.random().toString(36).substring(7)}`,
    playback_url: `https://${payload.platform}.com/live/some_id`,
    timestamp: new Date().toISOString()
  };
}
