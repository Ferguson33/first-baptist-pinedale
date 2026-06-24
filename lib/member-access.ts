export function isApprovedMemberRole(role: string | null | undefined): boolean {
  return role === 'approved' || role === 'admin';
}