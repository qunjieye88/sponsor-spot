import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Users, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import { resolveAvatar } from "@/lib/avatar";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const highlightIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [35, 56],
  iconAnchor: [17, 56],
  popupAnchor: [1, -46],
  shadowSize: [56, 56],
  className: "hue-rotate-[160deg] brightness-125 saturate-150",
});

const defaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CATEGORY_OPTIONS = [
  { label: "Todos los tipos", value: "all" },
  { label: "Festival Musical", value: "Festival Musical" },
  { label: "Conferencia Tech", value: "Conferencia Tech" },
  { label: "Evento Deportivo", value: "Evento Deportivo" },
  { label: "Gala Benéfica", value: "Gala Benéfica" },
  { label: "Expo & Conferencia", value: "Expo & Conferencia" },
  { label: "Festival Gastronómico", value: "Festival Gastronómico" },
  { label: "Conferencia", value: "Conferencia" },
];

function FitBounds({ events }: { events: { latitude: number; longitude: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (events.length === 0) return;
    const bounds = L.latLngBounds(events.map((e) => [e.latitude, e.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [events, map]);
  return null;
}

type EventWithCoords = Event & { latitude: number; longitude: number };

export default function EventsMapPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, Pick<Profile, "id" | "name" | "avatar_url">>>({});
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [locations, setLocations] = useState<string[]>([]);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: true });

      setEvents(data || []);

      if (data) {
        const locs = [...new Set(data.map((e) => e.location).filter(Boolean))] as string[];
        setLocations(locs);
        const orgIds = [...new Set(data.map((e) => e.organizer_id))];
        if (orgIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", orgIds);
          if (profiles) {
            const map: Record<string, Pick<Profile, "id" | "name" | "avatar_url">> = {};
            profiles.forEach((p) => { map[p.id] = p; });
            setOrganizers(map);
          }
        }
      }
      setLoading(false);
    })();
  }, [profile]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (categoryFilter !== "all" && e.type !== categoryFilter) return false;
      if (locationFilter !== "all" && e.location !== locationFilter) return false;
      return true;
    });
  }, [events, categoryFilter, locationFilter]);

  const eventsWithCoords = useMemo(() => {
    return filteredEvents.filter(
      (e) => (e as any).latitude != null && (e as any).longitude != null
    ) as EventWithCoords[];
  }, [filteredEvents]);

  const handleEventClick = useCallback((id: string) => navigate(`/events/${id}`), [navigate]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapIcon className="h-6 w-6 text-primary" />
              Mapa de Eventos
            </h1>
            <p className="text-sm text-muted-foreground">
              {eventsWithCoords.length} evento{eventsWithCoords.length !== 1 ? "s" : ""} con ubicación
            </p>
          </div>
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors md:hidden"
          >
            {showList ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {showList ? "Ver mapa" : "Ver lista"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-auto min-w-[150px] bg-background border-border rounded-lg h-9 text-sm">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-auto min-w-[130px] bg-background border-border rounded-lg h-9 text-sm">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Map + List split */}
        {loading ? (
          <div className="h-[600px] bg-card rounded-2xl animate-pulse" />
        ) : (
          <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Map */}
            <div className={cn(
              "rounded-2xl overflow-hidden shadow-card flex-1",
              !showList ? "block" : "hidden md:block"
            )}>
              <MapContainer
                center={[40.4168, -3.7038]}
                zoom={5}
                className="h-full w-full"
                style={{ minHeight: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {eventsWithCoords.length > 0 && (
                  <FitBounds events={eventsWithCoords} />
                )}
                {eventsWithCoords.map((event) => {
                  const org = organizers[event.organizer_id];
                  const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;
                  return (
                    <Marker
                      key={event.id}
                      position={[event.latitude, event.longitude]}
                      icon={hoveredEventId === event.id ? highlightIcon : defaultIcon}
                      eventHandlers={{
                        mouseover: () => setHoveredEventId(event.id),
                        mouseout: () => setHoveredEventId(null),
                      }}
                    >
                      <Popup maxWidth={300} minWidth={260}>
                        <div
                          className="cursor-pointer"
                          onClick={() => handleEventClick(event.id)}
                        >
                          {event.media && event.media.length > 0 && (
                            <img
                              src={event.media[0]}
                              alt={event.title}
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                          )}
                          <h3 className="font-bold text-sm text-foreground leading-tight mb-1">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                            {event.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                          {matchScore !== null && (
                            <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">
                              {matchScore}% Match
                            </span>
                          )}
                          <p className="text-xs text-primary font-medium mt-2">
                            Ver detalle →
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Event list sidebar */}
            <div className={cn(
              "w-full md:w-[360px] md:min-w-[320px] flex-shrink-0 overflow-y-auto space-y-3 pr-1",
              showList ? "block" : "hidden md:block"
            )}>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No hay eventos con los filtros seleccionados</p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const org = organizers[event.organizer_id];
                  const hasCoords = (event as any).latitude != null;
                  const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "bg-card rounded-xl p-3 cursor-pointer transition-all duration-200 border-2",
                        hoveredEventId === event.id
                          ? "border-primary shadow-md"
                          : "border-transparent hover:border-border shadow-card hover:shadow-card-hover"
                      )}
                      onClick={() => handleEventClick(event.id)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          {event.media && event.media.length > 0 ? (
                            <img src={event.media[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full gradient-primary opacity-70" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                            {event.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                            {event.date && (
                              <span className="flex items-center gap-0.5">
                                <CalendarDays className="h-3 w-3" />
                                {format(new Date(event.date), "d MMM", { locale: es })}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">{event.location}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {matchScore !== null && (
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold">
                                {matchScore}%
                              </span>
                            )}
                            {!hasCoords && (
                              <span className="text-[11px] text-muted-foreground/60 italic">Sin coordenadas</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
