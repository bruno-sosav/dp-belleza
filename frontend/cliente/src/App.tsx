import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Layout from "./shared/components/Layout"
import NotFound from "./shared/pages/NotFound"
import Home from "./home/pages/Home"
import Contact from "./home/pages/Contact"
import Shop from "./ecommerce/pages/Shop"
import ProductDetail from "./ecommerce/pages/ProductDetail"
import Cart from "./ecommerce/pages/Cart"
import Checkout from "./ecommerce/pages/Checkout"
import Services from "./turnera/pages/Services"
import ServiceDetail from "./turnera/pages/ServiceDetail"
import Booking from "./turnera/pages/Booking"
import BookingConfirmed from "./turnera/pages/BookingConfirmed"

/** Al cambiar de página vuelve arriba; si la URL trae #ancla, baja hasta esa sección. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/**
 * Rutas de la web pública (dpbelleza.com.ar).
 * El panel de administración es otra app: frontend/admin/ -> admin.dpbelleza.com.ar
 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          {/* Institucional — home/ */}
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<Navigate to="/#nosotros" replace />} />
          <Route path="/contacto" element={<Contact />} />

          {/* Tienda — ecommerce/ */}
          <Route path="/tienda" element={<Shop />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Turnera — turnera/ */}
          <Route path="/servicios" element={<Services />} />
          <Route path="/servicios/:id" element={<ServiceDetail />} />
          <Route path="/reservar/:id" element={<Booking />} />
          <Route path="/reserva-confirmada" element={<BookingConfirmed />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
