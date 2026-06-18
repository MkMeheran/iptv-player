import { NextResponse } from 'next/server';

export async function GET(request) {
  const targetUrl = request.nextUrl.searchParams.get('targetUrl');
  if (!targetUrl) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const response = await fetch(targetUrl);
    const data = await response.blob();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch proxy' }, { status: 500 });
  }
}
