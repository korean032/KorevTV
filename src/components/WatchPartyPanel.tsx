"use client";

import { useEffect, useRef, useState } from 'react';
import LiquidGlassContainer from './LiquidGlassContainer';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

type ChatMsg = { id: string; sender?: string; text: string; ts: number };

export default function WatchPartyPanel() {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [connected, setConnected] = useState(false);
  const [followHost, setFollowHost] = useState(true);
  const [members, setMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState('');

  const esRef = useRef<EventSource | null>(null);
  const selfIdRef = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const suppressRef = useRef<boolean>(false);

  useEffect(() => {
    selfIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 从 URL 读取房间和昵称（支持邀请链接：?room=xxx&name=yyy）
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get('room');
      const n = sp.get('name');
      if (r) setRoom(r);
      if (n) setName(n);
      // 从登录信息读取用户名作为默认昵称
      const auth = getAuthInfoFromBrowserCookie();
      if (auth?.username) setName(auth.username);
    } catch {}
  }, []);

  const getVideo = (): HTMLVideoElement | null => {
    if (videoRef.current && document.contains(videoRef.current)) return videoRef.current;
    const v = document.querySelector('video');
    videoRef.current = v as HTMLVideoElement | null;
    return videoRef.current;
  };

  const emit = (type: string, payload: Record<string, unknown>) => {
    if (!room) return;
    fetch('/api/watchparty/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, type, sender: selfIdRef.current, payload })
    }).catch(() => {});
  };

  const connect = () => {
    if (!room) {
      // 如果用户未填写，自动生成一个临时房间号
      setRoom((prev) => {
        if (prev && prev.length > 0) return prev;
        const generated = generateRoomId();
        return generated;
      });
    }
    disconnect();
    const targetRoom = room || generateRoomId();
    const es = new EventSource(`/api/watchparty/events?room=${encodeURIComponent(targetRoom)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (!data) return;
        if (data.type === 'playback' && followHost) {
          if (data.sender === selfIdRef.current) return;
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
        } else if (data.type === 'presence') {
          const memberName = (data.payload?.name as string) || '未知用户';
          if (data.payload?.action === 'join') {
            setMembers((prev) => (prev.includes(memberName) ? prev : [...prev, memberName]));
          } else if (data.payload?.action === 'leave') {
            setMembers((prev) => prev.filter((m) => m !== memberName));
          }
        } else if (data.type === 'sync-request') {
          // 新成员请求同步，响应当前状态
          const v = getVideo();
          if (v) {
            emit('sync', { time: v.currentTime, state: v.paused ? 'pause' : 'play' });
          }
        } else if (data.type === 'sync' && followHost) {
          if (data.sender === selfIdRef.current) return;
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
        } else if (data.type === 'chat') {
          const msg: ChatMsg = {
            id: `${data.ts}-${Math.random().toString(36).slice(2, 6)}`,
            sender: data.sender,
            text: String(data.payload?.text || ''),
            ts: data.ts || Date.now()
          };
          setMessages((prev) => [...prev.slice(-50), msg]);
        }
      } catch {}
    };
    es.onerror = () => {
      // 浏览器自动重连
    };
    esRef.current = es;
    setConnected(true);
    // 广播加入并请求同步
    emit('presence', { action: 'join', name });
    emit('sync-request', { requester: selfIdRef.current });
    ensureVideoListeners();
  };

  const disconnect = () => {
    if (connected) {
      emit('presence', { action: 'leave', name });
    }
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
  };

  const ensureVideoListeners = () => {
    const v = getVideo();
    if (!v) return;
    const onPlay = () => {
      if (suppressRef.current) return;
      emit('playback', { state: 'play', time: v.currentTime });
    };
    const onPause = () => {
      if (suppressRef.current) return;
      emit('playback', { state: 'pause', time: v.currentTime });
    };
    const onSeeked = () => {
      if (suppressRef.current) return;
      emit('playback', { state: 'seek', time: v.currentTime });
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('seeked', onSeeked);
    // 定期同步进度（每2秒，避免过于频繁）
    let lastEmit = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastEmit > 2000 && !suppressRef.current) {
        lastEmit = now;
        emit('playback', { state: v.paused ? 'pause' : 'play', time: v.currentTime });
      }
    };
    v.addEventListener('timeupdate', onTimeUpdate);
  };

  const sendChat = () => {
    if (!chatText.trim()) return;
    emit('chat', { text: chatText.trim(), name });
    setChatText('');
  };

  const generateRoomId = () => {
    // 生成 6 位房间号：字母数字混合
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  };

  const createRoom = () => {
    const id = generateRoomId();
    setRoom(id);
  };

  const copyInvite = async () => {
    try {
      const url = new URL(window.location.href);
      const sp = new URLSearchParams(url.search);
      if (room) sp.set('room', room);
      if (name) sp.set('name', name);
      url.search = sp.toString();
      const invite = url.toString();
      await navigator.clipboard.writeText(invite);
      setMessages((prev) => [...prev.slice(-50), { id: `sys-${Date.now()}`, text: '已复制邀请链接', ts: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev.slice(-50), { id: `sys-${Date.now()}`, text: '复制失败，请手动复制地址栏', ts: Date.now() }]);
    }
  };

  return (
    <div className='space-y-3'>
      <LiquidGlassContainer className='px-3 py-2 flex items-center gap-2' roundedClass='rounded-full' intensity='medium' shadow='lg' border='subtle'>
        <span className='text-xs font-semibold text-gray-700 dark:text-gray-200'>一起观看</span>
        <input value={room} onChange={(e) => setRoom(e.target.value.trim())} placeholder='房间号' className='text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60' />
        <input value={name} readOnly placeholder='昵称（自动使用登录名称）' className='text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60' />
        <button onClick={createRoom} className='text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700'>生成房间号</button>
        <button onClick={copyInvite} className='text-xs px-3 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-800'>复制邀请</button>
        {!connected ? (
          <button onClick={connect} className='text-xs px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700'>加入/创建</button>
        ) : (
          <button onClick={disconnect} className='text-xs px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700'>离开</button>
        )}
        <label className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300'>
          <input type='checkbox' checked={followHost} onChange={(e) => setFollowHost(e.target.checked)} />
          跟随主机
        </label>
        <span className='ml-auto text-xs text-gray-600 dark:text-gray-400'>成员：{members.length}</span>
      </LiquidGlassContainer>

      <LiquidGlassContainer className='px-3 py-2' roundedClass='rounded-2xl' intensity='medium' shadow='lg' border='subtle'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          <div className='md:col-span-1'>
            <div className='text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2'>在线成员</div>
            <ul className='space-y-1'>
              {members.length === 0 && <li className='text-xs text-gray-500 dark:text-gray-400'>暂无成员</li>}
              {members.map((m, i) => (
                <li key={`${m}-${i}`} className='text-xs text-gray-800 dark:text-gray-100'>{m}</li>
              ))}
            </ul>
          </div>
          <div className='md:col-span-3'>
            <div className='text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2'>聊天</div>
            <div className='h-32 overflow-y-auto rounded-md bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/40 p-2'>
              {messages.length === 0 && <div className='text-xs text-gray-500 dark:text-gray-400'>暂无消息</div>}
              {messages.map((msg) => (
                <div key={msg.id} className='text-xs text-gray-800 dark:text-gray-100'>
                  <span className='font-semibold'>{msg.sender ? String(msg.sender).slice(0, 6) : '匿名'}</span>: {msg.text}
                </div>
              ))}
            </div>
            <div className='mt-2 flex items-center gap-2'>
              <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder='输入消息' className='flex-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60' />
              <button onClick={sendChat} className='text-xs px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700'>发送</button>
            </div>
          </div>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}