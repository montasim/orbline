// Player-name rules. Pure, shared by the server (authoritative) and the UI (instant feedback).

// shortcut: tiny substring blocklist, not real moderation; add a proper filter or reports if abuse shows up
const BLOCKED = ['admin', 'moderator', 'orbline', 'northdash', 'fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler']

export function normaliseName(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

/** Returns a user-facing problem, or null when the (normalised) name is acceptable. */
export function nameProblem(name: string): string | null {
  if (name.length < 3 || name.length > 16) return 'Names are 3–16 characters'
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(name)) return 'Use letters, numbers, spaces, _ . or -'
  const flat = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (BLOCKED.some((w) => flat.includes(w))) return 'Please pick a different name'
  return null
}
