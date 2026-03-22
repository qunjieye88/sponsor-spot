import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

export default function EventFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [audience, setAudience] = useState("");
  const [sector, setSector] = useState("");
  const [sponsorshipMin, setSponsorshipMin] = useState("");
  const [sponsorshipMax, setSponsorshipMax] = useState("");
  const [published, setPublished] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    if (isEditing && id) {
      supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title);
            setDescription(data.description || "");
            setType(data.type || "");
            setDate(data.date ? data.date.slice(0, 16) : "");
            setLocation(data.location || "");
            setCapacity(data.capacity?.toString() || "");
            setAudience(data.audience || "");
            setSector(data.sector || "");
            setSponsorshipMin(data.sponsorship_min?.toString() || "");
            setSponsorshipMax(data.sponsorship_max?.toString() || "");
            setPublished(data.published || false);
          }
        });
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    const eventData = {
      organizer_id: profile.id,
      title: title.trim(),
      description: description.trim(),
      type: type.trim(),
      date: date ? new Date(date).toISOString() : null,
      location: location.trim(),
      capacity: parseInt(capacity) || 0,
      audience: audience.trim(),
      sector: sector.trim(),
      sponsorship_min: parseInt(sponsorshipMin) || 0,
      sponsorship_max: parseInt(sponsorshipMax) || 0,
      published,
    };

    if (isEditing && id) {
      const { error } = await supabase.from("events").update(eventData).eq("id", id);
      if (error) toast.error(error.message);
      else {
        toast.success("Evento actualizado");
        navigate("/dashboard");
      }
    } else {
      const { error } = await supabase.from("events").insert(eventData);
      if (error) toast.error(error.message);
      else {
        toast.success("Evento creado");
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm("¿Eliminar este evento?")) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Evento eliminado");
      navigate("/dashboard");
    }
    setDeleting(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto animate-slide-up">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        <div className="bg-card rounded-2xl shadow-card p-6">
          <h1 className="text-xl font-bold mb-6">
            {isEditing ? "Editar Evento" : "Crear Nuevo Evento"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del evento" required />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el evento..." rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Conferencia, Festival..." />
              </div>
              <div>
                <Label>Sector</Label>
                <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Tecnología, Deportes..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ciudad, País" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacidad</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="500" />
              </div>
              <div>
                <Label>Audiencia</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Profesionales, Jóvenes..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sponsorship mín (USD)</Label>
                <Input type="number" value={sponsorshipMin} onChange={(e) => setSponsorshipMin(e.target.value)} placeholder="1000" />
              </div>
              <div>
                <Label>Sponsorship máx (USD)</Label>
                <Input type="number" value={sponsorshipMax} onChange={(e) => setSponsorshipMax(e.target.value)} placeholder="50000" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <Switch checked={published} onCheckedChange={setPublished} />
              <div>
                <p className="font-medium text-sm">Publicar evento</p>
                <p className="text-xs text-muted-foreground">Los sponsors podrán ver este evento</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive hover:bg-destructive/10 rounded-pill"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 gradient-primary text-white border-0 rounded-pill"
              >
                <Save className="h-4 w-4 mr-1" />
                {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear Evento"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
