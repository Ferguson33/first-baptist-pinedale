import { extractYouTubeVideoId } from '@/lib/youtube';
import { isApprovedMemberRole } from '@/lib/member-access';

export type LiveStreamSettingsRow = {
  live_video_id?: string | null;
  live_stream_active?: boolean | null;
  live_stream_public?: boolean | null;
};

export type LiveStreamAccess = {
  active: boolean;
  isPublic: boolean;
  canWatch: boolean;
  videoId: string | null;
};

export function resolveLiveStreamAccess(
  settings: LiveStreamSettingsRow | null | undefined,
  memberRole: string | null | undefined
): LiveStreamAccess {
  const videoId = extractYouTubeVideoId(settings?.live_video_id || '');
  const active = !!settings?.live_stream_active && !!videoId;
  const isPublic = !!settings?.live_stream_public;
  const isMember = isApprovedMemberRole(memberRole);
  const canWatch = active && (isPublic || isMember);

  return {
    active,
    isPublic,
    canWatch,
    videoId: canWatch ? videoId : null,
  };
}