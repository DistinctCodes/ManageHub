"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, Plus, X } from "lucide-react";
import { useAuthState } from "@/lib/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { formatDistanceToNow } from "date-fns";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api").replace("/api", "");

interface Participant {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: Participant;
}

interface Thread {
  id: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesPage() {
  const { user, accessToken } = useAuthState();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Participant[]>([]);
  const [showNewThread, setShowNewThread] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch threads
  useEffect(() => {
    apiClient
      .get<{ data: Thread[] }>("/messages/threads")
      .then((res) => setThreads(res.data ?? []))
      .catch(() => {});
  }, []);

  // WebSocket
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(SOCKET_URL, { auth: { token: accessToken } });
    socketRef.current = socket;

    socket.on("new-message", (msg: Message & { threadId: string }) => {
      if (activeThread?.id === msg.threadId) {
        setMessages((prev) => [...prev, msg]);
      }
      setThreads((prev) =>
        prev.map((t) =>
          t.id === msg.threadId
            ? { ...t, lastMessage: msg, unreadCount: activeThread?.id === msg.threadId ? 0 : t.unreadCount + 1 }
            : t
        )
      );
    });

    return () => { socket.disconnect(); };
  }, [accessToken, activeThread?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openThread = async (thread: Thread) => {
    setActiveThread(thread);
    try {
      const res = await apiClient.get<{ data: Message[] }>(`/messages/threads/${thread.id}/messages`);
      setMessages(res.data ?? []);
      await apiClient.patch(`/messages/threads/${thread.id}/read`, {});
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
      );
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeThread) return;
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      content: input,
      senderId: user?.id ?? "",
      createdAt: new Date().toISOString(),
      sender: { id: user?.id ?? "", firstname: user?.firstname ?? "", lastname: user?.lastname ?? "", email: user?.email ?? "" },
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    try {
      await apiClient.post(`/messages/threads/${activeThread.id}/messages`, { content: optimistic.content });
    } catch {}
  };

  const searchMembers = async (q: string) => {
    setMemberSearch(q);
    if (!q.trim()) { setMemberResults([]); return; }
    try {
      const res = await apiClient.get<{ data: Participant[] }>(`/community/members?search=${encodeURIComponent(q)}`);
      setMemberResults(res.data ?? []);
    } catch {}
  };

  const startThread = async (member: Participant) => {
    setLoading(true);
    try {
      const res = await apiClient.post<{ data: Thread }>("/messages/threads", { participantId: member.id });
      const thread = res.data;
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
      setShowNewThread(false);
      setMemberSearch("");
      setMemberResults([]);
      openThread(thread);
    } catch {} finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (thread: Thread) =>
    thread.participants.find((p) => p.id !== user?.id) ?? thread.participants[0];

  const filteredThreads = threads.filter((t) => {
    const other = getOtherParticipant(t);
    return `${other.firstname} ${other.lastname}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-gray-50 lg:pl-64">
      {/* Left pane — thread list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowNewThread(true)}
              className="p-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <p className="text-center text-sm text-gray-400 mt-10">No conversations yet</p>
          ) : (
            filteredThreads.map((thread) => {
              const other = getOtherParticipant(thread);
              const isActive = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${isActive ? "bg-gray-50" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {other.firstname[0]}{other.lastname[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{other.firstname} {other.lastname}</span>
                      {thread.lastMessage && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {thread.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
                      {thread.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right pane — message thread */}
      <div className="flex-1 flex flex-col">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              {(() => {
                const other = getOtherParticipant(activeThread);
                return (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {other.firstname[0]}{other.lastname[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{other.firstname} {other.lastname}</p>
                      <p className="text-xs text-gray-400">{other.email}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <span className="text-xs text-gray-400 mb-1 ml-1">{msg.sender.firstname} {msg.sender.lastname}</span>
                    )}
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isOwn ? "bg-gray-900 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"}`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-2.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-gray-500 text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New thread modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">New Message</h2>
              <button onClick={() => { setShowNewThread(false); setMemberSearch(""); setMemberResults([]); }}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={memberSearch}
                onChange={(e) => searchMembers(e.target.value)}
                placeholder="Search members by name…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                autoFocus
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {memberResults.map((member) => (
                <button
                  key={member.id}
                  onClick={() => startThread(member)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {member.firstname[0]}{member.lastname[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.firstname} {member.lastname}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </button>
              ))}
              {memberSearch && memberResults.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">No members found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}