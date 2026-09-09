import { NextResponse } from 'next/server';
import { getLabsFromDb } from '@/lib/lab-service';

// GET /api/labs — public, read-only expedition configuration (sectors and
// waypoints). Attendee clients load this on every session via LabsContext;
// admin writes stay on /api/admin/labs, which remains guarded by src/proxy.ts.
export async function GET() {
  try {
    const labs = await getLabsFromDb();
    return NextResponse.json(
      { labs },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err) {
    // MongoDB unreachable — serve the static seed configuration so attendee
    // clients still render the journal instead of failing to load labs.
    console.error('GET /api/labs failed, serving static fallback:', err);
    const { baseExpeditionLabs } = await import('@/lib/expeditionData');
    return NextResponse.json(
      { labs: baseExpeditionLabs },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  }
}