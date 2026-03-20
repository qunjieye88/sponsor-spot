import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, User } from "lucide-react";

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
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mi Perfil</h1>
              <span className="inline-block px-2 py-0.5 rounded-pill bg-muted text-xs font-medium capitalize">
                {profile.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Nombre / Empresa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            {profile.role === "organizer" && (
              <>
                <div>
                  <Label>Tipos de eventos</Label>
                  <Input value={eventTypes} onChange={(e) => setEventTypes(e.target.value)} placeholder="Conferencia, Festival..." />
                </div>
                <div>
                  <Label>Links sociales</Label>
                  <Input value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} />
                </div>
              </>
            )}

            {profile.role === "sponsor" && (
              <>
                <div>
                  <Label>Industria</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div>
                  <Label>Tags</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Presupuesto mín (USD)</Label>
                    <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                  </div>
                  <div>
                    <Label>Presupuesto máx (USD)</Label>
                    <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Activaciones preferidas</Label>
                  <Input value={activations} onChange={(e) => setActivations(e.target.value)} placeholder="Stand, Sampling, Naming..." />
                </div>
                <div>
                  <Label>Sectores de interés</Label>
                  <Input value={preferredSectors} onChange={(e) => setPreferredSectors(e.target.value)} placeholder="Tecnología, Deportes, Música..." />
                  <p className="text-xs text-muted-foreground mt-1">Separa con comas los sectores que te interesan</p>
                </div>
                <div>
                  <Label>Tipos de evento preferidos</Label>
                  <Input value={preferredEventTypes} onChange={(e) => setPreferredEventTypes(e.target.value)} placeholder="Festival Musical, Conferencia Tech..." />
                  <p className="text-xs text-muted-foreground mt-1">Separa con comas los tipos de evento</p>
                </div>
                <div>
                  <Label>Audiencias de interés</Label>
                  <Input value={preferredAudiences} onChange={(e) => setPreferredAudiences(e.target.value)} placeholder="Jóvenes 18-30, Profesionales, Familias..." />
                  <p className="text-xs text-muted-foreground mt-1">Separa con comas las audiencias objetivo</p>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white border-0 rounded-pill"
            >
              <Save className="h-4 w-4 mr-1" />
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
