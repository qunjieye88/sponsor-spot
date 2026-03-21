import { useNavigate } from "react-router-dom";
import { Bookmark, Briefcase, DollarSign, Tag, MessageSquare } from "lucide-react";
import { MatchBadge } from "@/components/MatchBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/lib/avatar";
import type { Profile } from "@/lib/supabase-helpers";

interface SponsorCardProps {
  sponsor: Profile;
  avgMatch?: number;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent, sponsorId: string) => void;
  onContact?: (e: React.MouseEvent, sponsor: Profile) => void;
  showMatch?: boolean;
  showContact?: boolean;
  animationDelay?: number;
}

export function SponsorCard({
  sponsor,
  avgMatch = 0,
  isSaved = false,
  onToggleSave,
  onContact,
  showMatch = false,
  showContact = false,
  animationDelay = 0,
}: SponsorCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/sponsors/${sponsor.id}`)}
      className="bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 active:scale-[0.98] animate-slide-up group"
      style={{ animationDelay: `${animationDelay}s`, animationFillMode: "both" }}
    >
      {/* Header area */}
      <div className="relative h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/10 blur-sm" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-accent/10 blur-sm" />

        {/* Match badge */}
        {showMatch && (
          <div className="absolute top-3 left-3">
            <MatchBadge score={avgMatch} size="sm" />
          </div>
        )}

        {/* Save button */}
        {onToggleSave && (
          <button
            onClick={(e) => onToggleSave(e, sponsor.id)}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm",
              isSaved
                ? "bg-primary text-primary-foreground scale-110"
                : "bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground hover:scale-110"
            )}
          >
            <Bookmark className={cn("h-4 w-4 transition-transform", isSaved && "fill-current")} />
          </button>
        )}

        {/* Verified badge */}
        {sponsor.verified && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-semibold tracking-wide uppercase">
            Verificado
          </span>
        )}
      </div>

      {/* Avatar — overlapping the header */}
      <div className="flex justify-center -mt-10 relative z-10">
        <div className="h-[72px] w-[72px] rounded-2xl bg-card shadow-md ring-4 ring-card overflow-hidden group-hover:ring-primary/20 transition-all duration-300">
          <img
            src={resolveAvatar(sponsor.avatar_url, sponsor.id)}
            alt={sponsor.name}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-3 space-y-2.5">
        <div className="text-center">
          <h3 className="font-bold text-[15px] text-foreground leading-tight group-hover:text-primary transition-colors">
            {sponsor.name}
          </h3>
          {sponsor.industry && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <Briefcase className="h-3 w-3 shrink-0" />
              {sponsor.industry}
            </p>
          )}
        </div>

        {sponsor.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 text-center leading-relaxed">
            {sponsor.description}
          </p>
        )}

        {/* Budget + Tags */}
        <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
          {sponsor.budget_max != null && sponsor.budget_max > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 text-xs font-medium text-foreground">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              {sponsor.budget_min?.toLocaleString()} – {sponsor.budget_max.toLocaleString()}
            </span>
          )}
          {sponsor.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium"
            >
              <Tag className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>

        {/* Contact button */}
        {showContact && onContact && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-full mt-1 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={(e) => onContact(e, sponsor)}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" /> Contactar
          </Button>
        )}
      </div>
    </div>
  );
}
