import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MatchBadge } from "@/components/MatchBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, CalendarDays, MessageSquare } from "lucide-react";
import { resolveAvatar } from "@/lib/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Conversation, Message, Profile, Event } from "@/lib/supabase-helpers";
import { calculateMatchScore } from "@/lib/supabase-helpers";

interface ConversationWithDetails extends Conversation {
  otherUser?: Profile;
  event?: Event;
  lastMessage?: Message;
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuthContext();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetchConversations();
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
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  const fetchConversations = async () => {
    if (!profile) return;
    const isOrganizer = profile.role === "organizer";
    const column = isOrganizer ? "organizer_id" : "sponsor_id";

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .eq(column, profile.id)
      .order("created_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Fetch related data
    const enriched: ConversationWithDetails[] = await Promise.all(
      convs.map(async (conv) => {
        const otherProfileId = isOrganizer ? conv.sponsor_id : conv.organizer_id;
        const [userRes, eventRes, msgRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", otherProfileId).single(),
          supabase.from("events").select("*").eq("id", conv.event_id).single(),
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);
        return {
          ...conv,
          otherUser: userRes.data || undefined,
          event: eventRes.data || undefined,
          lastMessage: msgRes.data?.[0] || undefined,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);

    if (searchParams.get("conversation") && !activeConv) {
      setActiveConv(searchParams.get("conversation"));
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark as seen
    if (profile) {
      await supabase
        .from("messages")
        .update({ seen: true })
        .eq("conversation_id", convId)
        .neq("sender_id", profile.id);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !profile) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConv,
      sender_id: profile.id,
      content: newMessage.trim(),
    });

    if (!error) setNewMessage("");
    setSending(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConv);

  return (
    <DashboardLayout>
      <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-fade-in" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="flex h-full">
          {/* Sidebar - Conversation List */}
          <div className="w-80 border-r border-border flex flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Mensajes</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay conversaciones</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv.id)}
                    className={`w-full text-left p-4 border-b border-border/50 transition-all hover:bg-muted/50 ${
                      activeConv === conv.id ? "gradient-chat-active text-white" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                        <img src={resolveAvatar(conv.otherUser?.avatar_url, conv.otherUser?.id || conv.id)} alt="" className="h-10 w-10 rounded-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {conv.otherUser?.name || "Usuario"}
                        </p>
                        <p className={`text-xs truncate ${
                          activeConv === conv.id ? "text-white/70" : "text-muted-foreground"
                        }`}>
                          {conv.lastMessage?.content || conv.event?.title || "Sin mensajes"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Center */}
          <div className="flex-1 flex flex-col min-w-0">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Selecciona una conversación</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
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
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMine
                              ? "gradient-chat-sent text-white rounded-br-md"
                              : "bg-muted rounded-bl-md"
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
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

          {/* Right sidebar - Contact/Event info */}
          {activeConversation && (
            <div className="w-72 border-l border-border p-5 space-y-5 overflow-y-auto hidden lg:block">
              {/* Contact info */}
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">{activeConversation.otherUser?.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {activeConversation.otherUser?.role}
                </p>
                {activeConversation.otherUser?.industry && (
                  <p className="text-sm text-muted-foreground">{activeConversation.otherUser.industry}</p>
                )}
              </div>

              {/* Event info */}
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

              {/* Match score */}
              {activeConversation.event && activeConversation.otherUser && (() => {
                const sponsorProfile = profile?.role === "sponsor" ? profile : activeConversation.otherUser;
                return (
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-muted-foreground mb-2">Match Score</p>
                    <MatchBadge
                      score={calculateMatchScore(activeConversation.event!, sponsorProfile!)}
                      size="lg"
                    />
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
