import { NextRequest, NextResponse } from 'next/server';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' },
        { status: 400 }
      );
    }

    const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let title = `YouTube Video (${videoId})`;
    let author = 'YouTube Creator';
    let videoDuration = 0; // in seconds

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
      }
    } catch (e) {
      // Fallback works gracefully
    }

    // Fetch video duration from YouTube HTML
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        next: { revalidate: 3600 }
      });
      if (pageRes.ok) {
        const text = await pageRes.text();
        const match = text.match(/"lengthSeconds":"(\d+)"/);
        if (match && match[1]) {
          videoDuration = parseInt(match[1], 10);
        }
      }
    } catch (e) {
      // Fallback if network blocked
    }

    // If video duration is less than the preset (30s), default to full duration
    const defaultDuration = videoDuration > 0 && videoDuration < 30 ? videoDuration : 30;

    return NextResponse.json({
      success: true,
      videoId,
      title,
      author,
      thumbnail: defaultThumbnail,
      videoDuration: videoDuration > 0 ? videoDuration : undefined,
      defaultDuration
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
