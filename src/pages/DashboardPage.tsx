import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, MapPin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import { resolveAvatar } from "@/lib/avatar";

const CATEGORY_OPTIONS = [
  { label: "Categoría", value: "all" },
  { label: "Festival Musical", value: "Festival Musical" },
  { label: "Conferencia Tech", value: "Conferencia Tech" },
  { label: "Evento Deportivo", value: "Evento Deportivo" },
  { label: "Gala Benéfica", value: "Gala Benéfica" },
  { label: "Expo & Conferencia", value: "Expo & Conferencia" },
  { label: "Festival Gastronómico", value: "Festival Gastronómico" },
  { label: "Conferencia", value: "Conferencia" },
];

const SIZE_OPTIONS = [
  { label: "Tamaño", value: "all" },
  { label: "< 100", value: "100" },
  { label: "< 500", value: "500" },
  { label: "< 1.000", value: "1000" },
  { label: "< 5.000", value: "5000" },
  { label: "< 10.000", value: "10000" },
];

const AUDIENCE_OPTIONS = [
  { label: "Público", value: "all" },
  { label: "Jóvenes 18-30", value: "Jóvenes 18-30" },
  { label: "Profesionales", value: "Profesionales" },
  { label: "Familias", value: "Familias" },
  { label: "Empresarios", value: "Empresarios" },
  { label: "Estudiantes", value: "Estudiantes" },
];

const BUDGET_OPTIONS = [
  { label: "Presupuesto", value: "all" },
  { label: "< $5.000", value: "5000" },
  { label: "< $10.000", value: "10000" },
  { label: "< $25.000", value: "25000" },
  { label: "< $50.000", value: "50000" },
  { label: "< $100.000", value: "100000" },
];

const SORT_OPTIONS = [
  { label: "Relevancia", value: "match" },
  { label: "Más recientes", value: "recent" },
  { label: "Fecha del evento", value: "date" },
];

export default function DashboardPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, Pick<Profile, "id" | "name" | "avatar_url">>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("match");

  const [locations, setLocations] = useState<string[]>([]);

  // Carousel
  const carouselRef = useRef<HTMLDivElement>(null);

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

    if (data) {
      const locs = [...new Set(data.map((e) => e.location).filter(Boolean))] as string[];
      setLocations(locs);
    }

    if (data && data.length > 0) {
      const orgIds = [...new Set(data.map((e) => e.organizer_id))];
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

    setLoading(false);
  };

  const filteredEvents = events.filter((e) => {
    if (categoryFilter !== "all" && e.type !== categoryFilter) return false;
    if (locationFilter !== "all" && e.location !== locationFilter) return false;
    if (sizeFilter !== "all") {
      const max = parseInt(sizeFilter);
      if ((e.capacity ?? 0) >= max) return false;
    }
    if (audienceFilter !== "all" && e.audience !== audienceFilter) return false;
    if (budgetFilter !== "all") {
      const max = parseInt(budgetFilter);
      if ((e.sponsorship_max ?? 0) >= max) return false;
    }
    return true;
  });

  const sortedEvents = useMemo(() => {
    if (sortBy === "match" && profile?.role === "sponsor") {
      return [...filteredEvents].sort((a, b) => {
        return calculateMatchScore(b, profile) - calculateMatchScore(a, profile);
      });
    }
    if (sortBy === "date") {
      return [...filteredEvents].sort((a, b) => {
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      });
    }
    return filteredEvents;
  }, [filteredEvents, sortBy, profile]);

  // Top 5 matches for carousel
  const topMatches = useMemo(() => {
    if (profile?.role !== "sponsor" || events.length === 0) return [];
    return [...events]
      .map((e) => ({ event: e, score: calculateMatchScore(e, profile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [events, profile]);

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = carouselRef.current.offsetWidth * 0.7;
    carouselRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header + count */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">
            {profile?.role === "organizer" ? "Mis Eventos" : "Explorar eventos"}
          </h1>
          <p className="text-muted-foreground">
            {sortedEvents.length} evento{sortedEvents.length !== 1 ? "s" : ""} disponible{sortedEvents.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Top matches carousel (sponsors only) — ABOVE filters */}
        {profile?.role === "sponsor" && topMatches.length > 0 && (
          <section className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Mayor afinidad para ti</h2>
                  <p className="text-xs text-muted-foreground">Eventos que encajan con tu perfil</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollCarousel("left")}
                  className="p-2 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="p-2 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {topMatches.map(({ event, score }, i) => {
                const org = organizers[event.organizer_id];
                return (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="min-w-[440px] max-w-[480px] flex-shrink-0 snap-start cursor-pointer group"
                  >
                    <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {/* Full-width background image */}
                      <div className="relative h-[260px] overflow-hidden">
                        {event.media && event.media.length > 0 ? (
                          <img
                            src={event.media[0]}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full gradient-primary" />
                        )}
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Match score — top left */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {score}% Match
                        </div>

                        {/* Rank badge — top right */}
                        <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-foreground shadow-md">
                          #{i + 1}
                        </div>

                        {/* Content overlay — bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 mb-2 drop-shadow-sm">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                            {event.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="line-clamp-1">{event.location}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                            {event.sponsorship_max != null && event.sponsorship_max > 0 ? (
                              <span className="text-base font-bold text-white">
                                ${event.sponsorship_max.toLocaleString()}
                              </span>
                            ) : <span />}
                            {org && (
                              <div className="flex items-center gap-2">
                                <img
                                  src={resolveAvatar(org.avatar_url, org.id)}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover ring-2 ring-white/30"
                                />
                                <span className="text-sm text-white/90 line-clamp-1 max-w-[100px]">
                                  {org.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Inline filter bar — BELOW carousel */}
        <div className="flex flex-wrap items-center gap-3 animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-auto min-w-[130px] bg-background border-border rounded-lg h-10 text-sm">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-auto min-w-[120px] bg-background border-border rounded-lg h-10 text-sm">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ciudad</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-auto min-w-[110px] bg-background border-border rounded-lg h-10 text-sm">
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="w-auto min-w-[110px] bg-background border-border rounded-lg h-10 text-sm">
                <SelectValue placeholder="Público" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={budgetFilter} onValueChange={setBudgetFilter}>
              <SelectTrigger className="w-auto min-w-[130px] bg-background border-border rounded-lg h-10 text-sm">
                <SelectValue placeholder="Presupuesto" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-auto min-w-[140px] bg-background border-border rounded-lg h-10 text-sm">
              <SelectValue placeholder="Relevancia" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No hay eventos todavía</h3>
            <p className="text-muted-foreground mt-1">
              {profile?.role === "organizer"
                ? "No tienes eventos asociados aún"
                : "Los organizadores aún no han publicado eventos"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEvents.map((event, i) => (
              <div
                key={event.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.05 * i}s`, animationFillMode: "both" }}
              >
                <EventCard
                  event={event}
                  userRole={profile?.role || "sponsor"}
                  sponsorProfile={profile?.role === "sponsor" ? profile : null}
                  organizer={organizers[event.organizer_id]}
                  currentProfileId={profile?.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
