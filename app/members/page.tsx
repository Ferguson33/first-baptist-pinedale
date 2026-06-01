import { redirect } from 'next/navigation';

export default function MembersPortal() {
  // This page previously acted as a combined hub. We now link directly to the
  // individual resources from the user menu, so we redirect to the main one.
  redirect('/members/directory');
}

