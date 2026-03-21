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
                <div
                  key={sponsor.id}
                  onClick={() => navigate(`/sponsors/${sponsor.id}`)}
                  className="bg-card rounded-xl shadow-card overflow-hidden cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-1 active:scale-[0.98] animate-slide-up"
                  style={{ animationDelay: `${0.05 * i}s`, animationFillMode: "both" }}
                >
                  <div className="relative h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-muted flex items-center justify-center">
                    <div className="h-16 w-16 rounded-2xl bg-card shadow-md flex items-center justify-center overflow-hidden">
                      <img src={resolveAvatar(sponsor.avatar_url, sponsor.id)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                    </div>
                    {sponsor.verified && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                        Verificado
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleUnsaveSponsor(e, sponsor.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-primary text-primary-foreground backdrop-blur-sm transition-all shadow-md"
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold text-base">{sponsor.name}</h3>
                      {sponsor.industry && (
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {sponsor.industry}
                        </p>
                      )}
                    </div>
                    {sponsor.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 text-center">{sponsor.description}</p>
                    )}
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {sponsor.budget_max != null && sponsor.budget_max > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                          <DollarSign className="h-3 w-3" />
                          ${sponsor.budget_min?.toLocaleString()} - ${sponsor.budget_max.toLocaleString()}
                        </span>
                      )}
                      {sponsor.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          <Tag className="h-3 w-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
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
