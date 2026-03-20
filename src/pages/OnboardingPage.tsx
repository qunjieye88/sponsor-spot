import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import type { AppRole } from "@/lib/supabase-helpers";

export default function OnboardingPage() {
  const { user, setProfile } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Organizer
  const [eventTypes, setEventTypes] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  // Sponsor
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [activations, setActivations] = useState("");

  const handleSubmit = async () => {
    if (!user || !role || !name.trim()) return;
    setLoading(true);

    const profileData = {
      user_id: user.id,
      role,
      name: name.trim(),
      description: description.trim(),
      event_types: role === "organizer" ? eventTypes.split(",").map(s => s.trim()).filter(Boolean) : [],
      social_links: role === "organizer" ? socialLinks.split(",").map(s => s.trim()).filter(Boolean) : [],
      industry: role === "sponsor" ? industry.trim() : "",
      tags: role === "sponsor" ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      budget_min: role === "sponsor" ? parseInt(budgetMin) || 0 : 0,
      budget_max: role === "sponsor" ? parseInt(budgetMax) || 0 : 0,
      preferred_activations: role === "sponsor" ? activations.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setProfile(data);
      toast.success("¡Perfil creado exitosamente!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="bg-card rounded-2xl shadow-card p-8">
          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "gradient-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">¿Cuál es tu rol?</h2>
                <p className="text-muted-foreground mt-1">Elige cómo usarás la plataforma</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setRole("organizer"); setStep(2); }}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-card-hover active:scale-[0.98] ${
                    role === "organizer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <CalendarDays className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold">Organizador</h3>
                  <p className="text-sm text-muted-foreground mt-1">Publico eventos y busco sponsors</p>
                </button>
                <button
                  onClick={() => { setRole("sponsor"); setStep(2); }}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-card-hover active:scale-[0.98] ${
                    role === "sponsor" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Building2 className="h-8 w-8 text-accent mb-3" />
                  <h3 className="font-semibold">Sponsor</h3>
                  <p className="text-sm text-muted-foreground mt-1">Busco eventos para patrocinar</p>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Tu información</h2>
                <p className="text-muted-foreground mt-1">Cuéntanos sobre ti</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Nombre / Empresa</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre o empresa" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe brevemente quién eres..." rows={3} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-pill">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!name.trim()}
                  className="flex-1 gradient-primary text-white border-0 rounded-pill"
                >
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && role === "organizer" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Perfil de organizador</h2>
                <p className="text-muted-foreground mt-1">Detalles de tu actividad</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Tipos de eventos (separados por coma)</Label>
                  <Input value={eventTypes} onChange={(e) => setEventTypes(e.target.value)} placeholder="Conferencia, Festival, Workshop..." />
                </div>
                <div>
                  <Label>Links sociales (separados por coma)</Label>
                  <Input value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} placeholder="https://twitter.com/..., https://..." />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-pill">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 gradient-primary text-white border-0 rounded-pill"
                >
                  {loading ? "Creando..." : "Completar perfil"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && role === "sponsor" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Perfil de sponsor</h2>
                <p className="text-muted-foreground mt-1">Detalles de tu marca</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Industria</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Tecnología, Finanzas, Salud..." />
                </div>
                <div>
                  <Label>Tags / intereses (separados por coma)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tech, gaming, fitness..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Presupuesto mín (USD)</Label>
                    <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="1000" />
                  </div>
                  <div>
                    <Label>Presupuesto máx (USD)</Label>
                    <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="50000" />
                  </div>
                </div>
                <div>
                  <Label>Activaciones preferidas (separadas por coma)</Label>
                  <Input value={activations} onChange={(e) => setActivations(e.target.value)} placeholder="Stand, Logo en banner, Charla..." />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-pill">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 gradient-primary text-white border-0 rounded-pill"
                >
                  {loading ? "Creando..." : "Completar perfil"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
