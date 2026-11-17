import { Profile } from '../../models/user';

export function getProfileInitials(profile: Profile | null): string {
  if (!profile) return 'P';

  const nameParts = [profile.first_name, profile.last_name]
    .filter((name) => name.trim().length > 0)
    .map((name) => name.trim());
  if (nameParts.length > 0) {
    return nameParts.map((name) => name[0]).join('').slice(0, 2).toUpperCase();
  }

  const visibleName = profile.visible_name?.trim();
  return visibleName ? visibleName.slice(0, 2).toUpperCase() : 'P';
}
