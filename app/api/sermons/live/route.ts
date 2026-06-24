import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveLiveStreamAccess } from '@/lib/live-stream';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: settings, error } = await supabase
      .from('sermon_settings')
      .select('live_video_id, live_stream_active, live_stream_public')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Live stream settings error:', error);
      return NextResponse.json(
        {
          active: false,
          isPublic: false,
          canWatch: false,
          videoId: null,
          error: 'Unable to load live stream settings.',
        },
        { status: 200 }
      );
    }

    let memberRole: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      memberRole = profile?.role ?? null;
    }

    const access = resolveLiveStreamAccess(settings, memberRole);

    return NextResponse.json({
      ...access,
      isLoggedIn: !!user,
      memberRole,
    });
  } catch (err) {
    console.error('Live stream route error:', err);
    return NextResponse.json(
      {
        active: false,
        isPublic: false,
        canWatch: false,
        videoId: null,
        error: 'Unable to load live stream.',
      },
      { status: 500 }
    );
  }
}