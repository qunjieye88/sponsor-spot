import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, CalendarDays, TrendingUp, Users, SlidersHorizontal, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Event, Profile } from "@/lib/supabase-helpers";

const EVENT_TYPES = [
  "Festival Musical",
  "Conferencia Tech",
  "Evento Deportivo",
  "Gala Benéfica",
  "Expo & Conferencia",
  "Festival Gastronómico",
  "Conferencia",
];

const UNIQUE_TYPES = [...new Set(EVENT_TYPES)];

const CAPACITY_OPTIONS = [
  { label: "Cualquiera", value: "" },
  { label: "< 100", value: "100" },
  { label: "< 500", value: "500" },
  { label: "< 1.000", value: "1000" },
  { label: "< 5.000", value: "5000" },
  { label: "< 10.000", value: "10000" },
];

const BUDGET_OPTIONS = [
  { label: "Sin límite", value: "" },
  { label: "< €5.000", value: "5000" },
  { label: "< €10.000", value: "10000" },
  { label: "< €25.000", value: "25000" },
  { label: "< €50.000", value: "50000" },
  { label: "< €100.000", value: "100000" },
];

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Publicado", value: "published" },
  { label: "Borrador", value: "draft" },
];

export default function DashboardPage() {
  const { profile } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, Pick<Profile, "name" | "avatar_url">>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeType, setActiveType] = useState<string>("Todos");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Unique locations from loaded events
  const [locations, setLocations] = useState<string[]>([]);

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

    // Extract unique locations
    if (data) {
      const locs = [...new Set(data.map((e) => e.location).filter(Boolean))] as string[];
      setLocations(locs);
    }

    // Fetch organizer profiles
    if (data && data.length > 0) {
      const orgIds = [...new Set(data.map((e) => e.organizer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", orgIds);
      if (profiles) {
        const map: Record<string, Pick<Profile, "name" | "avatar_url">> = {};
        profiles.forEach((p) => { map[p.id] = { name: p.name, avatar_url: p.avatar_url }; });
        setOrganizers(map);
      }
    }

    setLoading(false);
  };

  const filteredEvents = events.filter((e) => {
    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        e.title.toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q) ||
        (e.sector || "").toLowerCase().includes(q) ||
        (e.type || "").toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Type pill
    if (activeType !== "Todos" && e.type !== activeType) return false;

    // Location
    if (locationFilter && locationFilter !== "all" && e.location !== locationFilter) return false;

    // Capacity
    if (capacityFilter && capacityFilter !== "any") {
      const max = parseInt(capacityFilter);
      if ((e.capacity ?? 0) >= max) return false;
    }

    // Budget
    if (budgetFilter && budgetFilter !== "any") {
      const max = parseInt(budgetFilter);
      if ((e.sponsorship_max ?? 0) >= max) return false;
    }

    // Status
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "published" && !e.published) return false;
      if (statusFilter === "draft" && e.published) return false;
    }

    // Date from
    if (dateFrom && e.date) {
      if (new Date(e.date) < dateFrom) return false;
    }

    // Date to
    if (dateTo && e.date) {
      if (new Date(e.date) > dateTo) return false;
    }

    return true;
  });


        {/* Search + Filters toggle */}
        <div className="flex gap-3 items-center animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, ubicación..."
              className="pl-10 rounded-full bg-card"
            />
          </div>
          <Button
            variant={showAdvanced ? "default" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="shrink-0 gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-2 animate-slide-up" style={{ animationDelay: "0.18s", animationFillMode: "both" }}>
          <button
            onClick={() => setActiveType("Todos")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeType === "Todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            Todos
          </button>
          {UNIQUE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? "Todos" : type)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                activeType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-sm">Filtros avanzados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Ubicación</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Aforo mínimo</label>
                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any"} value={opt.value || "any"}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Presupuesto máx.</label>
                <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sin límite" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any"} value={opt.value || "any"}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "all"} value={opt.value || "all"}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Fecha desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={es}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date to */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Fecha hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={es}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
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
            {filteredEvents.map((event, i) => (
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
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
