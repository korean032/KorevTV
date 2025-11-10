import { NextResponse } from 'next/server';

import { parseUniversalPlaylist } from '@/lib/live';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = (body?.url ?? '').trim();

    if (!url) {
      return NextResponse.json({ error: '缺少源地址 url' }, { status: 400 });
    }

    // Fetch remote playlist/script; allow plain text or JSON or M3U
    const resp = await fetch(url, {
      method: 'GET',
      // Some sources may require simple headers; keep minimal here
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: '*/*',
      },
      // Next.js edge/runtime supports cross-origin fetch
      cache: 'no-store',
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `抓取失败: ${resp.status} ${resp.statusText}` },
        { status: 502 }
      );
    }

    const contentType = resp.headers.get('content-type') || '';
    // Always read as text; universal parser can detect JSON by content
    const text = await resp.text();

    const parsed = parseUniversalPlaylist(text, url);
    const channels = parsed.channels || [];

    // Compute group stats
    const groupMap = new Map<string, number>();
    for (const ch of channels) {
      const g = (ch.group || '未分组').trim();
      groupMap.set(g, (groupMap.get(g) || 0) + 1);
    }
    const groups = Array.from(groupMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      url,
      contentType,
      total: channels.length,
      groups,
      epgUrl: parsed.epgUrl || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}