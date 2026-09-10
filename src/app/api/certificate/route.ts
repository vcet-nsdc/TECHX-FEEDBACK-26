import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawName = searchParams.get('name') || 'Explorer';
    const name = rawName.trim().toUpperCase().slice(0, 60);

    const certPath = path.join(process.cwd(), 'public', 'certificate', 'certificate.png');
    let certBuffer: Buffer | null = null;

    if (fs.existsSync(certPath)) {
      try {
        certBuffer = fs.readFileSync(certPath);
      } catch {}
    }

    if (!certBuffer) {
      try {
        const origin = request.nextUrl.origin;
        const res = await fetch(`${origin}/certificate/certificate.png`);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          certBuffer = Buffer.from(arr);
        }
      } catch {}
    }

    if (!certBuffer) {
      return new NextResponse('Certificate template not found', { status: 404 });
    }

    let fontSize = 78;
    if (name.length > 28) {
      fontSize = 46;
    } else if (name.length > 20) {
      fontSize = 58;
    } else if (name.length > 14) {
      fontSize = 68;
    }

    // Escape special XML characters in participant name
    const safeName = name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const svgOverlay = Buffer.from(`
<svg width="2000" height="1414" xmlns="http://www.w3.org/2000/svg">
  <style>
    .presented-to {
      font-family: 'Cinzel', 'Georgia', 'DejaVu Serif', 'Times New Roman', serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 6px;
      fill: #5c3a1e;
      text-anchor: middle;
    }
    .participant-name-shadow {
      font-family: 'Cinzel', 'Georgia', 'DejaVu Serif', 'Times New Roman', serif;
      font-size: ${fontSize}px;
      font-weight: 900;
      letter-spacing: 3px;
      fill: #fff3cc;
      fill-opacity: 0.6;
      text-anchor: middle;
    }
    .participant-name {
      font-family: 'Cinzel', 'Georgia', 'DejaVu Serif', 'Times New Roman', serif;
      font-size: ${fontSize}px;
      font-weight: 900;
      letter-spacing: 3px;
      fill: #140701;
      text-anchor: middle;
    }
  </style>
  <text x="1000" y="550" class="presented-to">PROUDLY PRESENTED TO</text>
  <text x="1000" y="637" class="participant-name-shadow">${safeName}</text>
  <text x="1000" y="635" class="participant-name">${safeName}</text>
</svg>
`);

    const pngBuffer = await sharp(certBuffer)
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .png({ quality: 100 })
      .toBuffer();

    const cleanFileName = `TechX_2026_Certificate_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
