import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, User, Camera, Loader2 } from "lucide-react";
import { resolveAvatar } from "@/lib/avatar";

const DESC_MAX = 500;

export default function ProfilePage() {
  const { profile, setProfile } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [eventTypes, setEventTypes] = useState((profile?.event_types || []).join(", "));
  const [socialLinks, setSocialLinks] = useState((profile?.social_links || []).join(", "));
  const [industry, setIndustry] = useState(profile?.industry || "");
  const [tags, setTags] = useState((profile?.tags || []).join(", "));
  const [budgetMin, setBudgetMin] = useState(profile?.budget_min?.toString() || "");
  const [budgetMax, setBudgetMax] = useState(profile?.budget_max?.toString() || "");
  const [activations, setActivations] = useState((profile?.preferred_activations || []).join(", "));
  const [preferredSectors, setPreferredSectors] = useState(((profile as any)?.preferred_sectors || []).join(", "));
  const [preferredAudiences, setPreferredAudiences] = useState(((profile as any)?.preferred_audiences || []).join(", "));
  const [preferredEventTypes, setPreferredEventTypes] = useState(((profile as any)?.preferred_event_types || []).join(", "));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    const updates: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
    };

    if (profile.role === "organizer") {
      updates.event_types = eventTypes.split(",").map(s => s.trim()).filter(Boolean);
      updates.social_links = socialLinks.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      updates.industry = industry.trim();
      updates.tags = tags.split(",").map(s => s.trim()).filter(Boolean);
      updates.budget_min = parseInt(budgetMin) || 0;
      updates.budget_max = parseInt(budgetMax) || 0;
      updates.preferred_activations = activations.split(",").map(s => s.trim()).filter(Boolean);
      updates.preferred_sectors = preferredSectors.split(",").map(s => s.trim()).filter(Boolean);
      updates.preferred_audiences = preferredAudiences.split(",").map(s => s.trim()).filter(Boolean);
      updates.preferred_event_types = preferredEventTypes.split(",").map(s => s.trim()).filter(Boolean);
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      setProfile(data);
      toast.success("Perfil actualizado");
    }
    setLoading(false);
  };

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-slide-up space-y-6">
        {/* Profile Header Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar with camera overlay */}
            <div className="relative group cursor-pointer shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden ring-4 ring-background shadow-md">
                <img src={resolveAvatar(profile.avatar_url, profile.id)} alt="" className="h-20 w-20 rounded-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            {/* Name + role */}
            <div className="text-center sm:text-left sm:pt-1">
              <h1 className="text-2xl font-bold leading-tight">{profile.name || "Sin nombre"}</h1>
              <span className="inline-block mt-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize tracking-wide">
                {profile.role}
              </span>
              {profile.industry && (
                <p className="text-sm text-muted-foreground mt-1">{profile.industry}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section: Basic Info */}
            <section className="space-y-5">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información básica</h2>
                <Separator className="mt-2" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Nombre / Empresa</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Descripción</Label>
                <div className="relative">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={DESC_MAX}
                    className="rounded-xl min-h-[120px] resize-y"
                  />
                  <span className="absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">
                    {description.length}/{DESC_MAX}
                  </span>
                </div>
              </div>
            </section>

            {/* Organizer fields */}
            {profile.role === "organizer" && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalles del organizador</h2>
                  <Separator className="mt-2" />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Tipos de eventos</Label>
                  <Input
                    value={eventTypes}
                    onChange={(e) => setEventTypes(e.target.value)}
                    placeholder="Conferencia, Festival..."
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Links sociales</Label>
                  <Input
                    value={socialLinks}
                    onChange={(e) => setSocialLinks(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </section>
            )}

            {/* Sponsor fields */}
            {profile.role === "sponsor" && (
              <>
                <section className="space-y-5">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información del sponsor</h2>
                    <Separator className="mt-2" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Industria</Label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Tags</Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Budget row */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Presupuesto (USD)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                      <Input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="Mínimo"
                        className="h-11 rounded-xl"
                      />
                      <span className="hidden sm:block text-muted-foreground font-medium text-lg">–</span>
                      <Input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="Máximo"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Activaciones preferidas</Label>
                    <Input
                      value={activations}
                      onChange={(e) => setActivations(e.target.value)}
                      placeholder="Stand, Sampling, Naming..."
                      className="h-11 rounded-xl"
                    />
                  </div>
                </section>

                <section className="space-y-5">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferencias de afinidad</h2>
                    <Separator className="mt-2" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Sectores de interés</Label>
                    <Input
                      value={preferredSectors}
                      onChange={(e) => setPreferredSectors(e.target.value)}
                      placeholder="Tecnología, Deportes, Música..."
                      className="h-11 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Separa con comas los sectores que te interesan</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Tipos de evento preferidos</Label>
                    <Input
                      value={preferredEventTypes}
                      onChange={(e) => setPreferredEventTypes(e.target.value)}
                      placeholder="Festival Musical, Conferencia Tech..."
                      className="h-11 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Separa con comas los tipos de evento</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Audiencias de interés</Label>
                    <Input
                      value={preferredAudiences}
                      onChange={(e) => setPreferredAudiences(e.target.value)}
                      placeholder="Jóvenes 18-30, Profesionales, Familias..."
                      className="h-11 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Separa con comas las audiencias objetivo</p>
                  </div>
                </section>
              </>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="gradient-primary text-white border-0 rounded-full h-11 px-8 w-[220px] font-semibold"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
