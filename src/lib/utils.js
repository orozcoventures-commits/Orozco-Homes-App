// Derive display initials from a full name string
export function getInitials(name = '') {
  return (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Map a user UUID to a consistent brand-safe avatar colour
const AVATAR_COLOURS = [
  '#3B82F6', '#7C3AED', '#059669',
  '#DC2626', '#D97706', '#0891B2',
];

export function getAvatarColour(id = '') {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
