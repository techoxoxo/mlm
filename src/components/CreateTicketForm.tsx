"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTicketAction } from "@/app/actions/tickets";
import { LifeBuoy } from "lucide-react";

export function CreateTicketForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("payment");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!subject.trim() || !description.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const res = await createTicketAction(subject, category, description);
      if (!res.ok) {
        setError(res.error || "Failed to submit ticket.");
      } else {
        setSubject("");
        setDescription("");
        setShowForm(false);
        router.refresh();
        if (res.data) {
          router.push(`/dashboard/support/${res.data}`);
        }
      }
    });
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-gold"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px" }}
        >
          <LifeBuoy size={16} /> Open New Support Ticket
        </button>
      ) : (
        <div className="card" style={{ padding: 22, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Open a New Ticket</h3>
            <button
              onClick={() => setShowForm(false)}
              className="btn btn-secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ color: "#ef4444", fontSize: 13, background: "rgba(239, 68, 68, 0.08)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--border)" }}
              >
                <option value="payment">USDT Payment / Deposit / Withdrawal</option>
                <option value="matrix">Autopool & Matrix Placements</option>
                <option value="bug">Technical Issue or Bug</option>
                <option value="other">General Inquiry</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Subject</label>
              <input
                type="text"
                className="input"
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Description</label>
              <textarea
                className="input"
                rows={5}
                placeholder="Please describe your issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ width: "100%", fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-gold"
              style={{ alignSelf: "flex-start", padding: "10px 24px" }}
            >
              {isPending ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
