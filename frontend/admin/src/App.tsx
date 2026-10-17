import { Navigate, Route, Routes } from "react-router-dom"
import AdminLayout from "./components/AdminLayout"
import AdminToday from "./pages/AdminToday"
import AdminFinances from "./pages/AdminFinances"
import AdminClients from "./pages/AdminClients"
import AdminClientDetail from "./pages/AdminClientDetail"
import AdminAgenda from "./pages/AdminAgenda"
import AdminBookingStats from "./pages/AdminBookingStats"
import AdminSales from "./pages/AdminSales"
import AdminProducts from "./pages/AdminProducts"
import AdminProductNew from "./pages/AdminProductNew"
import AdminServices from "./pages/AdminServices"
import AdminServiceForm from "./pages/AdminServiceForm"
import AdminSchedule from "./pages/AdminSchedule"

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
        <Route path="/" element={<AdminToday />} />
        <Route path="/clientes" element={<AdminClients />} />
        <Route path="/clientes/:id" element={<AdminClientDetail />} />
        <Route path="/servicios" element={<AdminServices />} />
        <Route path="/servicios/:id" element={<AdminServiceForm />} />
        <Route path="/finanzas" element={<AdminFinances />} />
        <Route path="/finanzas/turnos" element={<AdminBookingStats />} />
        <Route path="/turnos" element={<AdminAgenda />} />
        <Route path="/turnos/horario" element={<AdminSchedule />} />
        <Route path="/ventas" element={<AdminSales />} />
        <Route path="/productos" element={<AdminProducts />} />
        <Route path="/productos/nuevo" element={<AdminProductNew />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
