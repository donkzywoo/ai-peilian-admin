"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, MessageSquare, BookX, Loader2 } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const { user, isAdmin, isLoading, checkAuth } = useAuthStore();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (isAdmin) fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user || !isAdmin) return <AdminLogin />;

  const cards = [
    { label: "注册用户", value: stats.users ?? "—", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "题库总量", value: stats.questions ?? "—", icon: FileText, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "批改记录", value: stats.answers ?? "—", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "错题数量", value: stats.wrongQuestions ?? "—", icon: BookX, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <h1 className="text-lg font-bold mb-6">仪表盘</h1>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="border-zinc-800 bg-zinc-900">
                <CardContent className="pt-5 pb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
                    <p className="text-2xl font-bold">{c.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
