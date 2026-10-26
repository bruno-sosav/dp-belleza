import { Navigate, Route, Routes } from "react-router-dom"
import AdminLayout from "./AdminLayout"
import TodayPage from "../features/today/pages/TodayPage"
import CustomersPage from "../features/customers/pages/CustomersPage"
import CustomerDetailPage from "../features/customers/pages/CustomerDetailPage"
import AgendaPage from "../features/appointments/pages/AgendaPage"
import CashPage from "../features/payments/pages/CashPage"
import AnalysisPage from "../features/analytics/pages/AnalysisPage"
import AdminSales from "../pages/AdminSales"
import AdminProducts from "../pages/AdminProducts"
import AdminProductNew from "../pages/AdminProductNew"
import ServicesPage from "../features/catalog/pages/ServicesPage"
import ServiceFormPage from "../features/catalog/pages/ServiceFormPage"
import SchedulePage from "../features/appointments/pages/SchedulePage"
import ClosedDaysPage from "../features/appointments/pages/ClosedDaysPage"
import BookingRulesPage from "../features/appointments/pages/BookingRulesPage"
import BusinessPage from "../features/settings/pages/BusinessPage"
import MercadoPagoPage from "../features/settings/pages/MercadoPagoPage"
import AccountPage from "../features/auth/pages/AccountPage"
import RemindersPage from "../features/reminders/pages/RemindersPage"
import ReminderTypesPage from "../features/reminders/pages/ReminderTypesPage"

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
        <Route path="/" element={<TodayPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/clientes/:id" element={<CustomerDetailPage />} />
        <Route path="/servicios" element={<ServicesPage />} />
        <Route path="/servicios/:id" element={<ServiceFormPage />} />
        <Route path="/finanzas" element={<CashPage />} />
        <Route path="/finanzas/analisis" element={<AnalysisPage />} />
        {/* Direcciones viejas de Finanzas, por si quedaron guardadas */}
        <Route path="/finanzas/caja" element={<Navigate to="/finanzas" replace />} />
        <Route path="/finanzas/turnos" element={<Navigate to="/finanzas/analisis" replace />} />
        <Route path="/turnos" element={<AgendaPage />} />
        <Route path="/turnos/horario" element={<SchedulePage />} />
        <Route path="/turnos/dias-cerrados" element={<ClosedDaysPage />} />
        <Route path="/turnos/reglas" element={<BookingRulesPage />} />
        <Route path="/ventas" element={<AdminSales />} />
        <Route path="/productos" element={<AdminProducts />} />
        <Route path="/productos/nuevo" element={<AdminProductNew />} />
        <Route path="/recordatorios" element={<RemindersPage />} />
        <Route path="/recordatorios/mensajes" element={<ReminderTypesPage />} />
        <Route path="/ajustes" element={<BusinessPage />} />
        <Route path="/ajustes/mercadopago" element={<MercadoPagoPage />} />
        <Route path="/ajustes/cuenta" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
