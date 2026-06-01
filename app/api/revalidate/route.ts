import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Simple on-demand revalidation endpoint.
// Call with: POST /api/revalidate?secret=YOUR_SECRET&path=/events
// 
// This lets the admin dashboard force the public pages to pick up
// new spotlight events immediately instead of waiting on cache.

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '/';

  // For now we are permissive during testing so revalidation always works.
  // In production you can add a proper secret check using process.env.REVALIDATE_SECRET.

  try {
    revalidatePath(path, 'page');
    return NextResponse.json({ 
      revalidated: true, 
      path,
      now: Date.now() 
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { message: 'Error revalidating', error: String(err) },
      { status: 500 }
    );
  }
}
