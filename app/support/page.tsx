"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, ChevronLeft, CheckCheck, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AdminLogin } from "@/components/AdminLogin";
import { Sidebar } from "@/components/Sidebar";

const SUPABASE_URL = "https://uchkpdvpxkwcftzicygn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaGtwZHZweGt3Y2Z0emljeWduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1NDk1MiwiZXhwIjoyMDk2NTMwOTUyfQ.3z8cwVVshb4Yc70whlxuh6yg8jsVWK0WQrzPYSUFapE";

interface ChatMsg {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  sender: string;
  is_read: boolean;
  status: string;
  created_at: string;
}

interface UserThread {
  user_id: string;
  user_email: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
  status: string;
}

export default function AdminSupportPage() {
  const { user, isAdmin, isLoading, checkAuth } = useAuthStore();
  const [threads, setThreads] = useState<UserThread[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_messages?select=*&order=created_at.desc&limit=200`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      });
      const raw = await res.json();
      const all: ChatMsg[] = Array.isArray(raw) ? raw : (raw ? [raw] : []);

      // Group by userId
      const grouped: Record<string, { msgs: ChatMsg[]; email: string }> = {};
      for (const m of all) {
        if (!grouped[m.user_id]) grouped[m.user_id] = { msgs: [], email: m.user_email };
        grouped[m.user_id].msgs.push(m);
      }

      const threadList: UserThread[] = Object.entries(grouped).map(([uid, g]) => ({
        user_id: uid,
        user_email: g.email,
        lastMsg: g.msgs[0]?.message?.slice(0, 40) || "",
        lastTime: g.msgs[0]?.created_at || "",
        unread: g.msgs.filter((m) => m.sender === "user" && !m.is_read).length,
        status: g.msgs[0]?.status || "open",
      }));

      // Filter invalid UUIDs
      const valid = threadList.filter((t) => t.user_id && t.user_id !== "undefined" && t.user_id.length > 30);
      valid.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
      setThreads(valid);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_messages?select=*&user_id=eq.${selectedUser}&order=created_at.asc&limit=100`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      });
      const raw = await res.json();
      const data: ChatMsg[] = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      setMessages(data);

      // Mark user messages as read
      const unreadIds = data.filter((m) => m.sender === "user" && !m.is_read).map((m) => m.id);
      for (const id of unreadIds) {
        await fetch(`${SUPABASE_URL}/rest/v1/support_messages?id=eq.${id}`, {
          method: "PATCH",
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        });
      }
    } catch { /* ignore */ }
  }, [selectedUser]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { loadMessages(); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [loadMessages]);

  // Polling
  useEffect(() => {
    if (!isAdmin) return;
    pollingRef.current = setInterval(() => { loadThreads(); if (selectedUser) loadMessages(); }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [isAdmin, selectedUser, loadThreads, loadMessages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedUser) return;
    setSending(true);
    try {
      const thread = threads.find((t) => t.user_id === selectedUser);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_messages`, {
        method: "POST",
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          user_id: selectedUser,
          user_email: thread?.user_email || "",
          message: newMsg.trim(),
          sender: "admin",
          is_read: false,
          status: "open",
        }),
      });
      if (res.ok) {
        setNewMsg("");
        loadMessages();
        loadThreads();
      }
    } catch { toast.error("发送失败"); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>;
  if (!user || !isAdmin) return <AdminLogin />;

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />

      {/* Thread list */}
      <div className={`${selectedUser ? "hidden md:flex" : "flex"} md:w-80 w-full shrink-0 flex-col border-r border-zinc-800`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="text-sm font-bold">客服消息</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400" onClick={loadThreads}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
          ) : threads.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-12">暂无消息</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.user_id}
                onClick={() => setSelectedUser(t.user_id)}
                className={`w-full text-left p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 ${
                  selectedUser === t.user_id ? "bg-zinc-800" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200 truncate">{t.user_email}</span>
                  <span className="text-[10px] text-zinc-500">{new Date(t.lastTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{t.lastMsg}</p>
                {t.unread > 0 && (
                  <Badge className="mt-1 text-[10px] bg-red-500/20 text-red-400 border-0">{t.unread} 未读</Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">选择一个用户开始对话</div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-3 border-b border-zinc-800 flex items-center gap-3 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={() => setSelectedUser(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-zinc-400">
                  {threads.find((t) => t.user_id === selectedUser)?.user_email?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {threads.find((t) => t.user_id === selectedUser)?.user_email || ""}
                </p>
                <p className="text-[10px] text-zinc-500">在线客服对话</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => {
                const isAdmin = m.sender === "admin";
                const showTime = i === 0 || new Date(m.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;
                return (
                  <div key={m.id || i}>
                    {showTime && (
                      <div className="text-center mb-3">
                        <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                          {new Date(m.created_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      {!isAdmin && <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mr-2"><span className="text-[10px] text-zinc-400">用</span></div>}
                      <div className={`max-w-[70%] ${isAdmin ? "" : ""}`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          isAdmin
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                        }`}>
                          {m.message}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isAdmin ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(m.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isAdmin && m.is_read && <CheckCheck className="h-3 w-3 text-blue-400" />}
                        </div>
                      </div>
                      {isAdmin && <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 ml-2"><span className="text-[10px] text-blue-400">客</span></div>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 shrink-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="输入回复... (Enter 发送)"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm resize-none min-h-[44px]"
                />
                <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={!newMsg.trim() || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
