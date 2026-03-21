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
 * Returns the avatar_url only if it was uploaded by the user (stored in our
 * storage bucket), otherwise falls back to a real-person photo.
 * This prevents non-person images (logos, products) from being used as profile pics.
 */
export function resolveAvatar(avatarUrl: string | null | undefined, profileId: string, size = 200): string {
  if (avatarUrl && avatarUrl.includes('/storage/v1/object/public/avatars/')) {
    return avatarUrl;
  }
  return getDefaultAvatar(profileId, size);
}
