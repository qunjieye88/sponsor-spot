import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Shield, CalendarDays, Globe, Building2 } from "lucide-react";
import type { Event, Profile } from "@/lib/supabase-helpers";

export default function OrganizerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("events").select("*").eq("organizer_id", id).eq("published", true).order("date", { ascending: false }),
    ]).then(([profileRes, eventsRes]) => {
      setOrganizer(profileRes.data);
      setEvents(eventsRes.data || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl h-48 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="bg-card rounded-xl h-64 animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!organizer) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Organizador no encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        {/* Profile header */}
        <div className="bg-card rounded-2xl shadow-card p-8">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              {organizer.avatar_url ? (
                <img src={organizer.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{organizer.name}</h1>
                {organizer.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    <Shield className="h-3 w-3" /> Verificado
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm capitalize">Organizador</p>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground pt-1">
                {organizer.industry && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {organizer.industry}
                  </span>
                )}
                {organizer.total_events != null && organizer.total_events > 0 && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {organizer.total_events} eventos organizados
                  </span>
                )}
              </div>

              {organizer.social_links && organizer.social_links.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {organizer.social_links.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> {new URL(link).hostname.replace("www.", "")}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {organizer.description && (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-2">
            <h2 className="text-lg font-semibold">Sobre el organizador</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{organizer.description}</p>
          </div>
        )}

        {/* Published events */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Eventos publicados</h2>
          {events.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-card p-8 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Este organizador no tiene eventos publicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(event => (
                <EventCard key={event.id} event={event} userRole="sponsor" />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
