import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { categories, productBadges } from "../../ecommerce/data/products"
import type { Product } from "../../ecommerce/data/products"
import { addProduct } from "../../ecommerce/data/productStore"
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

type FormState = {
  name: string
  category: string
  price: string
  oldPrice: string
  image: string
  description: string
  badge: "" | NonNullable<Product["badge"]>
  sizes: string
}

const emptyForm: FormState = {
  name: "",
  category: categories[0],
  price: "",
  oldPrice: "",
  image: "",
  description: "",
  badge: "",
  sizes: "",
}

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

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {}
  const price = Number(form.price)
  const oldPrice = Number(form.oldPrice)

  if (!form.name.trim()) errors.name = "Poné el nombre del producto."
  if (!form.price || !(price > 0)) errors.price = "Poné un precio mayor a 0."
  if (form.oldPrice && !(oldPrice > price)) errors.oldPrice = "Tiene que ser mayor al precio actual."
  if (!/^https?:\/\/\S+$/.test(form.image.trim())) errors.image = "Pegá el link de la imagen (empieza con https://)."
  if (!form.description.trim()) errors.description = "Escribí una descripción corta."
  return errors
}

export default function AdminProductNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitted, setSubmitted] = useState(false)

  const errors = submitted ? validate(form) : {}
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(form)).length > 0) return

    const sizes = form.sizes.split(",").map((s) => s.trim()).filter(Boolean)
    const product = addProduct({
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
      image: form.image.trim(),
      description: form.description.trim(),
      badge: form.badge || undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
    })
    navigate("/admin/productos", { state: { added: product.name } })
  }

  return (
    <div>
      <Link to="/admin/productos" className="text-sm text-ink-soft hover:text-ink">
        ← Volver a productos
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">Agregar producto</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className={`${cardClass} space-y-5 p-5 sm:p-6`}>
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Ej: Sérum Facial Vitamina C" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="category">
              <select id="category" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Etiqueta" htmlFor="badge" hint="Opcional. Se muestra sobre la foto.">
              <select id="badge" value={form.badge} onChange={(e) => set("badge", e.target.value as FormState["badge"])} className={inputClass}>
                <option value="">Sin etiqueta</option>
                {productBadges.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Precio ($)" htmlFor="price" error={errors.price}>
              <input id="price" type="number" inputMode="numeric" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} className={inputClass} placeholder="18900" />
            </Field>
            <Field label="Precio anterior ($)" htmlFor="oldPrice" hint="Opcional. Si lo completás, se muestra tachado como oferta." error={errors.oldPrice}>
              <input id="oldPrice" type="number" inputMode="numeric" min={0} value={form.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label="Imagen (link)" htmlFor="image" hint="Pegá el link de la foto del producto." error={errors.image}>
            <input id="image" type="url" value={form.image} onChange={(e) => set("image", e.target.value)} className={inputClass} placeholder="https://…" />
          </Field>

          <Field label="Descripción" htmlFor="description" error={errors.description}>
            <textarea id="description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
          </Field>

          <Field label="Tamaños / presentaciones" htmlFor="sizes" hint="Opcional. Separados por coma, ej: 30ml, 50ml">
            <input id="sizes" value={form.sizes} onChange={(e) => set("sizes", e.target.value)} className={inputClass} />
          </Field>

          <div className="flex flex-wrap justify-end gap-3 border-t border-cream-dark pt-5">
            <Link to="/admin/productos" className={secondaryButtonClass}>
              Cancelar
            </Link>
            <button type="submit" className={primaryButtonClass}>
              Guardar producto
            </button>
          </div>
        </div>

        <aside>
          <p className="text-sm font-medium text-ink">Vista previa</p>
          <div className="mt-2 overflow-hidden rounded-lg bg-cream-dark">
            {/^https?:\/\/\S+$/.test(form.image.trim()) ? (
              <img src={form.image.trim()} alt="Vista previa" className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-xs text-ink-soft">
                La foto aparece acá cuando pegues el link.
              </div>
            )}
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-ink-soft">{form.category}</p>
          <p className="mt-1 font-display text-lg text-ink">{form.name || "Nombre del producto"}</p>
        </aside>
      </form>
    </div>
  )
}
