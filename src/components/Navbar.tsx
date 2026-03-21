import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Search,
  MessageSquare,
  LogOut,
  User,
  Menu,
  X,
  Inbox,
} from "lucide-react";
import { useState } from "react";
import { resolveAvatar } from "@/lib/avatar";

export function Navbar() {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const navItems = profile?.role === "organizer"
    ? [
        { label: "Mis Eventos", href: "/dashboard", icon: CalendarDays },
        { label: "Buscar Sponsors", href: "/sponsors", icon: Search },
        { label: "Solicitudes", href: "/contact-requests", icon: Inbox },
        { label: "Mensajes", href: "/messages", icon: MessageSquare },
      ]
    : [
        { label: "Explorar Eventos", href: "/dashboard", icon: Search },
        { label: "Solicitudes", href: "/contact-requests", icon: Inbox },
        { label: "Mensajes", href: "/messages", icon: MessageSquare },
      ];

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">Sy</span>
          </div>
          <span className="hidden sm:inline">Sponsorly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="h-7 w-7 rounded-full overflow-hidden">
              <img src={resolveAvatar(profile?.avatar_url, profile?.id || "")} alt="" className="h-7 w-7 rounded-full object-cover" />
            </div>
            <span className="text-sm font-medium">{profile?.name}</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2 animate-slide-up">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted w-full"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
