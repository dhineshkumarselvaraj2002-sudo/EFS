/**
 * Get initials from a name string
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return 'U'
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  
  // Get first letter of first word and first letter of last word
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

/**
 * Get user avatar URL (could be from session, provider, or generate from email)
 */
export function getUserAvatarUrl(
  email: string | null | undefined,
  image?: string | null | undefined
): string | undefined {
  // If image is provided (e.g., from OAuth), use it
  if (image) return image
  
  // Could generate avatar from email using a service like Gravatar
  // For now, return undefined to use fallback
  return undefined
}

