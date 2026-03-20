import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, DollarSign, Tag, MessageSquare, SlidersHorizontal, MapPin, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

const INDUSTRY_PILLS = [
  "Tecnología",
  "Finanzas",
  "Deportes",
  "Entretenimiento",
  "Alimentos",
  "Salud",
  "Moda",
  "Educación",
];

const BUDGET_OPTIONS = [
  { label: "Sin límite", value: "" },
  { label: "< $5.000", value: "5000" },
  { label: "< $10.000", value: "10000" },
  { label: "< $25.000", value: "25000" },
  { label: "< $50.000", value: "50000" },
  { label: "< $100.000", value: "100000" },
];

export default function SponsorsPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeIndustry, setActiveIndustry] = useState("Todos");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [sponsorsRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "sponsor"),
        profile ? supabase.from("events").select("*").eq("organizer_id", profile.id) : Promise.resolve({ data: [] }),
      ]);
      setSponsors(sponsorsRes.data || []);
      setEvents(eventsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const filteredSponsors = sponsors.filter((s) => {
    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !s.name.toLowerCase().includes(q) &&
        !(s.industry || "").toLowerCase().includes(q) &&
        !(s.tags || []).some((t) => t.toLowerCase().includes(q))
      )
        return false;
    }

    // Industry pill
    if (activeIndustry !== "Todos" && (s.industry || "").toLowerCase() !== activeIndustry.toLowerCase())
      return false;

    // Budget
    if (budgetFilter && budgetFilter !== "any") {
      const max = parseInt(budgetFilter);
      if ((s.budget_max ?? 0) >= max) return false;
    }

    // Verified
    if (verifiedFilter === "verified" && !s.verified) return false;
    if (verifiedFilter === "unverified" && s.verified) return false;

    return true;
  });

  const getAvgMatchForSponsor = (sponsor: Profile) => {
    if (events.length === 0) return 0;
    const scores = events.map((e) => calculateMatchScore(e, sponsor));
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const startConversation = async (e: React.MouseEvent, sponsor: Profile, event: Event) => {
    e.stopPropagation();
    if (!profile) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("event_id", event.id)
      .eq("organizer_id", profile.id)
      .eq("sponsor_id", sponsor.id)
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        event_id: event.id,
        organizer_id: profile.id,
        sponsor_id: sponsor.id,
      })
      .select()
      .single();

    if (error) toast.error(error.message);
    else navigate(`/messages?conversation=${data.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Buscar Sponsors</h1>
          <p className="text-muted-foreground">Encuentra sponsors ideales para tus eventos</p>
        </div>

        {/* Search + Filters toggle */}
        <div className="flex gap-3 items-center animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, industria, tags..."
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

        {/* Industry pills */}
        <div className="flex flex-wrap gap-2 animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <button
            onClick={() => setActiveIndustry("Todos")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeIndustry === "Todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            Todos
          </button>
          {INDUSTRY_PILLS.map((ind) => (
            <button
              key={ind}
              onClick={() => setActiveIndustry(activeIndustry === ind ? "Todos" : ind)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                activeIndustry === ind
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              )}
            >
              {ind}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-sm">Filtros avanzados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Verificación</label>
                <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="verified">Verificados</SelectItem>
                    <SelectItem value="unverified">No verificados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Sponsors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No hay sponsors registrados</h3>
            <p className="text-muted-foreground mt-1">Aún no hay sponsors en la plataforma</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSponsors.map((sponsor, i) => {
              const avgMatch = getAvgMatchForSponsor(sponsor);
              return (
                <div
                  key={sponsor.id}
                  onClick={() => navigate(`/sponsors/${sponsor.id}`)}
                  className="bg-card rounded-xl shadow-card overflow-hidden cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-1 active:scale-[0.98] animate-slide-up"
                  style={{ animationDelay: `${0.05 * i}s`, animationFillMode: "both" }}
                >
                  {/* Cover area */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-muted flex items-center justify-center">
                    <div className="h-16 w-16 rounded-2xl bg-card shadow-md flex items-center justify-center">
                      {sponsor.avatar_url ? (
                        <img src={sponsor.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {/* Match badge */}
                    {events.length > 0 && (
                      <div className="absolute top-3 right-3">
                        <MatchBadge score={avgMatch} size="sm" />
                      </div>
                    )}
                    {/* Verified badge */}
                    {sponsor.verified && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                        Verificado
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold text-base">{sponsor.name}</h3>
                      {sponsor.industry && (
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {sponsor.industry}
                        </p>
                      )}
                    </div>

                    {sponsor.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 text-center">{sponsor.description}</p>
                    )}

                    {/* Budget + Tags row */}
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {sponsor.budget_max != null && sponsor.budget_max > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                          <DollarSign className="h-3 w-3" />
                          ${sponsor.budget_min?.toLocaleString()} - ${sponsor.budget_max.toLocaleString()}
                        </span>
                      )}
                      {sponsor.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          <Tag className="h-3 w-3" /> {tag}
                        </span>
                      ))}
                    </div>

                    {/* Contact button */}
                    {events.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-full"
                        onClick={(e) => startConversation(e, sponsor, events[0])}
                      >
                        <MessageSquare className="h-4 w-4 mr-1.5" /> Contactar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
