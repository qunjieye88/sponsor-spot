import { useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { Event, AppRole, Profile } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";
import { resolveAvatar } from "@/lib/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EventCardProps {
  event: Event;
  userRole: AppRole;
  sponsorProfile?: Profile | null;
  organizer?: Pick<Profile, "name" | "avatar_url"> | null;
}

export function EventCard({ event, sponsorProfile, organizer }: EventCardProps) {
  const navigate = useNavigate();

  const matchScore = sponsorProfile ? calculateMatchScore(event, sponsorProfile) : null;
  const isStrongMatch = matchScore !== null && matchScore >= 80;

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
      className="bg-card rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 group flex flex-col cursor-pointer"
    >
      {/* Cover image */}
      <div className="aspect-[4/3] relative overflow-hidden">
        {event.media && event.media.length > 0 ? (
          <img
            src={event.media[0]}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full gradient-primary opacity-80 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Top-left: Match badges */}
        {matchScore !== null && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-foreground/70 backdrop-blur-sm text-white text-xs font-bold tabular-nums">
              {matchScore}% Match
            </span>
            {isStrongMatch && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold">
                Perfect Fit
              </span>
            )}
          </div>
        )}


        {/* Bottom-left: Type badge */}
        {event.type && (
          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-card/90 backdrop-blur-sm text-foreground text-xs font-semibold">
            {event.type}
          </span>
        )}

        {/* Draft badge */}
        {!event.published && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-foreground/70 text-white text-xs font-medium">
            Borrador
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2">
          {event.title}
        </h3>

        {/* Date · Location · Capacity — single line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {event.date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {format(new Date(event.date), "d MMM yyyy", { locale: es })}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </span>
          )}
          {event.capacity != null && event.capacity > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {event.capacity.toLocaleString()}
            </span>
          )}
        </div>

        {/* Price + Organizer row */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {event.sponsorship_max != null && event.sponsorship_max > 0 ? (
            <span className="text-base font-bold text-foreground">
              €{event.sponsorship_max.toLocaleString()}
            </span>
          ) : (
            <span />
          )}

          {organizer && (
            <div className="flex items-center gap-2">
              <img
                src={resolveAvatar(organizer.avatar_url, (organizer as any).id || organizer.name || "")}
                alt={organizer.name}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="text-sm text-muted-foreground line-clamp-1 max-w-[120px]">
                {organizer.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
