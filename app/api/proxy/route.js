import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('targetUrl');
  
  if (!targetUrl) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const workerUrl = `https://iptv-proxy.mdmokammelmorshed.workers.dev/?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(workerUrl);
    
    if (!response.ok) throw new Error(`Worker responded with ${response.status}`);

    const contentType = response.headers.get('Content-Type') || '';

    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const text = await response.text();
      const urlObj = new URL(targetUrl);
      const basePath = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);

      const rewrittenText = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed === '') return line;
        
        let chunkUrl = trimmed;
        if (!chunkUrl.startsWith('http')) {
          chunkUrl = basePath + chunkUrl;
          if (urlObj.search && !chunkUrl.includes('?')) {
            chunkUrl += urlObj.search;
          }
        }
        
        return `/api/proxy?targetUrl=${encodeURIComponent(chunkUrl)}`;
      }).join('\n');

      return new NextResponse(rewrittenText, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } 
    
    else {
      const data = await response.arrayBuffer();
      return new NextResponse(data, {
        headers: {
          'Content-Type': contentType || 'video/MP2T',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (err) {
    console.error('Proxy Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
