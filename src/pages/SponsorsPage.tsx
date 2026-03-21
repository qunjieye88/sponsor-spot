import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SponsorCard } from "@/components/SponsorCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import { resolveAvatar } from "@/lib/avatar";

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
  const [savedSponsorIds, setSavedSponsorIds] = useState<Set<string>>(new Set());
  const [savingSponsor, setSavingSponsor] = useState<string | null>(null);

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

      // Fetch saved sponsors
      if (profile) {
        const { data: savedData } = await supabase
          .from("saved_sponsors")
          .select("sponsor_id")
          .eq("profile_id", profile.id);
        if (savedData) {
          setSavedSponsorIds(new Set(savedData.map((s: any) => s.sponsor_id)));
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const toggleSaveSponsor = async (e: React.MouseEvent, sponsorId: string) => {
    e.stopPropagation();
    if (!profile || savingSponsor) return;
    setSavingSponsor(sponsorId);
    const isSaved = savedSponsorIds.has(sponsorId);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_sponsors")
        .delete()
        .eq("profile_id", profile.id)
        .eq("sponsor_id", sponsorId);
      if (error) toast.error(error.message);
      else {
        setSavedSponsorIds((prev) => { const next = new Set(prev); next.delete(sponsorId); return next; });
        toast.success("Sponsor eliminado de guardados");
      }
    } else {
      const { error } = await supabase
        .from("saved_sponsors")
        .insert({ profile_id: profile.id, sponsor_id: sponsorId });
      if (error) toast.error(error.message);
      else {
        setSavedSponsorIds((prev) => new Set(prev).add(sponsorId));
        toast.success("Sponsor guardado");
      }
    }
    setSavingSponsor(null);
  };

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
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  avgMatch={avgMatch}
                  showMatch={events.length > 0}
                  isSaved={savedSponsorIds.has(sponsor.id)}
                  onToggleSave={profile ? toggleSaveSponsor : undefined}
                  showContact={events.length > 0}
                  onContact={(e, s) => startConversation(e, s, events[0])}
                  animationDelay={0.05 * i}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
