import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, CalendarDays, MessageSquare, Check, X, Clock, Loader2 } from "lucide-react";
import { resolveAvatar } from "@/lib/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { Conversation, Message, Profile, Event, ContactRequest } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

interface ConversationWithDetails extends Conversation {
  otherUser?: Profile;
  event?: Event;
  lastMessage?: Message;
}

interface RequestWithDetails extends ContactRequest {
  otherUser?: Profile;
  event?: Event;
}

type SidebarItem =
  | { type: "conversation"; data: ConversationWithDetails }
  | { type: "request"; data: RequestWithDetails };

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuthContext();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestWithDetails[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get("conversation"));
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetchAll();
  }, [profile]);

  useEffect(() => {
    if (activeConv) fetchMessages(activeConv);
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages:${activeConv}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  const fetchAll = async () => {
    if (!profile) return;
    setLoading(true);
    await Promise.all([fetchConversations(), fetchPendingRequests()]);
    setLoading(false);
  };

  const fetchConversations = async () => {
    if (!profile) return;
    const isOrganizer = profile.role === "organizer";
    const column = isOrganizer ? "organizer_id" : "sponsor_id";

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .eq(column, profile.id)
      .order("created_at", { ascending: false });

    if (!convs) return;

    const enriched: ConversationWithDetails[] = await Promise.all(
      convs.map(async (conv) => {
        const otherProfileId = isOrganizer ? conv.sponsor_id : conv.organizer_id;
        const [userRes, eventRes, msgRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", otherProfileId).single(),
          supabase.from("events").select("*").eq("id", conv.event_id).single(),
          supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1),
        ]);
        return { ...conv, otherUser: userRes.data || undefined, event: eventRes.data || undefined, lastMessage: msgRes.data?.[0] || undefined };
      })
    );
    setConversations(enriched);
  };

  const fetchPendingRequests = async () => {
    if (!profile) return;
    const isOrganizer = profile.role === "organizer";
    const column = isOrganizer ? "organizer_id" : "sponsor_id";

    const { data } = await supabase
      .from("contact_requests")
      .select("*")
      .eq(column, profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!data) return;

    const enriched: RequestWithDetails[] = await Promise.all(
      (data as any[]).map(async (req) => {
        const otherProfileId = isOrganizer ? req.sponsor_id : req.organizer_id;
        const [userRes, eventRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", otherProfileId).single(),
          supabase.from("events").select("*").eq("id", req.event_id).single(),
        ]);
        return { ...req, otherUser: userRes.data || undefined, event: eventRes.data || undefined };
      })
    );
    setPendingRequests(enriched);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data || []);
    if (profile) {
      await supabase.from("messages").update({ seen: true }).eq("conversation_id", convId).neq("sender_id", profile.id);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !profile) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: activeConv, sender_id: profile.id, content: newMessage.trim() });
    if (!error) setNewMessage("");
    setSending(false);
  };

  const handleAcceptRequest = async (req: RequestWithDetails) => {
    setProcessing(req.id);
    const { error } = await supabase.from("contact_requests").update({ status: "accepted" } as any).eq("id", req.id);
    if (error) { toast.error(error.message); setProcessing(null); return; }

    // Create conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ event_id: req.event_id, organizer_id: req.organizer_id, sponsor_id: req.sponsor_id })
      .select()
      .single();

    if (convError) {
      toast.error(convError.message);
    } else {
      toast.success("Solicitud aceptada. Chat habilitado.");
      setActiveRequest(null);
      if (newConv) setActiveConv(newConv.id);
    }
    setProcessing(null);
    await fetchAll();
  };

  const handleRejectRequest = async (req: RequestWithDetails) => {
    setProcessing(req.id);
    const { error } = await supabase.from("contact_requests").update({ status: "rejected" } as any).eq("id", req.id);
    if (error) toast.error(error.message);
    else toast.success("Solicitud rechazada");
    setProcessing(null);
    setActiveRequest(null);
    await fetchAll();
  };

  // Build unified sidebar list: pending requests first, then conversations
  const sidebarItems: SidebarItem[] = [
    ...pendingRequests.map((r) => ({ type: "request" as const, data: r })),
    ...conversations.map((c) => ({ type: "conversation" as const, data: c })),
  ];

  const activeConversation = conversations.find((c) => c.id === activeConv);
  const activeReq = pendingRequests.find((r) => r.id === activeRequest);

  const handleSidebarClick = (item: SidebarItem) => {
    if (item.type === "conversation") {
      setActiveConv(item.data.id);
      setActiveRequest(null);
    } else {
      setActiveRequest(item.data.id);
      setActiveConv(null);
      setMessages([]);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-fade-in" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 border-r border-border flex flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Mensajes</h2>
              {pendingRequests.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? "es" : ""} pendiente{pendingRequests.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : sidebarItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay conversaciones ni solicitudes</p>
                </div>
              ) : (
                sidebarItems.map((item) => {
                  const isRequest = item.type === "request";
                  const id = item.data.id;
                  const otherUser = isRequest ? (item.data as RequestWithDetails).otherUser : (item.data as ConversationWithDetails).otherUser;
                  const event = isRequest ? (item.data as RequestWithDetails).event : (item.data as ConversationWithDetails).event;
                  const lastMsg = isRequest ? undefined : (item.data as ConversationWithDetails).lastMessage;
                  const isActive = isRequest ? activeRequest === id : activeConv === id;

                  return (
                    <button
                      key={`${item.type}-${id}`}
                      onClick={() => handleSidebarClick(item)}
                      className={`w-full text-left p-4 border-b border-border/50 transition-all hover:bg-muted/50 ${
                        isActive ? "gradient-chat-active text-white" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0">
                          <img
                            src={resolveAvatar(otherUser?.avatar_url, otherUser?.id || id)}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          {isRequest && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                              <Clock className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{otherUser?.name || "Usuario"}</p>
                            {isRequest && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                                isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                              }`}>
                                Pendiente
                              </span>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                            {isRequest
                              ? `Solicitud · ${event?.title || "Evento"}`
                              : lastMsg?.content || event?.title || "Sin mensajes"
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Pending request view */}
            {activeRequest && activeReq ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                  <div className="h-20 w-20 rounded-full mx-auto overflow-hidden ring-4 ring-amber-200">
                    <img
                      src={resolveAvatar(activeReq.otherUser?.avatar_url, activeReq.otherUser?.id || activeReq.id)}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{activeReq.otherUser?.name}</h3>
                    <p className="text-muted-foreground text-sm capitalize">{activeReq.otherUser?.role}</p>
                    {activeReq.otherUser?.industry && (
                      <p className="text-sm text-muted-foreground">{activeReq.otherUser.industry}</p>
                    )}
                  </div>

                  {/* Event card */}
                  {activeReq.event && (
                    <div className="bg-muted/50 rounded-xl p-4 text-left space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Evento
                      </div>
                      <p className="font-semibold text-sm">{activeReq.event.title}</p>
                      {activeReq.event.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activeReq.event.date), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                      {activeReq.event.location && (
                        <p className="text-xs text-muted-foreground">{activeReq.event.location}</p>
                      )}
                    </div>
                  )}

                  {/* Pending notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 text-amber-700 font-medium text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Solicitud pendiente
                    </div>
                    <p className="text-xs text-amber-600">
                      {profile?.role === "organizer"
                        ? "Este sponsor quiere contactar contigo sobre este evento. Acepta para habilitar el chat."
                        : "Tu solicitud está pendiente de aprobación por el organizador."
                      }
                    </p>
                  </div>

                  {/* Accept / Reject buttons (only for organizers) */}
                  {profile?.role === "organizer" && (
                    <div className="flex justify-center gap-3">
                      <Button
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                        disabled={processing === activeReq.id}
                        onClick={() => handleAcceptRequest(activeReq)}
                      >
                        {processing === activeReq.id
                          ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          : <Check className="h-4 w-4 mr-1.5" />
                        }
                        Aceptar y chatear
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full px-6"
                        disabled={processing === activeReq.id}
                        onClick={() => handleRejectRequest(activeReq)}
                      >
                        <X className="h-4 w-4 mr-1.5" /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : !activeConv ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Selecciona una conversación</p>
                </div>
              </div>
            ) : (
              /* Active conversation chat */
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden">
                    <img
                      src={resolveAvatar(activeConversation?.otherUser?.avatar_url, activeConversation?.otherUser?.id || activeConv)}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activeConversation?.otherUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{activeConversation?.event?.title}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === profile?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMine ? "gradient-chat-sent text-white rounded-br-md" : "bg-muted rounded-bl-md"
                          }`}
                        >
                          <p className="overflow-wrap-break-word">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="rounded-pill"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      size="icon"
                      className="gradient-primary text-white border-0 rounded-full h-10 w-10 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right sidebar — Contact/Event info */}
          {activeConversation && (
            <div className="w-72 border-l border-border p-5 space-y-5 overflow-y-auto hidden lg:block">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full overflow-hidden mx-auto mb-3">
                  <img
                    src={resolveAvatar(activeConversation.otherUser?.avatar_url, activeConversation.otherUser?.id || activeConv!)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                </div>
                <h3 className="font-semibold">{activeConversation.otherUser?.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{activeConversation.otherUser?.role}</p>
                {activeConversation.otherUser?.industry && (
                  <p className="text-sm text-muted-foreground">{activeConversation.otherUser.industry}</p>
                )}
              </div>

              {activeConversation.event && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Evento
                  </div>
                  <p className="font-medium text-sm">{activeConversation.event.title}</p>
                  {activeConversation.event.date && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activeConversation.event.date), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                  {activeConversation.event.location && (
                    <p className="text-xs text-muted-foreground">{activeConversation.event.location}</p>
                  )}
                </div>
              )}

              {activeConversation.event && activeConversation.otherUser && (() => {
                const sponsorProfile = profile?.role === "sponsor" ? profile : activeConversation.otherUser;
                return (
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-muted-foreground mb-2">Match Score</p>
                    <MatchBadge score={calculateMatchScore(activeConversation.event!, sponsorProfile!)} size="lg" />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
