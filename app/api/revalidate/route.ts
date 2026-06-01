import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// On-demand revalidation endpoint for admin-triggered cache invalidation.
// Example: POST /api/revalidate?path=/events
//
// Used by the admin dashboard so that changes (like new spotlight events)
// appear on public pages without requiring a full redeploy.

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '/';

  try {
    revalidatePath(path, 'page');
    return NextResponse.json({ revalidated: true, path });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { message: 'Error revalidating' },
      { status: 500 }
    );
  }
}
