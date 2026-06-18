import { NextResponse } from 'next/server';

export async function GET(request) {
  const targetUrl = request.nextUrl.searchParams.get('targetUrl');
  if (!targetUrl) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const targetOrigin = new URL(targetUrl).origin;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Origin': targetOrigin
      }
    });

    if (!response.ok) throw new Error('Failed to fetch from source');

    const data = await response.arrayBuffer();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Proxy Fetch Error Details:', err); 
    return NextResponse.json({ 
      error: 'Failed to fetch proxy', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
