// Teléfonos: se guardan normalizados en el formato que pide WhatsApp (wa.me):
// 549 + código de área + número, solo dígitos. Ej: "223 555-1234" -> "5492235551234".
//
// La clienta escribe el número como lo dice en voz alta: "223 5551234", "0223 15 555-1234",
// o directamente "155551234" si es de la misma ciudad. Todo eso tiene que dar lo mismo.

/**
 * Normaliza un teléfono. Devuelve null si no parece un número válido.
 *
 * @param codigoArea el del local (Ajustes → Tu negocio). Se usa cuando el número viene sin
 *   código de área: "15 555-1234" o "4951234" en Mar del Plata son "223 555-1234" y "223 495-1234".
 */
export function normalizarTelefono(entrada: string, codigoArea?: string): string | null {
  const conMas = /^\s*(\+|00)/.test(entrada)
  let digitos = entrada.replace(/\D/g, "")
  if (digitos.startsWith("00")) digitos = digitos.slice(2)

  // Con + adelante y sin 54: es de otro país. Se guarda tal cual si el largo es razonable.
  if (conMas && !digitos.startsWith("54")) {
    return digitos.length >= 8 && digitos.length <= 15 ? digitos : null
  }

  // Separa el código de país (54 o 549) del número nacional
  let nacional = digitos
  if (digitos.length >= 12 && digitos.startsWith("549")) nacional = digitos.slice(3)
  else if (digitos.length >= 12 && digitos.startsWith("54")) nacional = digitos.slice(2)
  if (nacional.startsWith("0")) nacional = nacional.slice(1)

  // Formato viejo de celular: código de área + 15 + número (ej: 223 15 123-4567).
  // El código de área tiene 2 (solo el 11), 3 o 4 dígitos.
  if (nacional.length === 12) {
    const largoArea = nacional.startsWith("11") ? 2 : [3, 4].find((n) => nacional.slice(n, n + 2) === "15")
    if (largoArea && nacional.slice(largoArea, largoArea + 2) === "15") {
      nacional = nacional.slice(0, largoArea) + nacional.slice(largoArea + 2)
    }
  }

  // Sin código de área: se le pone el del local. Con o sin el 15 adelante.
  if (codigoArea && nacional.length < 10) {
    const sin15 = nacional.startsWith("15") && nacional.length - 2 + codigoArea.length === 10 ? nacional.slice(2) : nacional
    if (sin15.length + codigoArea.length === 10) nacional = codigoArea + sin15
  }

  // Número argentino: código de área + número = 10 dígitos. Cualquier otro largo es un error de tipeo.
  return nacional.length === 10 ? `549${nacional}` : null
}
