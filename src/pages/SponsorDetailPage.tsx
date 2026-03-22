import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, DollarSign, Tag, MessageSquare, Globe, Briefcase,
  Zap, Shield, Check, X, CheckCircle2, Users, Target, Heart,
} from "lucide-react";
import type { Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore, getMatchBreakdown } from "@/lib/supabase-helpers";
import { resolveAvatar } from "@/lib/avatar";

export default function SponsorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const [sponsor, setSponsor] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingConvs, setExistingConvs] = useState<Record<string, string>>({});
  const [existingRequests, setExistingRequests] = useState<Record<string, string>>({});
  const [sendingEvent, setSendingEvent] = useState<string | null>(null);
  const [lockedEvents, setLockedEvents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [sponsorRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        profile
          ? supabase.from("events").select("*").eq("organizer_id", profile.id)
          : Promise.resolve({ data: [] as Event[], error: null }),
      ]);
      setSponsor(sponsorRes.data);
      const evts = (eventsRes.data as Event[]) || [];
      setEvents(evts);

      if (profile && id && evts.length > 0) {
        const [convsRes, reqsRes] = await Promise.all([
          supabase.from("conversations").select("id, event_id").eq("organizer_id", profile.id).eq("sponsor_id", id),
          supabase.from("contact_requests").select("id, event_id, status").eq("organizer_id", profile.id).eq("sponsor_id", id),
        ]);
        if (convsRes.data) {
          const map: Record<string, string> = {};
          convsRes.data.forEach((c) => { map[c.event_id] = c.id; });
          setExistingConvs(map);
        }
        if (reqsRes.data) {
          const map: Record<string, string> = {};
          reqsRes.data.forEach((r) => { map[r.event_id] = r.status; });
          setExistingRequests(map);
        }
      }
      setLoading(false);
    };
    if (id) fetchData();
  }, [id, profile]);

  const startConversation = async (event: Event) => {
    if (!profile || !sponsor || sendingEvent || lockedEvents[event.id]) return;
    if (existingConvs[event.id]) {
      navigate(`/messages?conversation=${existingConvs[event.id]}`);
      return;
    }
    if (existingRequests[event.id]) return;

    setSendingEvent(event.id);
    setLockedEvents((prev) => ({ ...prev, [event.id]: true }));

    const { error } = await supabase.from("conversations").insert({
      event_id: event.id, organizer_id: profile.id, sponsor_id: sponsor.id,
    });
    if (error) {
      toast.error(error.message);
      setSendingEvent(null);
      setLockedEvents((prev) => { const next = { ...prev }; delete next[event.id]; return next; });
      return;
    }

    const { data: created } = await supabase
      .from("conversations").select("id")
      .eq("event_id", event.id).eq("organizer_id", profile.id).eq("sponsor_id", sponsor.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!created) {
      toast.error("No se pudo abrir la conversación");
      setSendingEvent(null);
      return;
    }
    setExistingConvs((prev) => ({ ...prev, [event.id]: created.id }));
    navigate(`/messages?conversation=${created.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl h-80 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-xl h-24 animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!sponsor) {
    return (
      <DashboardLayout>
        <div className="text-center py-16"><p className="text-muted-foreground">Sponsor no encontrado</p></div>
      </DashboardLayout>
    );
  }

  // Find best matching event for the breakdown
  const bestEvent = events.length > 0
    ? events.reduce((best, e) => {
        const score = calculateMatchScore(e, sponsor);
        return score > (best.score || 0) ? { event: e, score } : best;
      }, { event: events[0], score: calculateMatchScore(events[0], sponsor) })
    : null;

  const avgMatch = events.length > 0
    ? Math.round(events.map((e) => calculateMatchScore(e, sponsor)).reduce((a, b) => a + b, 0) / events.length)
    : 0;

  const matchBreakdown = bestEvent ? getMatchBreakdown(bestEvent.event, sponsor, "organizer") : null;

  const details = [
    { label: "Industria", value: sponsor.industry, icon: Briefcase },
    {
      label: "Presupuesto",
      value: sponsor.budget_max != null && sponsor.budget_max > 0
        ? `$${(sponsor.budget_min || 0).toLocaleString()} – $${sponsor.budget_max.toLocaleString()} USD`
        : null,
      icon: DollarSign,
    },
    {
      label: "Audiencias preferidas",
      value: sponsor.preferred_audiences?.length ? sponsor.preferred_audiences.join(", ") : null,
      icon: Users,
    },
    {
      label: "Sectores preferidos",
      value: sponsor.preferred_sectors?.length ? sponsor.preferred_sectors.join(", ") : null,
      icon: Target,
    },
    {
      label: "Tipos de evento preferidos",
      value: sponsor.preferred_event_types?.length ? sponsor.preferred_event_types.join(", ") : null,
      icon: Heart,
    },
  ].filter(d => d.value);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-slide-up space-y-0">
        {/* Hero */}
        <div className="relative h-[280px] md:h-[340px] rounded-t-2xl overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-accent/15" />
          {/* Decorative */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/10 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 px-6 md:px-10 pb-8 space-y-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <div className="flex items-end gap-5">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-xl shrink-0">
                <img src={resolveAvatar(sponsor.avatar_url, sponsor.id)} alt={sponsor.name} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{sponsor.name}</h1>
                  {sponsor.verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold">
                      <Shield className="h-3 w-3" /> Verificado
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-white/80 text-sm">
                  {sponsor.industry && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" /> {sponsor.industry}
                    </span>
                  )}
                  {sponsor.budget_max != null && sponsor.budget_max > 0 && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      ${(sponsor.budget_min || 0).toLocaleString()} – ${sponsor.budget_max.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-0">
          {/* Left column */}
          <div className="flex-1 space-y-8 py-8">
            {/* Description */}
            {sponsor.description && (
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{sponsor.description}</p>
              </div>
            )}

            {/* Details grid */}
            {details.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Información del Sponsor</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {details.map((d) => {
                    const Icon = d.icon;
                    return (
                      <div key={d.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" /> {d.label}
                        </p>
                        <p className="font-semibold text-sm">{d.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {sponsor.tags && sponsor.tags.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Intereses</h2>
                <div className="flex flex-wrap gap-2">
                  {sponsor.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred activations */}
            {sponsor.preferred_activations && sponsor.preferred_activations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Activaciones Preferidas</h2>
                <div className="flex flex-wrap gap-2">
                  {sponsor.preferred_activations.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-accent/5 text-sm font-medium">
                      <Zap className="h-3.5 w-3.5 text-primary" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {sponsor.social_links && sponsor.social_links.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Links</h2>
                <div className="space-y-2">
                  {sponsor.social_links.map((link) => (
                    <a
                      key={link}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-primary hover:bg-accent/5 transition-colors"
                    >
                      <Globe className="h-4 w-4 shrink-0" /> {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          {profile?.role === "organizer" && events.length > 0 && (
            <div className="lg:w-[340px] shrink-0 py-8">
              <div className="lg:sticky lg:top-6 space-y-4">
                {/* Match Score card */}
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-28 w-28">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${avgMatch * 2.64} ${264 - avgMatch * 2.64}`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold tabular-nums">
                        {avgMatch}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">Match Score</p>
                    <p className="text-xs text-muted-foreground text-center">
                      Compatibilidad promedio con tus eventos
                    </p>
                  </div>

                  {/* Breakdown */}
                  {matchBreakdown && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Basado en: <span className="font-medium text-foreground">{bestEvent?.event.title}</span>
                      </p>
                      {matchBreakdown.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={`flex items-center gap-1 text-xs font-medium ${item.compatible ? "text-emerald-500" : "text-destructive"}`}>
                              {item.compatible ? (
                                <><Check className="h-3.5 w-3.5" /> Compatible</>
                              ) : (
                                <><X className="h-3.5 w-3.5" /> No compatible</>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/80 leading-snug">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact per event */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="font-semibold text-sm">Contactar sobre evento</h3>
                  {events.map((event) => {
                    const hasConv = !!existingConvs[event.id];
                    const reqStatus = existingRequests[event.id];
                    const isSending = sendingEvent === event.id;
                    const isLocked = !!lockedEvents[event.id];
                    const isDisabled = (!hasConv && (!!reqStatus || isSending || isLocked));
                    const score = calculateMatchScore(event, sponsor);

                    let statusLabel = "";
                    let statusIcon = <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />;
                    if (hasConv) {
                      statusLabel = "Ir al chat";
                      statusIcon = <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
                    } else if (reqStatus) {
                      statusLabel = reqStatus === "pending" ? "Pendiente" : reqStatus === "accepted" ? "Aceptado" : "Rechazado";
                      statusIcon = <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />;
                    } else if (isSending || isLocked) {
                      statusLabel = "Enviando...";
                    }

                    return (
                      <button
                        key={event.id}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                          hasConv
                            ? "border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                            : isDisabled
                              ? "border-border bg-muted/30 text-muted-foreground cursor-default"
                              : "border-border bg-card hover:bg-accent/5 hover:border-primary/30"
                        }`}
                        onClick={() => hasConv ? navigate(`/messages?conversation=${existingConvs[event.id]}`) : startConversation(event)}
                      >
                        {statusIcon}
                        <span className="truncate text-left flex-1">{event.title}</span>
                        {statusLabel && (
                          <span className={`text-xs font-medium whitespace-nowrap ${hasConv ? "text-primary" : "text-primary"}`}>{statusLabel}</span>
                        )}
                        <span className={`text-xs font-bold tabular-nums ${score >= 70 ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {score}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
