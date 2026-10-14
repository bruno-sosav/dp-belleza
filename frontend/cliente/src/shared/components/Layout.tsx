import { Outlet } from "react-router-dom"
import AnnouncementBar from "./AnnouncementBar"
import Navbar from "./Navbar"
import Footer from "./Footer"
import CartDrawer from "./CartDrawer"

/** Marco de las páginas públicas (tienda, turnera, landing). El panel /admin usa el suyo. */
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
