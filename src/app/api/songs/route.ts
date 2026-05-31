import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    songs: [
      { id: '1', title: 'Summer Breeze', creator: 'Original Creator', bpm: 110, key: 'Am', genre: 'Synthwave' },
      { id: '2', title: 'Neon Shadows', creator: 'Cyber Synth', bpm: 124, key: 'C#m', genre: 'Cyberpunk' },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, song: { id: 'temp-uuid', ...body } }, { status: 201 });
  } catch (error) {
    console.error('Failed to parse song JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
