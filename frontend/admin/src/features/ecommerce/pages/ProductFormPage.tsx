import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ApiError } from "../../../shared/lib/api"
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { crearCategoria, crearProducto, useCategoriasAdmin } from "../api/catalogo.api"

/** Valor del select para escribir una categoría que todavía no existe. */
const NUEVA = "nueva"

type FormState = {
  name: string
  /** id de la categoría, "" = sin categoría, NUEVA = escribir una. */
  category: string
  newCategory: string
  price: string
  stock: string
  image: string
  description: string
}

const emptyForm: FormState = { name: "", category: "", newCategory: "", price: "", stock: "", image: "", description: "" }

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-700">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  )
}

const esLink = (texto: string) => /^https?:\/\/\S+$/.test(texto.trim())

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {}
  const price = Number(form.price)
  const stock = Number(form.stock)

  if (!form.name.trim()) errors.name = "Poné el nombre del producto."
  if (form.category === NUEVA && !form.newCategory.trim()) errors.newCategory = "Escribí el nombre de la categoría."
  if (!form.price || !(price > 0)) errors.price = "Poné un precio mayor a 0."
  if (form.stock === "" || !Number.isInteger(stock) || stock < 0) errors.stock = "Poné cuántas unidades tenés (0 o más)."
  if (form.image.trim() && !esLink(form.image)) errors.image = "Tiene que ser un link (empieza con https://)."
  return errors
}

export default function ProductFormPage() {
  const navigate = useNavigate()
  const categorias = useCategoriasAdmin()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const errors = submitted ? validate(form) : {}
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const activas = (categorias.datos ?? []).filter((c) => c.activo)
  const nombreCategoria =
    form.category === NUEVA ? form.newCategory : activas.find((c) => String(c.id) === form.category)?.nombre ?? ""

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setErrorApi(null)
    if (Object.keys(validate(form)).length > 0) return

    setGuardando(true)
    try {
      const categoriaId =
        form.category === NUEVA
          ? (await crearCategoria(form.newCategory.trim())).id
          : form.category
            ? Number(form.category)
            : null
      const product = await crearProducto({
        nombre: form.name.trim(),
        precio: Number(form.price),
        stock: Number(form.stock),
        categoriaId,
        imagenUrl: form.image.trim() || null,
        descripcion: form.description.trim() || null,
      })
      navigate("/productos", { state: { added: product.nombre } })
    } catch (err) {
      setErrorApi(err instanceof ApiError ? err.message : "No se pudo guardar. Probá de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <Link to="/productos" className="text-sm text-ink-soft hover:text-ink">
        ← Volver a productos
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">Agregar producto</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className={`${cardClass} space-y-5 p-5 sm:p-6`}>
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Ej: Sérum Facial Vitamina C" maxLength={150} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="category" hint={categorias.error ? "No se pudieron cargar las categorías." : undefined}>
              <select id="category" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                <option value="">Sin categoría</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
                <option value={NUEVA}>+ Nueva categoría…</option>
              </select>
            </Field>
            {form.category === NUEVA && (
              <Field label="Nombre de la categoría" htmlFor="newCategory" error={errors.newCategory}>
                <input id="newCategory" value={form.newCategory} onChange={(e) => set("newCategory", e.target.value)} className={inputClass} maxLength={100} />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Precio ($)" htmlFor="price" error={errors.price}>
              <input id="price" type="number" inputMode="decimal" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} className={inputClass} placeholder="18900" />
            </Field>
            <Field label="Stock inicial" htmlFor="stock" hint="Cuántas unidades tenés hoy. Después se corrige desde la lista." error={errors.stock}>
              <input id="stock" type="number" inputMode="numeric" min={0} step={1} value={form.stock} onChange={(e) => set("stock", e.target.value)} className={inputClass} placeholder="10" />
            </Field>
          </div>

          <Field label="Imagen (link)" htmlFor="image" hint="Opcional. Pegá el link de la foto del producto." error={errors.image}>
            <input id="image" type="url" value={form.image} onChange={(e) => set("image", e.target.value)} className={inputClass} placeholder="https://…" maxLength={500} />
          </Field>

          <Field label="Descripción" htmlFor="description" hint="Opcional.">
            <textarea id="description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} maxLength={5000} />
          </Field>

          {errorApi && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorApi}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-cream-dark pt-5">
            <Link to="/productos" className={secondaryButtonClass}>
              Cancelar
            </Link>
            <button type="submit" disabled={guardando} className={`${primaryButtonClass} disabled:opacity-60`}>
              {guardando ? "Guardando…" : "Guardar producto"}
            </button>
          </div>
        </div>

        <aside>
          <p className="text-sm font-medium text-ink">Vista previa</p>
          <div className="mt-2 overflow-hidden rounded-lg bg-cream-dark">
            {esLink(form.image) ? (
              <img src={form.image.trim()} alt="Vista previa" className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-xs text-ink-soft">
                La foto aparece acá cuando pegues el link.
              </div>
            )}
          </div>
          {nombreCategoria && <p className="mt-3 text-xs uppercase tracking-wide text-ink-soft">{nombreCategoria}</p>}
          <p className="mt-1 font-display text-lg text-ink">{form.name || "Nombre del producto"}</p>
        </aside>
      </form>
    </div>
  )
}
