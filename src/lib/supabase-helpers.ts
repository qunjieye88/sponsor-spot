import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

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

  // Sector match (30%)
  if (event.sector && sponsor.industry) {
    const sectorMatch = event.sector.toLowerCase() === sponsor.industry.toLowerCase() ? 1 : 0;
    score += sectorMatch * 30;
    weights += 30;
  }

  // Tags overlap (25%)
  if (sponsor.tags && sponsor.tags.length > 0) {
    const eventKeywords = [
      event.sector, event.audience, event.type,
      ...(event.confirmed_sponsors || [])
    ].filter(Boolean).map(s => s!.toLowerCase());
    const sponsorTags = sponsor.tags.map(t => t.toLowerCase());
    const overlap = sponsorTags.filter(t => eventKeywords.some(k => k.includes(t) || t.includes(k))).length;
    const tagScore = sponsorTags.length > 0 ? overlap / sponsorTags.length : 0;
    score += tagScore * 25;
    weights += 25;
  }

  // Budget match (25%)
  if (sponsor.budget_min != null && sponsor.budget_max != null && event.sponsorship_min != null && event.sponsorship_max != null) {
    const budgetOverlap = Math.max(0,
      Math.min(sponsor.budget_max, event.sponsorship_max) - Math.max(sponsor.budget_min, event.sponsorship_min)
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

  // Activations (20%)
  if (sponsor.preferred_activations && sponsor.preferred_activations.length > 0 && event.type) {
    const match = sponsor.preferred_activations.some(a =>
      a.toLowerCase().includes(event.type!.toLowerCase()) || event.type!.toLowerCase().includes(a.toLowerCase())
    );
    score += (match ? 1 : 0.2) * 20;
    weights += 20;
  }

  return weights > 0 ? Math.round((score / weights) * 100) : 50;
}
