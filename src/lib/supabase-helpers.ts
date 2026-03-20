import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

// Contact request type (manual since types.ts hasn't regenerated yet)
export interface ContactRequest {
  id: string;
  event_id: string;
  sponsor_id: string;
  organizer_id: string;
  status: "pending" | "accepted" | "rejected";
  message: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  return data;
}

export function calculateMatchScore(
  event: Event,
  sponsor: Profile
): number {
  let score = 0;
  let weights = 0;

  // 1. Sector match (30 pts) — sponsor.preferred_sectors vs event.sector
  const preferredSectors = (sponsor as any).preferred_sectors as string[] | null;
  if (event.sector && preferredSectors && preferredSectors.length > 0) {
    const match = preferredSectors.some(
      (s) => s.toLowerCase() === event.sector!.toLowerCase()
    );
    score += (match ? 1 : 0) * 30;
    weights += 30;
  } else if (event.sector && sponsor.industry) {
    // Fallback to old industry match
    const match = event.sector.toLowerCase() === sponsor.industry.toLowerCase() ? 1 : 0;
    score += match * 30;
    weights += 30;
  }

  // 2. Event type match (25 pts) — sponsor.preferred_event_types vs event.type
  const preferredTypes = (sponsor as any).preferred_event_types as string[] | null;
  if (event.type && preferredTypes && preferredTypes.length > 0) {
    const match = preferredTypes.some(
      (t) =>
        t.toLowerCase() === event.type!.toLowerCase() ||
        event.type!.toLowerCase().includes(t.toLowerCase()) ||
        t.toLowerCase().includes(event.type!.toLowerCase())
    );
    score += (match ? 1 : 0.1) * 25;
    weights += 25;
  }

  // 3. Audience match (20 pts) — sponsor.preferred_audiences vs event.audience
  const preferredAudiences = (sponsor as any).preferred_audiences as string[] | null;
  if (event.audience && preferredAudiences && preferredAudiences.length > 0) {
    const match = preferredAudiences.some(
      (a) =>
        a.toLowerCase() === event.audience!.toLowerCase() ||
        event.audience!.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(event.audience!.toLowerCase())
    );
    score += (match ? 1 : 0.1) * 20;
    weights += 20;
  }

  // 4. Budget / sponsorship range overlap (25 pts)
  if (
    sponsor.budget_min != null &&
    sponsor.budget_max != null &&
    event.sponsorship_min != null &&
    event.sponsorship_max != null
  ) {
    const budgetOverlap = Math.max(
      0,
      Math.min(sponsor.budget_max, event.sponsorship_max) -
        Math.max(sponsor.budget_min, event.sponsorship_min)
    );
    const maxRange = Math.max(
      event.sponsorship_max - event.sponsorship_min,
      sponsor.budget_max - sponsor.budget_min,
      1
    );
    const budgetScore = Math.min(budgetOverlap / maxRange, 1);
    score += budgetScore * 25;
    weights += 25;
  }

  return weights > 0 ? Math.round((score / weights) * 100) : 50;
}
