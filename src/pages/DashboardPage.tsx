import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, CalendarDays, TrendingUp, Users } from "lucide-react";
import type { Event } from "@/lib/supabase-helpers";

export default function DashboardPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [profile]);

  const fetchEvents = async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase.from("events").select("*");

    if (profile.role === "organizer") {
      query = query.eq("organizer_id", profile.id);
    } else {
      query = query.eq("published", true);
    }

    const { data } = await query.order("created_at", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q) ||
      (e.sector || "").toLowerCase().includes(q) ||
      (e.type || "").toLowerCase().includes(q)
    );
  });

  const stats = profile?.role === "organizer"
    ? [
        { label: "Mis Eventos", value: events.length, icon: CalendarDays },
        { label: "Publicados", value: events.filter((e) => e.published).length, icon: TrendingUp },
        { label: "Borradores", value: events.filter((e) => !e.published).length, icon: Users },
      ]
    : [
        { label: "Eventos Disponibles", value: events.length, icon: CalendarDays },
      ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.role === "organizer" ? "Mis Eventos" : "Explorar Eventos"}
            </h1>
            <p className="text-muted-foreground">
              {profile?.role === "organizer"
                ? "Gestiona y publica tus eventos"
                : "Encuentra eventos para patrocinar"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, ubicación, sector..."
            className="pl-10 rounded-pill bg-card"
          />
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No hay eventos todavía</h3>
            <p className="text-muted-foreground mt-1">
              {profile?.role === "organizer"
                ? "Crea tu primer evento para empezar"
                : "Los organizadores aún no han publicado eventos"}
            </p>
            {profile?.role === "organizer" && (
              <Button
                onClick={() => navigate("/events/new")}
                className="mt-4 gradient-primary text-white border-0 rounded-pill"
              >
                <Plus className="h-4 w-4 mr-1" /> Crear Evento
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event, i) => (
              <div
                key={event.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.05 * i}s`, animationFillMode: "both" }}
              >
                <EventCard event={event} userRole={profile?.role || "sponsor"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
