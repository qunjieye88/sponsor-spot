import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Users, Euro, Tag, ArrowLeft, User,
  CheckCircle2, Send, Award, Shield, MessageSquare, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile, ContactRequest } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

const mockPackages = [
  { name: "Bronce", level: "bronze", benefits: ["Logo en web del evento", "Mención en redes sociales", "2 entradas VIP"] },
  { name: "Plata", level: "silver", benefits: ["Todo lo de Bronce", "Stand de 3x3m", "Logo en materiales impresos", "5 entradas VIP"] },
  { name: "Oro", level: "gold", benefits: ["Todo lo de Plata", "Charla de 15 min en escenario", "Stand premium 5x5m", "10 entradas VIP", "Branding exclusivo en zona principal"] },
];

function getPackagePrice(event: Event, idx: number) {
  if (!event.sponsorship_min || !event.sponsorship_max) return null;
  const range = event.sponsorship_max - event.sponsorship_min;
  return Math.round(event.sponsorship_min + (range / 3) * idx);
}

const levelColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-700 border-slate-300",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-400",
};

export default function EventDetailPage() {
  const { id } = useParams();
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactRequest, setContactRequest] = useState<ContactRequest | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("events").select("*").eq("id", id).single().then(({ data }) => {
      setEvent(data);
      if (data) {
        Promise.all([
          supabase.from("profiles").select("*").eq("id", data.organizer_id).single(),
          profile?.role === "sponsor"
            ? supabase.from("contact_requests").select("*").eq("event_id", id).eq("sponsor_id", profile.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]).then(([orgRes, reqRes]) => {
          setOrganizer(orgRes.data);
          setContactRequest((reqRes as any).data || null);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [id, profile]);

  const handleContactRequest = async () => {
    if (!event || !profile || !organizer) return;
    setSendingRequest(true);
    const { data, error } = await supabase.from("contact_requests").insert({
      event_id: event.id,
      sponsor_id: profile.id,
      organizer_id: organizer.id,
      status: "pending",
    }).select().single();
    if (error) {
      toast.error(error.message);
    } else {
      setContactRequest(data as unknown as ContactRequest);
      toast.success("Solicitud de contacto enviada");
    }
    setSendingRequest(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl h-64 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  const confirmedCount = event.confirmed_sponsors?.length || 0;
  const requestStatus = contactRequest?.status;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-slide-up space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-0 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        {/* Hero */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="h-56 md:h-72 relative overflow-hidden">
            {event.media && event.media.length > 0 ? (
              <img src={event.media[0]} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full gradient-primary" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-6 pt-16">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {event.type && (
                    <span className="inline-block mb-2 px-3 py-1 rounded-pill bg-white/90 text-foreground text-xs font-semibold">{event.type}</span>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md" style={{ lineHeight: 1.15, textWrap: "balance" as any }}>
                    {event.title}
                  </h1>
                </div>
                {matchScore !== null && <MatchBadge score={matchScore} className="shrink-0" />}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-2">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {event.date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {format(new Date(event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {event.location}
                </span>
              )}
            </div>

            {/* CTAs for sponsors */}
            {profile?.role === "sponsor" && (
              <div className="flex gap-3 pt-3">
                {requestStatus === "accepted" ? (
                  <Button
                    className="gradient-primary text-white border-0 rounded-pill"
                    onClick={async () => {
                      if (!profile || !organizer) return;
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
                      // Fetch the newly created conversation
                      const { data } = await supabase
                        .from("conversations")
                        .select("id")
                        .eq("event_id", event.id)
                        .eq("sponsor_id", profile.id)
                        .single();
                      if (data) navigate(`/messages?conversation=${data.id}`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> Ir al chat
                  </Button>
                ) : requestStatus === "pending" ? (
                  <Button disabled variant="outline" className="rounded-pill">
                    <Send className="h-4 w-4 mr-2" /> Solicitud pendiente
                  </Button>
                ) : requestStatus === "rejected" ? (
                  <Button disabled variant="outline" className="rounded-pill text-destructive">
                    Solicitud rechazada
                  </Button>
                ) : (
                  <Button
                    onClick={handleContactRequest}
                    disabled={sendingRequest}
                    className="gradient-primary text-white border-0 rounded-pill"
                  >
                    {sendingRequest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Contactar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {event.capacity != null && event.capacity > 0 && (
            <MetricCard icon={Users} label="Aforo confirmado" value={`${event.capacity.toLocaleString()}`} />
          )}
          {event.sector && <MetricCard icon={Tag} label="Sector" value={event.sector} />}
          {event.sponsorship_max != null && event.sponsorship_max > 0 && (
            <MetricCard icon={Euro} label="Rango patrocinio" value={`€${event.sponsorship_min?.toLocaleString()} – €${event.sponsorship_max.toLocaleString()}`} />
          )}
          {confirmedCount > 0 && <MetricCard icon={CheckCircle2} label="Sponsors confirmados" value={`${confirmedCount}`} verified />}
        </div>

        {/* Description */}
        {event.description && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Sobre el evento</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</div>
            {event.audience && (
              <div className="pt-2">
                <p className="text-sm font-medium">Perfil de audiencia</p>
                <p className="text-sm text-muted-foreground">{event.audience}</p>
              </div>
            )}
          </div>
        )}

        {/* Confirmed sponsors */}
        {confirmedCount > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Sponsors confirmados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {event.confirmed_sponsors!.map((name, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium line-clamp-1">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sponsorship packages */}
        {event.sponsorship_max != null && event.sponsorship_max > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Paquetes de patrocinio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockPackages.map((pkg, idx) => {
                const price = getPackagePrice(event, idx);
                return (
                  <div key={pkg.level} className={`rounded-xl border-2 p-5 space-y-3 ${levelColors[pkg.level]} transition-shadow hover:shadow-md`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">{pkg.name}</h3>
                      <Badge variant="outline" className="text-xs">{pkg.level === "gold" ? "⭐" : pkg.level === "silver" ? "🥈" : "🥉"}</Badge>
                    </div>
                    {price && <p className="text-xl font-bold">€{price.toLocaleString()}</p>}
                    <ul className="space-y-1.5">
                      {pkg.benefits.map((b, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media gallery */}
        {event.media && event.media.length > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Galería</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {event.media.map((url, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted">
                  {url.match(/youtube|vimeo/) ? (
                    <iframe src={url} className="w-full h-full" allowFullScreen />
                  ) : (
                    <img src={url} alt={`${event.title} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizer info — clickable */}
        {organizer && (
          <Link to={`/organizers/${organizer.id}`} className="block bg-card rounded-2xl shadow-card p-6 transition-all hover:shadow-card-hover hover:-translate-y-0.5 group/org">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold group-hover/org:text-primary transition-colors">{organizer.name}</p>
                <p className="text-sm text-muted-foreground">Organizador</p>
                {organizer.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium mt-0.5">
                    <Shield className="h-3 w-3" /> Verificado
                  </span>
                )}
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-0 group-hover/org:opacity-100 transition-opacity" />
            </div>
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon: Icon, label, value, verified }: { icon: any; label: string; value: string; verified?: boolean }) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-card space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {verified && <Shield className="h-3.5 w-3.5 text-emerald-500" />}
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
