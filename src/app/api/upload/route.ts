import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('file') || 'unnamed.mp3';
  const fileType = searchParams.get('type') || 'audio/mpeg';

  console.log(`Generating presigned URL for ${fileName} (${fileType})`);

  // Lấy presigned upload URL từ R2 helper
  const uploadUrl = `https://r2.cloudflarestorage.com/stemverse-bucket/${fileName}?signed=true`;

  return NextResponse.json({
    uploadUrl,
    fileKey: `songs/${Date.now()}-${fileName}`,
  });
}
