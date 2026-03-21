import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Users, ArrowLeft, User,
  CheckCircle2, Send, Shield, MessageSquare, Loader2, Check, X, Building2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile, ContactRequest } from "@/lib/supabase-helpers";
import { calculateMatchScore, getMatchBreakdown } from "@/lib/supabase-helpers";

const mockPackages = [
  { name: "Gold", benefits: ["Logo en escenario principal", "Stand 6x3m", "10 pases VIP", "Mención en RRSS"] },
  { name: "Silver", benefits: ["Logo en materiales", "Stand 3x3m", "5 pases VIP"] },
  { name: "Bronze", benefits: ["Logo en web", "2 pases VIP", "Mención en newsletter"] },
];

function getPackagePrice(event: Event, idx: number) {
  if (!event.sponsorship_min || !event.sponsorship_max) return null;
  const range = event.sponsorship_max - event.sponsorship_min;
  const prices = [
    event.sponsorship_max,
    Math.round(event.sponsorship_min + range * 0.5),
    event.sponsorship_min,
  ];
  return prices[idx];
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [confirmedSponsorProfiles, setConfirmedSponsorProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactRequest, setContactRequest] = useState<ContactRequest | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("events").select("*").eq("id", id).single().then(({ data }) => {
      setEvent(data);
      if (data) {
        const orgPromise = supabase.from("profiles").select("*").eq("id", data.organizer_id).single();
        const reqPromise = profile?.role === "sponsor"
          ? supabase.from("contact_requests").select("*").eq("event_id", id).eq("sponsor_id", profile.id).maybeSingle()
          : Promise.resolve({ data: null, error: null });
        const sponsorsPromise = (data.confirmed_sponsors && data.confirmed_sponsors.length > 0)
          ? supabase.from("profiles").select("*").in("id", data.confirmed_sponsors)
          : Promise.resolve({ data: null, error: null });

        Promise.all([orgPromise, reqPromise, sponsorsPromise]).then(([orgRes, reqRes, sponsorsRes]) => {
          setOrganizer(orgRes.data);
          setContactRequest((reqRes as any).data || null);
          if (sponsorsRes?.data) {
            setConfirmedSponsorProfiles(sponsorsRes.data as Profile[]);
          }

          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [id, profile]);

  const handleContactRequest = async () => {
    if (!event || !profile || !organizer || sendingRequest || contactRequest) return;
    setSendingRequest(true);
    const { data, error } = await supabase.from("contact_requests").insert({
      event_id: event.id,
      sponsor_id: profile.id,
      organizer_id: organizer.id,
      status: "pending",
    }).select().single();
    if (error) {
      toast.error(error.message);
      setSendingRequest(false);
    } else {
      setContactRequest(data as unknown as ContactRequest);
      toast.success("Solicitud de contacto enviada");
      // Keep sendingRequest true — the UI will show "Solicitud pendiente" via contactRequest state
    }
  };

  const handleGoToChat = async () => {
    if (!profile || !organizer || !event) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("event_id", event.id)
      .eq("sponsor_id", profile.id)
      .maybeSingle();
    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
      return;
    }
    const { error } = await supabase
      .from("conversations")
      .insert({ event_id: event.id, organizer_id: organizer.id, sponsor_id: profile.id });
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("event_id", event.id)
      .eq("sponsor_id", profile.id)
      .single();
    if (data) navigate(`/messages?conversation=${data.id}`);
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

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-16"><p className="text-muted-foreground">Evento no encontrado</p></div>
      </DashboardLayout>
    );
  }

  const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;
  const matchBreakdown = profile?.role === "sponsor" ? getMatchBreakdown(event, profile) : null;
  const confirmedCount = event.confirmed_sponsors?.length || 0;
  const requestStatus = contactRequest?.status;

  const details = [
    { label: "Tipo", value: event.type },
    { label: "Sector", value: event.sector },
    { label: "Audiencia", value: event.audience },
    {
      label: "Rango de patrocinio",
      value: event.sponsorship_min != null && event.sponsorship_max != null
        ? `$${(event.sponsorship_min / 1000).toFixed(0)}k - $${(event.sponsorship_max / 1000).toFixed(0)}k`
        : null,
    },
    { label: "Sponsors confirmados", value: confirmedCount > 0 ? String(confirmedCount) : null },
    { label: "Estado", value: event.published ? "Abierto" : "Borrador" },
  ].filter(d => d.value);

  const tags = [
    ...(event.sector ? [event.sector.toLowerCase()] : []),
    ...(event.type ? [event.type.toLowerCase()] : []),
    ...(event.audience ? event.audience.split(",").map(t => t.trim().toLowerCase()).slice(0, 3) : []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-slide-up space-y-0">
        {/* Hero */}
        <div className="relative h-[340px] md:h-[420px] rounded-t-2xl overflow-hidden">
          {event.media && event.media.length > 0 ? (
            <img src={event.media[0]} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-6 md:px-10 pb-8 space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a eventos
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md" style={{ lineHeight: 1.1 }}>
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-white/80 text-sm">
              {event.date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(event.date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
              {event.capacity != null && event.capacity > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {event.capacity.toLocaleString()} asistentes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-0">
          {/* Left column */}
          <div className="flex-1 space-y-8 py-8">
            {event.description && (
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {details.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Detalles del Evento</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {details.map((d) => (
                    <div key={d.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-xs text-muted-foreground">{d.label}</p>
                      <p className="font-semibold">{d.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsorship packages */}
            {event.sponsorship_max != null && event.sponsorship_max > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Paquetes de Patrocinio</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockPackages.map((pkg, idx) => {
                    const price = getPackagePrice(event, idx);
                    return (
                      <div key={pkg.name} className="rounded-xl border border-border bg-card p-5 flex flex-col">
                        <h3 className="font-bold text-lg">{pkg.name}</h3>
                        {price && (
                          <p className="text-2xl font-bold mt-1 tabular-nums">
                            ${price.toLocaleString()}
                          </p>
                        )}
                        <ul className="mt-4 space-y-2 flex-1">
                          {pkg.benefits.map((b, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" /> {b}
                            </li>
                          ))}
                        </ul>
                        <Button className="mt-5 w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg">
                          Seleccionar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirmed Sponsors */}
            {confirmedSponsorProfiles.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Sponsors Confirmados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {confirmedSponsorProfiles.map((sp) => (
                    <Link
                      key={sp.id}
                      to={`/sponsors/${sp.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                        <img src={resolveAvatar(sp.avatar_url, sp.id)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{sp.name}</p>
                        {sp.industry && (
                          <p className="text-xs text-muted-foreground">{sp.industry}</p>
                        )}
                      </div>
                      {sp.verified && <Shield className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {organizer && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Organizador</h2>
                <Link
                  to={`/organizers/${organizer.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {organizer.avatar_url ? (
                      <img src={organizer.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      organizer.name?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{organizer.name}</p>
                      {organizer.verified && <Shield className="h-4 w-4 text-emerald-500" />}
                    </div>
                    {organizer.industry && <p className="text-sm text-muted-foreground">{organizer.industry}</p>}
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          {profile?.role === "sponsor" && (
            <div className="lg:w-[340px] shrink-0 py-8">
              <div className="lg:sticky lg:top-6 space-y-4">
                {/* Match Score card */}
                {matchScore !== null && matchBreakdown && (
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
                            strokeDasharray={`${matchScore * 2.64} ${264 - matchScore * 2.64}`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold tabular-nums">
                          {matchScore}
                        </span>
                      </div>
                      <p className="font-semibold text-sm">Match Score</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Tu marca encaja con el {matchScore}% de la audiencia de este evento.
                      </p>
                    </div>

                    {/* Detailed breakdown */}
                    <div className="space-y-3 pt-2 border-t border-border">
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
                          <p className="text-xs text-muted-foreground/80 leading-snug">
                            {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact button */}
                {requestStatus === "accepted" ? (
                  <Button
                    onClick={handleGoToChat}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg h-12 text-base"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> Contactar Organizador
                  </Button>
                ) : requestStatus === "pending" ? (
                  <Button disabled variant="outline" className="w-full rounded-lg h-12 text-base">
                    <Send className="h-4 w-4 mr-2" /> Solicitud pendiente
                  </Button>
                ) : requestStatus === "rejected" ? (
                  <Button disabled variant="outline" className="w-full rounded-lg h-12 text-base text-destructive">
                    Solicitud rechazada
                  </Button>
                ) : (
                  <Button
                    onClick={handleContactRequest}
                    disabled={sendingRequest}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg h-12 text-base"
                  >
                    {sendingRequest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Contactar Organizador
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
