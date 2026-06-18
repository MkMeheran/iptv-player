import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('targetUrl');

    if (!targetUrl) {
        return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 });
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        let fetchResponse;

        // ১. কাস্টম পোর্ট চেকিং (Cloudflare-এর পোর্ট ব্লক বাইপাস করা)
        const isCustomPort = parsedUrl.port && !['80', '443', '8080', '8443'].includes(parsedUrl.port);

        if (isCustomPort) {
            // Cloudflare-এ না পাঠিয়ে Next.js নিজে সরাসরি ফেচ করবে
            fetchResponse = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
        } else {
            // সাধারণ পোর্ট হলে Cloudflare Worker-এর মাধ্যমে রাউট করা হবে
            const cloudflareWorkerUrl = `https://iptv-proxy.mdmokammelmorshed.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
            fetchResponse = await fetch(cloudflareWorkerUrl);
        }

        // ২. ফাইল টাইপ চেকিং
        const contentType = fetchResponse.headers.get('Content-Type') || '';
        const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');

        // ৩. ম্যাজিক: M3U8 Rewriter (ভেতরের খণ্ডগুলোর লিংক প্রক্সির সাথে যুক্ত করা)
        if (isM3u8) {
            const text = await fetchResponse.text();
            
            // আপনার নিজস্ব প্রক্সির বেস ইউআরএল তৈরি করা হচ্ছে
            const proxyBaseUrl = `${request.nextUrl.origin}${request.nextUrl.pathname}?targetUrl=`;
            
            const lines = text.split('\n');
            const modifiedLines = lines.map(line => {
                const trimmed = line.trim();
                
                // যদি লাইনটি কোনো কমেন্ট না হয় (মানে এটি একটি সাব-প্লেলিস্ট বা ভিডিও খণ্ডের লিংক)
                if (trimmed && !trimmed.startsWith('#')) {
                    let absoluteUrl = trimmed;
                    // লিংকটিকে অ্যাবসলুট (সম্পূর্ণ) করা হচ্ছে
                    if (!trimmed.startsWith('http')) {
                        absoluteUrl = trimmed.startsWith('/') ? parsedUrl.origin + trimmed : baseUrl + trimmed;
                    }
                    // খণ্ডটির লিংককেও প্রক্সির সাথে জুড়ে দেওয়া হচ্ছে
                    return proxyBaseUrl + encodeURIComponent(absoluteUrl);
                }
                
                // যদি ভিডিওতে কোনো এক্সট্রা এনক্রিপশন কি (Key) থাকে, সেটিও প্রক্সির ভেতর দিয়ে রাউট করা
                if (trimmed.startsWith('#EXT-X-KEY') && trimmed.includes('URI="')) {
                    return trimmed.replace(/URI="(.*?)"/, (match, p1) => {
                        let absoluteUrl = p1;
                        if (!p1.startsWith('http')) {
                            absoluteUrl = p1.startsWith('/') ? parsedUrl.origin + p1 : baseUrl + p1;
                        }
                        return `URI="${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}"`;
                    });
                }
                
                return line;
            });

            return new NextResponse(modifiedLines.join('\n'), {
                status: fetchResponse.status,
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // ৪. .ts ফাইল বা অন্যান্য ভিডিও খণ্ড হলে সরাসরি ডেটা পাঠানো
        const responseBody = await fetchResponse.arrayBuffer();
        return new NextResponse(responseBody, {
            status: fetchResponse.status,
            headers: {
                'Content-Type': contentType || 'video/MP2T',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
    }
}
