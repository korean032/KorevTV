"use client";

import { useEffect, useRef, useState } from 'react';
import LiquidGlassContainer from './LiquidGlassContainer';

export default function WatchPartyControl() {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [connected, setConnected] = useState(false);
  const [followHost, setFollowHost] = useState(true);
  const esRef = useRef<EventSource | null>(null);
  const selfIdRef = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const suppressRef = useRef<boolean>(false);

  useEffect(() => {
    selfIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const connect = () => {
    if (!room) return;
    disconnect();
    const es = new EventSource(`/api/watchparty/events?room=${encodeURIComponent(room)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (!data || data.sender === selfIdRef.current) return;
        if (data.type === 'playback' && followHost) {
          const v = getVideo();
          if (!v) return;
          suppressRef.current = true;
          if (typeof data.payload?.time === 'number') {
            v.currentTime = data.payload.time;
          }
          if (data.payload?.state === 'play') {
            void v.play();
          } else if (data.payload?.state === 'pause') {
            v.pause();
          }
          setTimeout(() => (suppressRef.current = false), 300);
        }
      } catch {}
    };
    es.onerror = () => {
      // 自动重连由浏览器处理
    };
    esRef.current = es;
    setConnected(true);
    ensureVideoListeners();
  };

  const disconnect = () => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
  };

  const getVideo = (): HTMLVideoElement | null => {
    if (videoRef.current && document.contains(videoRef.current)) return videoRef.current;
    const v = document.querySelector('video');
    videoRef.current = v as HTMLVideoElement | null;
    return videoRef.current;
  };

  const ensureVideoListeners = () => {
    const v = getVideo();
    if (!v) return;
    const emit = (state: 'play' | 'pause' | 'seek') => {
      if (suppressRef.current) return;
      fetch('/api/watchparty/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room,
          type: 'playback',
          sender: selfIdRef.current,
          payload: { state, time: v.currentTime }
        })
      }).catch(() => {});
    };
    v.addEventListener('play', () => emit('play'));
    v.addEventListener('pause', () => emit('pause'));
    v.addEventListener('seeked', () => emit('seek'));
  };

  return (
    <LiquidGlassContainer
      className='px-3 py-2 flex items-center gap-2'
      roundedClass='rounded-full'
      intensity='medium'
      shadow='lg'
      border='subtle'
    >
      <span className='text-xs font-semibold text-gray-700 dark:text-gray-200'>一起观看</span>
      <input
        value={room}
        onChange={(e) => setRoom(e.target.value.trim())}
        placeholder='房间号'
        className='text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60'
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder='昵称'
        className='text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60'
      />
      {!connected ? (
        <button onClick={connect} className='text-xs px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700'>加入</button>
      ) : (
        <button onClick={disconnect} className='text-xs px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700'>离开</button>
      )}
      <label className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300'>
        <input type='checkbox' checked={followHost} onChange={(e) => setFollowHost(e.target.checked)} />
        跟随主机
      </label>
    </LiquidGlassContainer>
  );
}