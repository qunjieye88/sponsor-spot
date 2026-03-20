import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Users, DollarSign, Tag, ArrowLeft, MessageSquare, User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

export default function EventDetailPage() {
  const { id } = useParams();
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setEvent(data);
        if (data) {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", data.organizer_id)
            .single()
            .then(({ data: org }) => {
              setOrganizer(org);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [id]);

  const startConversation = async () => {
    if (!event || !profile || !organizer) return;

    // Check existing conversation
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

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        event_id: event.id,
        organizer_id: organizer.id,
        sponsor_id: profile.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      navigate(`/messages?conversation=${data.id}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-2xl h-96 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Evento no encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  const matchScore = profile?.role === "sponsor" ? calculateMatchScore(event, profile) : null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-slide-up">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {/* Hero */}
          <div className="h-48 gradient-primary relative">
            {event.media && event.media.length > 0 ? (
              <img src={event.media[0]} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <CalendarDays className="h-16 w-16 text-white/30" />
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{event.title}</h1>
                {event.type && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-pill bg-primary/10 text-primary text-sm font-medium">
                    {event.type}
                  </span>
                )}
              </div>
              {matchScore !== null && <MatchBadge score={matchScore} />}
            </div>

            {event.description && (
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {event.date && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{format(new Date(event.date), "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.capacity != null && event.capacity > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{event.capacity.toLocaleString()} asistentes</span>
                </div>
              )}
              {event.sponsorship_max != null && event.sponsorship_max > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span>${event.sponsorship_min?.toLocaleString()} - ${event.sponsorship_max.toLocaleString()}</span>
                </div>
              )}
              {event.sector && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  <span>{event.sector}</span>
                </div>
              )}
              {event.audience && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Audiencia: {event.audience}</span>
                </div>
              )}
            </div>

            {/* Organizer info */}
            {organizer && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {organizer.avatar_url ? (
                      <img src={organizer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{organizer.name}</p>
                    <p className="text-xs text-muted-foreground">Organizador</p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA for sponsors */}
            {profile?.role === "sponsor" && (
              <Button
                onClick={startConversation}
                className="w-full gradient-primary text-white border-0 rounded-pill h-11"
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Contactar Organizador
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
