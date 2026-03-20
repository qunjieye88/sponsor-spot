import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, Euro, Tag, CheckCircle2, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Event, AppRole } from "@/lib/supabase-helpers";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EventCardProps {
  event: Event;
  userRole: AppRole;
  onSendOffer?: (event: Event) => void;
}

const typeColors: Record<string, string> = {
  conferencia: "bg-blue-100 text-blue-700",
  festival: "bg-purple-100 text-purple-700",
  feria: "bg-amber-100 text-amber-700",
  congreso: "bg-emerald-100 text-emerald-700",
  taller: "bg-rose-100 text-rose-700",
  seminario: "bg-cyan-100 text-cyan-700",
};

function getTypeBadgeClass(type: string) {
  const key = type.toLowerCase();
  return typeColors[key] || "bg-muted text-foreground";
}

export function EventCard({ event, userRole, onSendOffer }: EventCardProps) {
  const confirmedCount = event.confirmed_sponsors?.length || 0;

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 group flex flex-col">
      {/* Cover image */}
      <div className="h-44 relative overflow-hidden">
        {event.media && event.media.length > 0 ? (
          <img src={event.media[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full gradient-primary opacity-80 group-hover:opacity-100 transition-opacity" />
        )}
        {/* Title overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-sm" style={{ textWrap: "balance" as any }}>
            {event.title}
          </h3>
        </div>
        {!event.published && (
          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-pill bg-foreground/70 text-white text-xs font-medium">
            Borrador
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        {/* Type badge */}
        {event.type && (
          <span className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${getTypeBadgeClass(event.type)}`}>
            {event.type}
          </span>
        )}

        {/* Date + Location */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {event.date && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                {event.location ? ` · ${event.location}` : ""}
              </span>
            </div>
          )}
          {!event.date && event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>

        {/* Capacity + Audience */}
        {(event.capacity != null && event.capacity > 0) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.capacity.toLocaleString()} asistentes
              {event.audience ? ` · ${event.audience}` : ""}
            </span>
          </div>
        )}

        {/* Sector */}
        {event.sector && (
          <div className="flex items-center gap-1.5 text-sm">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-primary font-medium">{event.sector}</span>
          </div>
        )}

        {/* Sponsorship range */}
        {event.sponsorship_min != null && event.sponsorship_max != null && event.sponsorship_max > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Euro className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>€{event.sponsorship_min.toLocaleString()} – €{event.sponsorship_max.toLocaleString()}</span>
          </div>
        )}

        {/* Confirmed sponsors */}
        {confirmedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{confirmedCount} sponsor{confirmedCount !== 1 ? "s" : ""} confirmado{confirmedCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTAs */}
        <div className="flex gap-2 pt-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 rounded-pill text-xs"
          >
            <Link to={userRole === "organizer" ? `/events/${event.id}/edit` : `/events/${event.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Ver evento
            </Link>
          </Button>
          {userRole === "sponsor" && onSendOffer && (
            <Button
              size="sm"
              className="flex-1 gradient-primary text-white border-0 rounded-pill text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSendOffer(event);
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Enviar oferta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
