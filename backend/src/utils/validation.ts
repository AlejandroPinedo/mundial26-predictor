const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

/**
 * Valida un nombre de usuario. Devuelve el mensaje de error en español,
 * o null si es válido. El llamador debe usar el valor con .trim().
 */
export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string' || username.trim().length === 0) {
    return 'El nombre de usuario es requerido'
  }
  const trimmed = username.trim()
  if (trimmed.length < 3) return 'El nombre de usuario debe tener al menos 3 caracteres'
  if (trimmed.length > 20) return 'El nombre de usuario no puede superar 20 caracteres'
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Solo se permiten letras, números y guion bajo (sin espacios ni acentos)'
  }
  return null
}
