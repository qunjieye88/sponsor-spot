import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Building2, DollarSign, Tag, MessageSquare, Globe, Briefcase, Zap } from "lucide-react";
import type { Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

export default function SponsorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const [sponsor, setSponsor] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [sponsorRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        profile
          ? supabase.from("events").select("*").eq("organizer_id", profile.id)
          : Promise.resolve({ data: [] as Event[], error: null }),
      ]);
      setSponsor(sponsorRes.data);
      setEvents((eventsRes.data as Event[]) || []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id, profile]);

  const startConversation = async (event: Event) => {
    if (!profile || !sponsor) return;
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
      .insert({ event_id: event.id, organizer_id: profile.id, sponsor_id: sponsor.id })
      .select()
      .single();

    if (error) toast.error(error.message);
    else navigate(`/messages?conversation=${data.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-card rounded-2xl h-64 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sponsor) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Sponsor no encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  const avgMatch =
    events.length > 0
      ? Math.round(events.map((e) => calculateMatchScore(e, sponsor)).reduce((a, b) => a + b, 0) / events.length)
      : 0;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto animate-slide-up">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{sponsor.name}</h1>
                {sponsor.industry && (
                  <p className="text-muted-foreground">{sponsor.industry}</p>
                )}
                {sponsor.verified && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-medium">
                    Verificado
                  </span>
                )}
              </div>
            </div>
            {events.length > 0 && <MatchBadge score={avgMatch} size="lg" />}
          </div>

          {/* Description */}
          {sponsor.description && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-1">Descripción</h2>
              <p className="text-sm leading-relaxed">{sponsor.description}</p>
            </div>
          )}

          {/* Budget */}
          {sponsor.budget_max != null && sponsor.budget_max > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Presupuesto: ${sponsor.budget_min?.toLocaleString()} – ${sponsor.budget_max.toLocaleString()} USD
              </span>
            </div>
          )}

          {/* Tags */}
          {sponsor.tags && sponsor.tags.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Intereses</h2>
              <div className="flex flex-wrap gap-1.5">
                {sponsor.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary/10 text-primary text-xs font-medium">
                    <Tag className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred activations */}
          {sponsor.preferred_activations && sponsor.preferred_activations.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Activaciones preferidas</h2>
              <div className="flex flex-wrap gap-1.5">
                {sponsor.preferred_activations.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-accent/10 text-accent text-xs font-medium">
                    <Zap className="h-3 w-3" /> {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {sponsor.social_links && sponsor.social_links.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Links</h2>
              <div className="space-y-1">
                {sponsor.social_links.map((link) => (
                  <a
                    key={link}
                    href={link.startsWith("http") ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contact buttons per event */}
          {profile?.role === "organizer" && events.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Contactar sobre evento</h2>
              {events.map((event) => (
                <Button
                  key={event.id}
                  variant="outline"
                  className="w-full rounded-pill justify-start items-center"
                  onClick={() => startConversation(event)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{event.title}</span>
                  <div className="ml-auto shrink-0 flex items-center justify-center">
                    <MatchBadge score={calculateMatchScore(event, sponsor)} size="sm" className="!flex-row !gap-1.5 [&>div]:h-8 [&>div]:w-8" />
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
