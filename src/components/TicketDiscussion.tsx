"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { replyToTicketAction, closeTicketAction } from "@/app/actions/tickets";
import { ArrowLeft, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type Msg = {
  id: string;
  senderId: string;
  role: string;
  message: string;
  createdAt: Date;
};

type Tkt = {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: string;
  createdAt: Date;
};

export function TicketDiscussion({
  ticket,
  messages: initialMessages,
  currentUserId,
  isAdmin = false,
}: {
  ticket: Tkt;
  messages: Msg[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!replyText.trim()) return;

    startTransition(async () => {
      const res = await replyToTicketAction(ticket.id, replyText);
      if (!res.ok) {
        setError(res.error || "Failed to send message.");
      } else {
        setReplyText("");
        // Optimistic update
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            senderId: currentUserId,
            role: isAdmin ? "admin" : "user",
            message: replyText.trim(),
            createdAt: new Date(),
          },
        ]);
        router.refresh();
      }
    });
  };

  const handleCloseTicket = () => {
    if (!confirm("Are you sure you want to resolve and close this support ticket? You will not be able to send further replies.")) {
      return;
    }
    startTransition(async () => {
      const res = await closeTicketAction(ticket.id);
      if (!res.ok) {
        setError(res.error || "Failed to close ticket.");
      } else {
        router.refresh();
      }
    });
  };

  const CATEGORY_LABELS: Record<string, string> = {
    payment: "Payment / Wallet",
    matrix: "Matrix & Placement",
    bug: "Technical Bug",
    other: "General Help",
  };

  const backUrl = isAdmin ? "/admin/support" : "/dashboard/support";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Back button */}
      <div>
        <Link
          href={backUrl}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 13, textDecoration: "none" }}
        >
          <ArrowLeft size={15} /> Back to tickets
        </Link>
      </div>

      {/* Ticket Header card */}
      <div className="card" style={{ padding: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="pill pill-gold">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
            <span
              className="pill"
              style={{
                background: ticket.status === "closed" ? "rgba(255,255,255,0.05)" : ticket.status === "answered" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: ticket.status === "closed" ? "var(--faint)" : ticket.status === "answered" ? "#10b981" : "#ef4444",
                border: ticket.status === "closed" ? "1px solid rgba(255,255,255,0.1)" : ticket.status === "answered" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {ticket.status}
            </span>
          </div>
          <h2 style={{ fontSize: 20, margin: 0 }}>{ticket.subject}</h2>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>Opened on {new Date(ticket.createdAt).toLocaleString()}</span>
        </div>

        {ticket.status !== "closed" && (
          <button
            onClick={handleCloseTicket}
            disabled={isPending}
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", height: "fit-content", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <CheckCircle2 size={15} /> Close & Resolve Ticket
          </button>
        )}
      </div>

      {/* Discussion Chat Box */}
      <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", height: 500, overflow: "hidden" }}>
        {/* Messages List Area */}
        <div style={{ flex: 1, padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, background: "rgba(0,0,0,0.08)" }}>
          {messages.map((m) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                    {isMe ? "You" : m.role === "admin" ? "🛡️ Admin Support" : "User"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "12px 16px",
                    borderRadius: 14,
                    borderTopRightRadius: isMe ? 2 : 14,
                    borderTopLeftRadius: isMe ? 14 : 2,
                    background: isMe ? "rgba(248,198,23,0.08)" : "var(--surface-2)",
                    border: isMe ? "1px solid rgba(248,198,23,0.18)" : "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Area */}
        <div style={{ borderTop: "1px solid var(--border)", padding: 18, background: "var(--surface)" }}>
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {ticket.status === "closed" ? (
            <div style={{ textAlign: "center", color: "var(--faint)", fontSize: 13.5, padding: 8 }}>
              🔒 This support ticket has been closed and resolved. No further messages can be sent.
            </div>
          ) : (
            <form onSubmit={handleSendReply} style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                className="input"
                placeholder={isAdmin ? "Type your response to the user..." : "Type your reply message..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={isPending}
                style={{ flex: 1, padding: "10px 14px" }}
              />
              <button
                type="submit"
                disabled={isPending || !replyText.trim()}
                className="btn btn-gold"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 18px", whiteSpace: "nowrap" }}
              >
                <Send size={15} /> Send Reply
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
