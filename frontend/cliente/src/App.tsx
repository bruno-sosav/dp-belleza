import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Layout from "./components/Layout"
import Landing from "../landing/pages/Landing"
import Shop from "./pages/Shop"
import ProductDetail from "./pages/ProductDetail"
import Cart from "./pages/Cart"
import Checkout from "./pages/Checkout"
import Contact from "./pages/Contact"
import NotFound from "./pages/NotFound"
import Services from "../turnera/pages/Services"
import ServiceDetail from "../turnera/pages/ServiceDetail"
import Booking from "../turnera/pages/Booking"
import BookingConfirmed from "../turnera/pages/BookingConfirmed"
import AdminLayout from "../admin/components/AdminLayout"
import AdminDashboard from "../admin/pages/AdminDashboard"
import AdminBookings from "../admin/pages/AdminBookings"
import AdminSales from "../admin/pages/AdminSales"
import AdminProducts from "../admin/pages/AdminProducts"
import AdminProductNew from "../admin/pages/AdminProductNew"

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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/tienda" element={<Shop />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          {/* Turnera — turnera/ (Bruno) */}
          <Route path="/servicios" element={<Services />} />
          <Route path="/servicios/:id" element={<ServiceDetail />} />
          <Route path="/reservar/:id" element={<Booking />} />
          <Route path="/reserva-confirmada" element={<BookingConfirmed />} />

          <Route path="/nosotros" element={<Navigate to="/#nosotros" replace />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Panel de administración — admin/. No está linkeado desde el sitio público. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="turnos" element={<AdminBookings />} />
          <Route path="ventas" element={<AdminSales />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="productos/nuevo" element={<AdminProductNew />} />
        </Route>
      </Routes>
    </>
  )
}
