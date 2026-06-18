import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { serverUrl, username, password, action, category_id } = await request.json();

    if (!serverUrl || !username || !password) {
      return new NextResponse('Missing credentials', { status: 400 });
    }

    let url = `${serverUrl}/player_api.php?username=${username}&password=${password}`;
    if (action) url += `&action=${action}`;
    if (category_id) url += `&category_id=${category_id}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      return new NextResponse(`Xtream API error: ${response.status}`, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Xtream error:', error);
    return new NextResponse(`Xtream API error: ${error.message}`, { status: 500 });
  }
}
