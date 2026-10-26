import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Layout from "../shared/components/Layout"
import NotFoundPage from "../shared/pages/NotFoundPage"
import HomePage from "../features/home/pages/HomePage"
import ContactPage from "../features/home/pages/ContactPage"
import Shop from "../ecommerce/pages/Shop"
import ProductDetail from "../ecommerce/pages/ProductDetail"
import Cart from "../ecommerce/pages/Cart"
import Checkout from "../ecommerce/pages/Checkout"
import ServicesPage from "../features/turnera/pages/ServicesPage"
import ServiceDetailPage from "../features/turnera/pages/ServiceDetailPage"
import BookingPage from "../features/turnera/pages/BookingPage"
import BookingConfirmedPage from "../features/turnera/pages/BookingConfirmedPage"
import MiTurnoPage from "../features/turnera/pages/MiTurnoPage"
import PagoSenaPage from "../features/turnera/pages/PagoSenaPage"

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

/** Rutas de la web pública. El panel es otra app (frontend/admin/). */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          {/* Institucional — home/ */}
          <Route path="/" element={<HomePage />} />
          <Route path="/nosotros" element={<Navigate to="/#nosotros" replace />} />
          <Route path="/contacto" element={<ContactPage />} />

          {/* Tienda — ecommerce/ */}
          <Route path="/tienda" element={<Shop />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Turnera — turnera/ */}
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/servicios/:id" element={<ServiceDetailPage />} />
          <Route path="/reservar/:id" element={<BookingPage />} />
          <Route path="/reserva-confirmada" element={<BookingConfirmedPage />} />
          <Route path="/mi-turno" element={<MiTurnoPage />} />
          <Route path="/reserva/pago" element={<PagoSenaPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
