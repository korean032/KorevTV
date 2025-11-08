import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Client = {
  room: string;
  enqueue: (msg: string) => void;
  close: () => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __WATCHPARTY_CHANNEL__: {
    rooms: Map<string, Set<Client>>;
  } | undefined;
}

function getChannel() {
  if (!global.__WATCHPARTY_CHANNEL__) {
    global.__WATCHPARTY_CHANNEL__ = {
      rooms: new Map<string, Set<Client>>()
    };
  }
  return global.__WATCHPARTY_CHANNEL__;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || 'default';
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (data: unknown) => {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };
      const close = () => {
        controller.close();
      };

      const client: Client = { room, enqueue, close };
      const channel = getChannel();
      if (!channel.rooms.has(room)) channel.rooms.set(room, new Set<Client>());
      channel.rooms.get(room)!.add(client);

      // 初始欢迎与心跳
      enqueue({ type: 'joined', room });
      const ping = setInterval(() => enqueue({ type: 'ping', t: Date.now() }), 30000);

      // 当连接关闭时，清理
      const signal = request.signal as AbortSignal;
      signal.addEventListener('abort', () => {
        clearInterval(ping);
        channel.rooms.get(room)?.delete(client);
        close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}