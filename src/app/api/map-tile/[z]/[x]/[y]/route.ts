import { NextRequest, NextResponse } from 'next/server';

// Production serves this app behind a reverse proxy that sends
// Cross-Origin-Embedder-Policy: require-corp. That header makes the browser
// block any cross-origin <img> load (like Leaflet's OSM tiles) unless the
// remote server sends back a Cross-Origin-Resource-Policy header, which OSM's
// tile servers don't. We can't change that proxy config, so instead we fetch
// tiles here (same-origin from the browser's point of view) and pass them
// through, keeping to OSM's tile usage policy: identify via User-Agent and
// cache aggressively instead of re-fetching on every request.
// https://operations.osmfoundation.org/policies/tiles/
const SUBDOMAINS = ['a', 'b', 'c'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;

  const zNum = Number(z);
  const xNum = Number(x);
  const yNum = Number(y);

  if (
    !Number.isInteger(zNum) || zNum < 0 || zNum > 19 ||
    !Number.isInteger(xNum) || xNum < 0 ||
    !Number.isInteger(yNum) || yNum < 0
  ) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  const maxIndex = 2 ** zNum - 1;
  if (xNum > maxIndex || yNum > maxIndex) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  const subdomain = SUBDOMAINS[(xNum + yNum) % SUBDOMAINS.length];
  const upstreamUrl = `https://${subdomain}.tile.openstreetmap.org/${zNum}/${xNum}/${yNum}.png`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'NibAppointment/1.0 (Hospital appointment platform; https://nibapointment.nibbank.com.et)',
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json({ error: 'Tile not found' }, { status: upstreamRes.status });
    }

    const buffer = await upstreamRes.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Map tile proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch tile' }, { status: 502 });
  }
}
