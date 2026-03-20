import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send } from "lucide-react";
import type { Event } from "@/lib/supabase-helpers";

interface SendOfferDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendOfferDialog({ event, open, onOpenChange }: SendOfferDialogProps) {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!event || !profile) return;
    setLoading(true);

    // Find or create conversation, then send the offer as first message
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("event_id", event.id)
      .eq("sponsor_id", profile.id)
      .maybeSingle();

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          event_id: event.id,
          organizer_id: event.organizer_id,
          sponsor_id: profile.id,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      conversationId = conv.id;
    }

    const offerText = `💰 Oferta de patrocinio para "${event.title}"\n\nMonto propuesto: €${Number(amount).toLocaleString()}\n\n${message}`;

    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content: offerText,
    });

    if (msgError) {
      toast.error(msgError.message);
    } else {
      toast.success("Oferta enviada correctamente");
      onOpenChange(false);
      setAmount("");
      setMessage("");
      navigate(`/messages?conversation=${conversationId}`);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar oferta de patrocinio</DialogTitle>
          <DialogDescription>
            {event?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Monto propuesto (€)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={event?.sponsorship_min ? `Desde €${event.sponsorship_min.toLocaleString()}` : "10000"}
            />
            {event?.sponsorship_min != null && event?.sponsorship_max != null && event.sponsorship_max > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Rango aceptado: €{event.sponsorship_min.toLocaleString()} – €{event.sponsorship_max.toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <Label>Mensaje al organizador</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe tu propuesta de patrocinio, qué activaciones te interesan..."
              rows={4}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !amount || !message.trim()}
            className="w-full gradient-primary text-white border-0 rounded-pill"
          >
            <Send className="h-4 w-4 mr-1" />
            {loading ? "Enviando..." : "Enviar oferta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
