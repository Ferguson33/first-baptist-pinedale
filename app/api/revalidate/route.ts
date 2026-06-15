import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// On-demand revalidation endpoint for admin-triggered cache invalidation.
// Supports:
//   ?path=/events
//   ?paths=/,/events,/sermons  (comma separated)
//   ?all=1  (revalidates all key public pages)
//
// Used by the admin dashboard so that changes appear immediately on public
// pages without local terminal or redeploy. Strengthens remote management.

const KEY_PATHS = ['/', '/events', '/sermons', '/building-project', '/youth-ministry', '/visit', '/leadership'];

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const all = searchParams.get('all');
  const singlePath = searchParams.get('path');
  const multi = searchParams.get('paths');

  const pathsToRevalidate: string[] = [];

  if (all) {
    pathsToRevalidate.push(...KEY_PATHS);
  } else if (multi) {
    pathsToRevalidate.push(...multi.split(',').map(p => p.trim()).filter(Boolean));
  } else if (singlePath) {
    pathsToRevalidate.push(singlePath);
  } else {
    pathsToRevalidate.push('/');
  }

  const results: Array<{ path: string; success: boolean }> = [];

  try {
    for (const p of pathsToRevalidate) {
      try {
        revalidatePath(p, 'page');
        results.push({ path: p, success: true });
      } catch (e) {
        console.error(`Revalidation failed for ${p}:`, e);
        results.push({ path: p, success: false });
      }
    }

    const allSuccess = results.every(r => r.success);
    return NextResponse.json({ 
      revalidated: allSuccess, 
      paths: results 
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { message: 'Error revalidating', results },
      { status: 500 }
    );
  }
}
