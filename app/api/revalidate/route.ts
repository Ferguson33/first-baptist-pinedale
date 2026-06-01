import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Simple on-demand revalidation endpoint.
// Call with: POST /api/revalidate?secret=YOUR_SECRET&path=/events
// 
// This lets the admin dashboard force the public pages to pick up
// new spotlight events immediately instead of waiting on cache.

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path') || '/';

  // In production you should set REVALIDATE_SECRET in your Vercel env vars.
  // For now this allows testing without it (remove the || 'dev' part later).
  const expectedSecret = process.env.REVALIDATE_SECRET || 'dev-only-insecure';

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { message: 'Invalid revalidation secret' },
      { status: 401 }
    );
  }

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
