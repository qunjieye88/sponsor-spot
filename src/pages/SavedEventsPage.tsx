import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventCard } from "@/components/EventCard";
import { SponsorCard } from "@/components/SponsorCard";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import type { Event, Profile } from "@/lib/supabase-helpers";

export default function SavedEventsPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const isOrganizer = profile?.role === "organizer";

  // Sponsor: saved events
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, Pick<Profile, "id" | "name" | "avatar_url">>>({});

  // Organizer: saved sponsors
  const [savedSponsors, setSavedSponsors] = useState<Profile[]>([]);
  const [savedSponsorIds, setSavedSponsorIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (isOrganizer) {
      fetchSavedSponsors();
    } else {
      fetchSavedEvents();
    }
  }, [profile]);

  const fetchSavedEvents = async () => {
    if (!profile) return;
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
    const { data: eventsData } = await supabase.from("events").select("*").in("id", eventIds);
    setEvents(eventsData || []);

    if (eventsData && eventsData.length > 0) {
      const orgIds = [...new Set(eventsData.map((e) => e.organizer_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url").in("id", orgIds);
      if (profiles) {
        const map: Record<string, Pick<Profile, "id" | "name" | "avatar_url">> = {};
        profiles.forEach((p) => { map[p.id] = p; });
        setOrganizers(map);
      }
    }
    setLoading(false);
  };

  const fetchSavedSponsors = async () => {
    if (!profile) return;
    const { data: saved } = await supabase
      .from("saved_sponsors")
      .select("sponsor_id")
      .eq("profile_id", profile.id);

    if (!saved || saved.length === 0) {
      setSavedSponsors([]);
      setSavedSponsorIds(new Set());
      setLoading(false);
      return;
    }

    const ids = saved.map((s: any) => s.sponsor_id);
    setSavedSponsorIds(new Set(ids));
    const { data: sponsorsData } = await supabase.from("profiles").select("*").in("id", ids);
    setSavedSponsors(sponsorsData || []);
    setLoading(false);
  };

  const toggleUnsaveSponsor = async (e: React.MouseEvent, sponsorId: string) => {
    e.stopPropagation();
    if (!profile) return;
    const { error } = await supabase
      .from("saved_sponsors")
      .delete()
      .eq("profile_id", profile.id)
      .eq("sponsor_id", sponsorId);
    if (error) {
      toast.error(error.message);
    } else {
      setSavedSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      setSavedSponsorIds((prev) => { const next = new Set(prev); next.delete(sponsorId); return next; });
      toast.success("Sponsor eliminado de guardados");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">
            {isOrganizer ? "Sponsors Guardados" : "Eventos Guardados"}
          </h1>
          <p className="text-muted-foreground">
            {isOrganizer ? "Tus sponsors favoritos en un solo lugar" : "Tus eventos favoritos en un solo lugar"}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : isOrganizer ? (
          // Organizer: saved sponsors
          savedSponsors.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No tienes sponsors guardados</h3>
              <p className="text-muted-foreground mt-1">
                Guarda sponsors haciendo clic en el icono de marcador
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedSponsors.map((sponsor, i) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  isSaved={true}
                  onToggleSave={toggleUnsaveSponsor}
                  animationDelay={0.05 * i}
                />
              ))}
            </div>
          )
        ) : (
          // Sponsor: saved events
          events.length === 0 ? (
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
          )
        )}
      </div>
    </DashboardLayout>
  );
}
