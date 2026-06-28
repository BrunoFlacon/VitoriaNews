import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChannelState {
  refCount: number;
  channel: ReturnType<typeof supabase.channel>;
  errorCount: number;
  pollingActive: boolean;
  onErrorCallbacks: Set<() => void>;
  onSubscribedCallbacks: Set<() => void>;
}

const channels = new Map<string, ChannelState>();

export function useSharedChannel(
  channelName: string,
  setup: (channel: ReturnType<typeof supabase.channel>) => void,
  deps: any[]
) {
  const prevName = useRef<string | null>(null);

  useEffect(() => {
    let state = channels.get(channelName);
    if (!state) {
      const channel = supabase.channel(channelName);
      setup(channel);
      state = {
        refCount: 0,
        channel,
        errorCount: 0,
        pollingActive: false,
        onErrorCallbacks: new Set(),
        onSubscribedCallbacks: new Set(),
      };
      channels.set(channelName, state);
    }
    state.refCount++;

    return () => {
      state = channels.get(channelName);
      if (!state) return;
      state.refCount--;
      if (state.refCount <= 0) {
        supabase.removeChannel(state.channel).catch(() => {});
        channels.delete(channelName);
      }
    };
  }, deps);
}

export function useChannelError(channelName: string | null, onError: () => void, onSubscribed: () => void) {
  useEffect(() => {
    if (!channelName) return;
    const state = channels.get(channelName);
    if (!state) return;
    state.onErrorCallbacks.add(onError);
    state.onSubscribedCallbacks.add(onSubscribed);
    return () => {
      state.onErrorCallbacks.delete(onError);
      state.onSubscribedCallbacks.delete(onSubscribed);
    };
  }, [channelName, onError, onSubscribed]);
}

export function notifyChannelError(channelName: string) {
  const state = channels.get(channelName);
  if (!state) return;
  state.errorCount++;
  state.onErrorCallbacks.forEach(cb => cb());
}

export function notifyChannelSubscribed(channelName: string) {
  const state = channels.get(channelName);
  if (!state) return;
  state.errorCount = 0;
  state.onSubscribedCallbacks.forEach(cb => cb());
}

export function isChannelHealthy(channelName: string): boolean {
  const state = channels.get(channelName);
  return state ? state.errorCount === 0 : false;
}

export function getChannelRefCount(channelName: string): number {
  const state = channels.get(channelName);
  return state ? state.refCount : 0;
}
