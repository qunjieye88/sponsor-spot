import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, DollarSign, Tag } from "lucide-react";
import type { Event, AppRole } from "@/lib/supabase-helpers";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EventCardProps {
  event: Event;
  userRole: AppRole;
}

export function EventCard({ event, userRole }: EventCardProps) {
  const href = userRole === "organizer" ? `/events/${event.id}/edit` : `/events/${event.id}`;

  return (
    <Link
      to={href}
      className="block bg-card rounded-xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 active:scale-[0.98] group"
    >
      {/* Image area */}
      <div className="h-40 gradient-primary opacity-80 group-hover:opacity-100 transition-opacity relative">
        {event.media && event.media.length > 0 ? (
          <img src={event.media[0]} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CalendarDays className="h-12 w-12 text-white/40" />
          </div>
        )}
        {!event.published && (
          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-pill bg-foreground/70 text-white text-xs font-medium">
            Borrador
          </span>
        )}
        {event.type && (
          <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-pill bg-white/90 text-foreground text-xs font-medium">
            {event.type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {event.date && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{format(new Date(event.date), "d MMM yyyy", { locale: es })}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {event.capacity && event.capacity > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-muted text-xs">
              <Users className="h-3 w-3" /> {event.capacity.toLocaleString()}
            </span>
          )}
          {event.sponsorship_min != null && event.sponsorship_max != null && event.sponsorship_max > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-muted text-xs">
              <DollarSign className="h-3 w-3" />
              ${event.sponsorship_min.toLocaleString()} - ${event.sponsorship_max.toLocaleString()}
            </span>
          )}
          {event.sector && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-medium">
              <Tag className="h-3 w-3" /> {event.sector}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
