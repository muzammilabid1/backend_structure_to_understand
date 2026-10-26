const MAX_INITIALS = 2

export const getInitials = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter((namePart) => namePart.length > 0)
    .slice(0, MAX_INITIALS)
    .map((namePart) => namePart[0].toUpperCase())
    .join('')
