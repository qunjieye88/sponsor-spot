import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, User, CalendarDays, Inbox, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Profile, Event, ContactRequest } from "@/lib/supabase-helpers";

interface RequestWithDetails extends ContactRequest {
  sponsor?: Profile;
  event?: Event;
}

export default function ContactRequestsPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchRequests();
  }, [profile]);

  const fetchRequests = async () => {
    if (!profile) return;
    const column = profile.role === "organizer" ? "organizer_id" : "sponsor_id";
    const { data } = await supabase
      .from("contact_requests")
      .select("*")
      .eq(column, profile.id)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched: RequestWithDetails[] = await Promise.all(
      data.map(async (req: any) => {
        const [sponsorRes, eventRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", req.sponsor_id).single(),
          supabase.from("events").select("*").eq("id", req.event_id).single(),
        ]);
        return { ...req, sponsor: sponsorRes.data || undefined, event: eventRes.data || undefined };
      })
    );

    setRequests(enriched);
    setLoading(false);
  };

  const handleAction = async (requestId: string, action: "accepted" | "rejected", req: RequestWithDetails) => {
    setProcessing(requestId);

    const { error } = await supabase
      .from("contact_requests")
      .update({ status: action })
      .eq("id", requestId);

    if (error) {
      toast.error(error.message);
      setProcessing(null);
      return;
    }

    if (action === "accepted" && req.event && req.sponsor) {
      // Create conversation (insert without RETURNING to avoid RLS SELECT conflict)
      const { error: convError } = await supabase
        .from("conversations")
        .insert({
          event_id: req.event_id,
          organizer_id: req.organizer_id,
          sponsor_id: req.sponsor_id,
        });

      if (convError) {
        toast.error(convError.message);
      } else {
        toast.success("Solicitud aceptada. Chat habilitado.");
      }
    } else if (action === "rejected") {
      toast.success("Solicitud rechazada");
    }

    setProcessing(null);
    fetchRequests();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de contacto</h1>
          <p className="text-muted-foreground">
            {profile?.role === "organizer"
              ? "Gestiona las solicitudes de sponsors que quieren contactar contigo"
              : "Estado de tus solicitudes de contacto enviadas"}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-xl h-24 animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-card p-12 text-center text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No hay solicitudes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-card rounded-xl shadow-card p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {req.sponsor?.avatar_url ? (
                      <img src={req.sponsor.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{req.sponsor?.name || "Sponsor"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.event?.title || "Evento"}
                      {req.event?.date ? ` · ${format(new Date(req.event.date), "d MMM yyyy", { locale: es })}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(req.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>

                  {/* Status / Actions */}
                  {req.status === "pending" && profile?.role === "organizer" ? (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="rounded-pill bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={processing === req.id}
                        onClick={() => handleAction(req.id, "accepted", req)}
                      >
                        {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-pill"
                        disabled={processing === req.id}
                        onClick={() => handleAction(req.id, "rejected", req)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Rechazar
                      </Button>
                    </div>
                  ) : (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-pill ${
                      req.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                      req.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {req.status === "accepted" ? "Aceptada" : req.status === "rejected" ? "Rechazada" : "Pendiente"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
