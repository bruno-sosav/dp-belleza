// Normaliza un teléfono argentino al formato que guarda la tabla `clientes`
// (solo dígitos, con 549 adelante para celulares). Ej: "+54 9 223 123-4567" -> "5492231234567".
// Devuelve null si no parece un número válido.
export function normalizarTelefono(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, "")
  if (digitos.startsWith("00")) digitos = digitos.slice(2)
  if (digitos.startsWith("0")) digitos = digitos.slice(1)

  // Separa el código de país (54 o 549) del número nacional
  let nacional = digitos
  if (digitos.length >= 12 && digitos.startsWith("549")) nacional = digitos.slice(3)
  else if (digitos.length >= 12 && digitos.startsWith("54")) nacional = digitos.slice(2)

  // Formato viejo de celular: código de área + 15 + número (ej: 223 15 123-4567).
  // El código de área tiene 2 (solo el 11), 3 o 4 dígitos.
  if (nacional.length === 12) {
    const largoArea = nacional.startsWith("11") ? 2 : [3, 4].find((n) => nacional.slice(n, n + 2) === "15")
    if (largoArea && nacional.slice(largoArea, largoArea + 2) === "15") {
      nacional = nacional.slice(0, largoArea) + nacional.slice(largoArea + 2)
    }
  }

  // Número argentino: código de área + número = 10 dígitos
  if (nacional.length === 10) return `549${nacional}`
  // Otro formato (por ejemplo, número de otro país): se guarda tal cual si el largo es razonable
  if (digitos.length >= 10 && digitos.length <= 15) return digitos
  return null
}
