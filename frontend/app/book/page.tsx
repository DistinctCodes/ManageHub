"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export default function BookPage() {
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    workspaceId: "",
    date: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await apiClient.post("/bookings/public/day-pass", form);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return <p className="p-8 text-center">Your day pass for {form.date} is confirmed — check your email.</p>;
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Book a Day Pass</h1>
      <input placeholder="Full name" value={form.guestName} onChange={update("guestName")} required className="w-full border rounded p-2" />
      <input type="email" placeholder="Email" value={form.guestEmail} onChange={update("guestEmail")} required className="w-full border rounded p-2" />
      <input placeholder="Phone" value={form.guestPhone} onChange={update("guestPhone")} required className="w-full border rounded p-2" />
      <input placeholder="Workspace ID" value={form.workspaceId} onChange={update("workspaceId")} required className="w-full border rounded p-2" />
      <input type="date" value={form.date} onChange={update("date")} required className="w-full border rounded p-2" />
      {status === "error" && <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>}
      <button type="submit" disabled={status === "loading"} className="w-full bg-black text-white rounded p-2">
        {status === "loading" ? "Booking..." : "Book now"}
      </button>
    </form>
  );
}
