import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CalendarDays, MapPin, ZoomIn, ZoomOut, Locate, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type EventWithCoords = Event & { latitude: number; longitude: number };

/* ── Pin icon ── */
function createPin(isActive: boolean) {
  const size = isActive ? 36 : 28;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50% 50% 50% 0;
        background: hsl(var(--primary));
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border: 3px solid white;
        transition: all 0.2s ease;
      ">
        <svg style="transform:rotate(45deg)" width="${size * 0.45}" height="${size * 0.45}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

/* ── Popup card rendered into DOM for Leaflet ── */
function PopupContent({
  event,
  matchScore,
  onOpen,
}: {
  event: EventWithCoords;
  matchScore: number | null;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      style={{ cursor: "pointer", width: 260, fontFamily: "inherit" }}
    >
      {event.media && event.media.length > 0 ? (
        <img
          src={event.media[0]}
          alt={event.title}
          style={{
            width: "100%",
            height: 140,
            objectFit: "cover",
            borderRadius: 10,
            marginBottom: 10,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 140,
            borderRadius: 10,
            marginBottom: 10,
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
          }}
        />
      )}
      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginBottom: 6, color: "#111" }}>
        {event.title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#666", marginBottom: 8 }}>
        {event.date && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            📅 {format(new Date(event.date), "d MMM yyyy", { locale: es })}
          </span>
        )}
        {event.location && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            📍 {event.location}
          </span>
        )}
      </div>
      {matchScore !== null && (
        <span
          style={{
            display: "inline-block",
            padding: "3px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            background: "hsl(var(--primary) / 0.12)",
            color: "hsl(var(--primary))",
          }}
        >
          {matchScore}% Match
        </span>
      )}
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "hsl(var(--primary))",
        }}
      >
        Ver detalle →
      </div>
    </div>
  );
}

/* ── Map page ── */
export default function EventsMapPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const popupRootsRef = useRef<Array<{ root: ReturnType<typeof createRoot>; el: HTMLElement }>>([]);
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const [eventCount, setEventCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const openEvent = useCallback((id: string) => navigate(`/events/${id}`), [navigate]);

  /* ── Fetch events in visible bounds ── */
  const fetchVisibleEvents = useCallback(async () => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer || !profile) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .gte("latitude", sw.lat)
      .lte("latitude", ne.lat)
      .gte("longitude", sw.lng)
      .lte("longitude", ne.lng)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(200);

    if (!data) return;

    const newEvents = data.filter((e) => !loadedIdsRef.current.has(e.id)) as EventWithCoords[];

    newEvents.forEach((event) => {
      loadedIdsRef.current.add(event.id);

      const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;
      const marker = L.marker([event.latitude, event.longitude], {
        icon: createPin(false),
      });

      marker.on("mouseover", () => marker.setIcon(createPin(true)));
      marker.on("mouseout", () => marker.setIcon(createPin(false)));

      // Popup
      const container = document.createElement("div");
      const root = createRoot(container);
      root.render(
        <PopupContent event={event} matchScore={matchScore} onOpen={() => openEvent(event.id)} />
      );
      popupRootsRef.current.push({ root, el: container });
      marker.bindPopup(container, {
        maxWidth: 300,
        minWidth: 260,
        closeButton: true,
        className: "map-event-popup",
      });

      marker.addTo(layer);
    });

    setEventCount(loadedIdsRef.current.size);
  }, [profile, openEvent]);

  /* ── Init map ── */
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-15, -60], 4); // Centered on LATAM

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: "bottomleft" }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      popupRootsRef.current.forEach(({ root, el }) => {
        root.unmount();
        el.remove();
      });
      popupRootsRef.current = [];
      loadedIdsRef.current.clear();
      markerLayerRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  /* ── Bind move/zoom listeners ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Initial load
    fetchVisibleEvents();

    const onMoveEnd = () => fetchVisibleEvents();
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [mapReady, fetchVisibleEvents]);

  /* ── Custom zoom controls ── */
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleLocateMe = () => {
    mapRef.current?.locate({ setView: true, maxZoom: 12 });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      {/* Map takes all remaining space */}
      <div className="relative flex-1">
        <div ref={mapElRef} className="absolute inset-0" />

        {/* Top-left: Back + counter badge */}
        <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 rounded-xl bg-card/95 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="rounded-xl bg-card/95 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm">
            <span className="font-bold text-primary">{eventCount}</span>{" "}
            <span className="text-muted-foreground">evento{eventCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Right: Zoom controls */}
        <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:shadow-xl"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:shadow-xl"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={handleLocateMe}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:shadow-xl"
          >
            <Locate className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Global popup styles */}
      <style>{`
        .map-event-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        .map-event-popup .leaflet-popup-content {
          margin: 12px;
          line-height: 1.4;
        }
        .map-event-popup .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
