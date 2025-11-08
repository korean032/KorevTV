import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room: string = body.room || 'default';
    const event = {
      type: body.type,
      payload: body.payload,
      sender: body.sender,
      ts: Date.now()
    };
    const channel = getChannel();
    const clients = channel.rooms.get(room);
    if (clients && clients.size > 0) {
      for (const c of clients) {
        try {
          c.enqueue(JSON.stringify(event));
        } catch {}
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}