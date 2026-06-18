import { NextResponse } from 'next/server';

export async function GET(request) {
  const targetUrl = request.nextUrl.searchParams.get('targetUrl');
  if (!targetUrl) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      return NextResponse.json({ error: `Source responded with ${response.status}` }, { status: response.status });
    }

    const data = await response.arrayBuffer();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Proxy Fetch Error Details:', err); 
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
