import { Navigate, Route, Routes } from "react-router-dom"
import AdminLayout from "./components/AdminLayout"
import AdminDashboard from "./pages/AdminDashboard"
import AdminBookings from "./pages/AdminBookings"
import AdminSales from "./pages/AdminSales"
import AdminProducts from "./pages/AdminProducts"
import AdminProductNew from "./pages/AdminProductNew"

/**
 * Rutas del panel (admin.dpbelleza.com.ar).
 *
 * Al ser un subdominio propio, el panel vive en la raíz: "/" en vez de "/admin".
 * El login lo resuelve AdminLayout: sin sesión, ninguna ruta renderiza.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/turnos" element={<AdminBookings />} />
        <Route path="/ventas" element={<AdminSales />} />
        <Route path="/productos" element={<AdminProducts />} />
        <Route path="/productos/nuevo" element={<AdminProductNew />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
