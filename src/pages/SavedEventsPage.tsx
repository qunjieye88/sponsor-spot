import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { Bookmark } from "lucide-react";
import type { Event, Profile } from "@/lib/supabase-helpers";

export default function SavedEventsPage() {
  const { profile } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, Pick<Profile, "id" | "name" | "avatar_url">>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const { data: saved } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("profile_id", profile.id);

      if (!saved || saved.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = saved.map((s) => s.event_id);
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds);

      setEvents(eventsData || []);

      if (eventsData && eventsData.length > 0) {
        const orgIds = [...new Set(eventsData.map((e) => e.organizer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", orgIds);
        if (profiles) {
          const map: Record<string, Pick<Profile, "id" | "name" | "avatar_url">> = {};
          profiles.forEach((p) => { map[p.id] = p; });
          setOrganizers(map);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Eventos Guardados</h1>
          <p className="text-muted-foreground">Tus eventos favoritos en un solo lugar</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No tienes eventos guardados</h3>
            <p className="text-muted-foreground mt-1">
              Guarda eventos haciendo clic en el icono de marcador
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, i) => (
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
                  currentProfileId={profile?.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
