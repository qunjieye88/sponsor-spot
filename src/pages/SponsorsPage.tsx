import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, DollarSign, Tag, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

export default function SponsorsPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.industry || "").toLowerCase().includes(q) ||
      (s.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const getAvgMatchForSponsor = (sponsor: Profile) => {
    if (events.length === 0) return 0;
    const scores = events.map((e) => calculateMatchScore(e, sponsor));
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const startConversation = async (sponsor: Profile, event: Event) => {
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
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Buscar Sponsors</h1>
          <p className="text-muted-foreground">Encuentra sponsors ideales para tus eventos</p>
        </div>

        <div className="relative animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, industria, tags..."
            className="pl-10 rounded-pill bg-card"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No hay sponsors registrados</h3>
            <p className="text-muted-foreground mt-1">Aún no hay sponsors en la plataforma</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSponsors.map((sponsor, i) => {
              const avgMatch = getAvgMatchForSponsor(sponsor);
              return (
                <div
                  key={sponsor.id}
                  onClick={() => navigate(`/sponsors/${sponsor.id}`)}
                  className="bg-card rounded-xl shadow-card p-5 space-y-4 animate-slide-up transition-all hover:shadow-card-hover hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
                  style={{ animationDelay: `${0.05 * i}s`, animationFillMode: "both" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{sponsor.name}</h3>
                        {sponsor.industry && (
                          <p className="text-sm text-muted-foreground">{sponsor.industry}</p>
                        )}
                      </div>
                    </div>
                    {events.length > 0 && <MatchBadge score={avgMatch} size="sm" />}
                  </div>

                  {sponsor.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{sponsor.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {sponsor.budget_max != null && sponsor.budget_max > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-muted text-xs">
                        <DollarSign className="h-3 w-3" />
                        ${sponsor.budget_min?.toLocaleString()} - ${sponsor.budget_max.toLocaleString()}
                      </span>
                    )}
                    {sponsor.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-medium">
                        <Tag className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>

                  {events.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-pill w-full"
                      onClick={() => startConversation(sponsor, events[0])}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" /> Contactar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
