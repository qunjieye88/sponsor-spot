import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

type EventWithCoords = Event & { latitude: number; longitude: number };

type PopupCardProps = {
  event: EventWithCoords;
  matchScore: number | null;
  onOpen: () => void;
};

function PopupCard({ event, matchScore, onOpen }: PopupCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-[240px] text-left"
    >
      {event.media && event.media.length > 0 && (
        <img
          src={event.media[0]}
          alt={event.title}
          className="mb-2 h-32 w-full rounded-lg object-cover"
        />
      )}
      <h3 className="mb-1 text-sm font-bold leading-tight text-foreground">{event.title}</h3>
      <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          {matchScore}% Match
        </span>
      )}
      <p className="mt-2 text-xs font-medium text-primary">Ver detalle →</p>
    </button>
  );
}

function createMarkerIcon(isActive: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${isActive ? 20 : 16}px;height:${isActive ? 20 : 16}px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 10px 20px rgba(0,0,0,.2);"></div>`,
    iconSize: [isActive ? 20 : 16, isActive ? 20 : 16],
    iconAnchor: [isActive ? 10 : 8, isActive ? 10 : 8],
    popupAnchor: [0, -(isActive ? 10 : 8)],
  });
}

export default function EventsMapPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const popupRootsRef = useRef<Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }>>([]);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [locations, setLocations] = useState<string[]>([]);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchEvents = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: true });

      setEvents(data || []);
      const locs = [...new Set((data || []).map((e) => e.location).filter(Boolean))] as string[];
      setLocations(locs);
      setLoading(false);
    };

    fetchEvents();
  }, [profile]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (categoryFilter !== "all" && event.type !== categoryFilter) return false;
      if (locationFilter !== "all" && event.location !== locationFilter) return false;
      return true;
    });
  }, [events, categoryFilter, locationFilter]);

  const eventsWithCoords = useMemo(() => {
    return filteredEvents.filter(
      (event): event is EventWithCoords =>
        typeof (event as Event & { latitude?: number | null }).latitude === "number" &&
        typeof (event as Event & { longitude?: number | null }).longitude === "number"
    );
  }, [filteredEvents]);

  const openEvent = useCallback((eventId: string) => {
    navigate(`/events/${eventId}`);
  }, [navigate]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([40.4168, -3.7038], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      popupRootsRef.current.forEach(({ root, container }) => {
        root.unmount();
        container.remove();
      });
      popupRootsRef.current = [];
      markerLayerRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    popupRootsRef.current.forEach(({ root, container }) => {
      root.unmount();
      container.remove();
    });
    popupRootsRef.current = [];
    markerLayer.clearLayers();

    if (eventsWithCoords.length === 0) {
      map.setView([40.4168, -3.7038], 5);
      return;
    }

    const bounds = L.latLngBounds(eventsWithCoords.map((event) => [event.latitude, event.longitude]));

    eventsWithCoords.forEach((event) => {
      const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;
      const marker = L.marker([event.latitude, event.longitude], {
        icon: createMarkerIcon(hoveredEventId === event.id),
      });

      marker.on("mouseover", () => setHoveredEventId(event.id));
      marker.on("mouseout", () => setHoveredEventId((current) => (current === event.id ? null : current)));
      marker.on("click", () => setHoveredEventId(event.id));

      const popupContainer = document.createElement("div");
      const root = createRoot(popupContainer);
      root.render(
        <PopupCard
          event={event}
          matchScore={matchScore}
          onOpen={() => openEvent(event.id)}
        />
      );
      popupRootsRef.current.push({ root, container: popupContainer });
      marker.bindPopup(popupContainer, { maxWidth: 280, minWidth: 240 });
      marker.addTo(markerLayer);
    });

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [eventsWithCoords, hoveredEventId, openEvent, profile]);

  useEffect(() => {
    mapRef.current?.invalidateSize();
  }, [showList]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <MapIcon className="h-6 w-6 text-primary" />
              Mapa de Eventos
            </h1>
            <p className="text-sm text-muted-foreground">
              {eventsWithCoords.length} evento{eventsWithCoords.length !== 1 ? "s" : ""} con ubicación
            </p>
          </div>
          <button
            onClick={() => setShowList((value) => !value)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted md:hidden"
          >
            {showList ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {showList ? "Ver mapa" : "Ver lista"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 min-w-[150px] w-auto rounded-lg border-border bg-background text-sm">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-9 min-w-[130px] w-auto rounded-lg border-border bg-background text-sm">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-[600px] animate-pulse rounded-2xl bg-card" />
        ) : (
          <div className="flex min-h-[500px] gap-4 h-[calc(100vh-220px)]">
            <div className={cn("flex-1 overflow-hidden rounded-2xl shadow-card", !showList ? "block" : "hidden md:block")}>
              <div ref={mapContainerRef} className="h-full w-full" />
            </div>

            <div className={cn("w-full flex-shrink-0 space-y-3 overflow-y-auto pr-1 md:w-[360px] md:min-w-[320px]", showList ? "block" : "hidden md:block")}>
              {filteredEvents.length === 0 ? (
                <div className="py-16 text-center">
                  <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No hay eventos con los filtros seleccionados</p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const hasCoords = typeof (event as Event & { latitude?: number | null }).latitude === "number" && typeof (event as Event & { longitude?: number | null }).longitude === "number";
                  const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover",
                        hoveredEventId === event.id ? "border-primary shadow-md" : "border-transparent hover:border-border"
                      )}
                      onClick={() => openEvent(event.id)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <div className="flex gap-3">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          {event.media && event.media.length > 0 ? (
                            <img src={event.media[0]} alt={event.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full gradient-primary opacity-70" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{event.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
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
                          <div className="mt-1.5 flex items-center gap-2">
                            {matchScore !== null && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                                {matchScore}%
                              </span>
                            )}
                            {!hasCoords && (
                              <span className="text-[11px] italic text-muted-foreground/60">Sin coordenadas</span>
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
