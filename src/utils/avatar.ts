/**
 * Default Avatar Generator (Pure SVG data URI)
 * Generates an elegant avatar without external network calls.
 * For Guest, generates a clean user silhouette on a theme gradient.
 * For custom names, generates high-contrast typographic initials.
 */
export function getDefaultAvatar(name = 'Guest'): string {
  const cleanName = (name || '').trim();
  const isGuest = !cleanName || cleanName.toLowerCase().includes('guest') || cleanName === 'Maverick Vinales';

  if (isGuest) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="guestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#guestGrad)" />
      <circle cx="60" cy="46" r="20" fill="#FFFFFF" opacity="0.95" />
      <path d="M26 98 C26 78, 41 68, 60 68 C79 68, 94 78, 94 98 Z" fill="#FFFFFF" opacity="0.95" />
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const initials = cleanName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'G';

  // Palette generator based on name hash
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    { start: '#10B981', end: '#047857' }, // Emerald
    { start: '#3B82F6', end: '#1D4ED8' }, // Blue
    { start: '#F59E0B', end: '#D97706' }, // Amber
    { start: '#8B5CF6', end: '#6D28D9' }, // Violet
    { start: '#EC4899', end: '#BE185D' }, // Pink
    { start: '#06B6D4', end: '#0E7490' }, // Cyan
  ];
  const selectedGrad = gradients[Math.abs(hash) % gradients.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${selectedGrad.start}" />
        <stop offset="100%" stop-color="${selectedGrad.end}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#avatarGrad)" />
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">
      ${initials}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Validates if an avatar URL is a valid uploaded data URI or custom image URL,
 * replacing legacy URLs, old MV symbol SVGs, or default avatars with the clean Guest/custom avatar.
 */
export function sanitizeAvatarUrl(url?: string | null, name = 'Guest'): string {
  const cleanName = (name || '').trim();
  const effectiveName = !cleanName || cleanName.toLowerCase().includes('guest') || cleanName === 'Maverick Vinales'
    ? 'Guest'
    : cleanName;

  // If URL is missing, invalid, or legacy mock
  if (!url || typeof url !== 'string' || url.includes('pravatar.cc')) {
    return getDefaultAvatar(effectiveName);
  }

  // If it is an SVG data URI, check if it contains the legacy "MV" initials or old gradient
  if (url.startsWith('data:image/svg+xml')) {
    try {
      const decoded = decodeURIComponent(url);
      if (
        decoded.includes('MV') ||
        decoded.includes('>MV<') ||
        url.includes('%4D%56') ||
        url.includes('MV') ||
        decoded.includes('avatarGrad')
      ) {
        return getDefaultAvatar(effectiveName);
      }

      // For Guest, always use the clean guest silhouette rather than any letters
      if (effectiveName === 'Guest' && !decoded.includes('guestGrad')) {
        return getDefaultAvatar('Guest');
      }
    } catch {
      return getDefaultAvatar(effectiveName);
    }
  }

  return url;
}
