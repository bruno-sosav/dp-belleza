import { Navigate, Route, Routes } from "react-router-dom"
import AdminLayout from "./AdminLayout"
import AdminToday from "../pages/AdminToday"
import CustomersPage from "../features/customers/pages/CustomersPage"
import CustomerDetailPage from "../features/customers/pages/CustomerDetailPage"
import AdminAgenda from "../pages/AdminAgenda"
import AdminCash from "../pages/AdminCash"
import AdminAnalysis from "../pages/AdminAnalysis"
import AdminSales from "../pages/AdminSales"
import AdminProducts from "../pages/AdminProducts"
import AdminProductNew from "../pages/AdminProductNew"
import AdminServices from "../pages/AdminServices"
import AdminServiceForm from "../pages/AdminServiceForm"
import AdminSchedule from "../pages/AdminSchedule"
import AdminClosedDays from "../pages/AdminClosedDays"
import AdminBookingRules from "../pages/AdminBookingRules"
import BusinessPage from "../features/settings/pages/BusinessPage"
import MercadoPagoPage from "../features/settings/pages/MercadoPagoPage"
import AccountPage from "../features/auth/pages/AccountPage"
import AdminReminders from "../pages/AdminReminders"
import AdminReminderTypes from "../pages/AdminReminderTypes"

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
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/clientes/:id" element={<CustomerDetailPage />} />
        <Route path="/servicios" element={<AdminServices />} />
        <Route path="/servicios/:id" element={<AdminServiceForm />} />
        <Route path="/finanzas" element={<AdminCash />} />
        <Route path="/finanzas/analisis" element={<AdminAnalysis />} />
        {/* Direcciones viejas de Finanzas, por si quedaron guardadas */}
        <Route path="/finanzas/caja" element={<Navigate to="/finanzas" replace />} />
        <Route path="/finanzas/turnos" element={<Navigate to="/finanzas/analisis" replace />} />
        <Route path="/turnos" element={<AdminAgenda />} />
        <Route path="/turnos/horario" element={<AdminSchedule />} />
        <Route path="/turnos/dias-cerrados" element={<AdminClosedDays />} />
        <Route path="/turnos/reglas" element={<AdminBookingRules />} />
        <Route path="/ventas" element={<AdminSales />} />
        <Route path="/productos" element={<AdminProducts />} />
        <Route path="/productos/nuevo" element={<AdminProductNew />} />
        <Route path="/recordatorios" element={<AdminReminders />} />
        <Route path="/recordatorios/mensajes" element={<AdminReminderTypes />} />
        <Route path="/ajustes" element={<BusinessPage />} />
        <Route path="/ajustes/mercadopago" element={<MercadoPagoPage />} />
        <Route path="/ajustes/cuenta" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
