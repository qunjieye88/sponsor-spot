/**
 * Returns a deterministic real-person avatar URL based on a profile id.
 * Uses pravatar.cc which serves real portrait photos.
 */
export function getDefaultAvatar(profileId: string, size = 200): string {
  // Use a simple hash of the id to get a stable number
  let hash = 0;
  for (let i = 0; i < profileId.length; i++) {
    hash = (hash * 31 + profileId.charCodeAt(i)) | 0;
  }
  const num = Math.abs(hash) % 70; // pravatar has ~70 images
  return `https://i.pravatar.cc/${size}?img=${num}`;
}

/**
 * Returns the avatar_url if set, otherwise a default real-person photo.
 */
export function resolveAvatar(avatarUrl: string | null | undefined, profileId: string, size = 200): string {
  if (avatarUrl) return avatarUrl;
  return getDefaultAvatar(profileId, size);
}
