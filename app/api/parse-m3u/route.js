import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url, content } = await request.json();
    let m3uText = '';

    if (content) {
      m3uText = content;
    } else if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        return new NextResponse(`Failed to fetch M3U: ${response.status}`, { status: response.status });
      }
      m3uText = await response.text();
    } else {
      return new NextResponse('Either url or content is required', { status: 400 });
    }

    const lines = m3uText.split(/\r?\n/);
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        currentChannel = {};
        
        // Extract properties
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        
        // Extract name (everything after the last comma)
        const nameMatch = line.substring(line.lastIndexOf(',') + 1).trim();

        if (logoMatch) currentChannel.logo = logoMatch[1];
        if (groupMatch) currentChannel.group = groupMatch[1];
        currentChannel.name = nameMatch || 'Unknown Channel';
      } else if (!line.startsWith('#')) {
        // This is a stream URL
        if (currentChannel.name) {
          currentChannel.url = line;
          channels.push({ ...currentChannel, id: channels.length.toString() });
          currentChannel = {}; // Reset for the next one
        }
      }
    }

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('M3U Parsing error:', error);
    return new NextResponse(`Error parsing M3U: ${error.message}`, { status: 500 });
  }
}
