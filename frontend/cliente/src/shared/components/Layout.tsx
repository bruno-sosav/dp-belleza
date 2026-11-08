import { Outlet, useLocation } from "react-router-dom"
import Navbar from "./Navbar"
import Footer from "./Footer"
import ErrorBoundary from "./ErrorBoundary"
import CartDrawer from "../../features/ecommerce/components/CartDrawer"

/** Marco de las páginas públicas (tienda, turnera, landing). El panel /admin usa el suyo. */
export default function Layout() {
  // La key reinicia el aviso de error al cambiar de página.
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
