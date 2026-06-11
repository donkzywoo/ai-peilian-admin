"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLogin } from "@/components/AdminLogin";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/stores/auth-store";

export default function UsersPage() {
  const { user, isAdmin, isLoading, checkAuth } = useAuthStore();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>;
  }
  if (!user || !isAdmin) return <AdminLogin />;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold">用户管理</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">邮箱</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">注册时间</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">最后登录</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id as string} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-2.5 font-medium">{u.email as string}</td>
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt as string).toLocaleDateString("zh-CN") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                        {u.lastSignIn ? new Date(u.lastSignIn as string).toLocaleDateString("zh-CN") : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {u.confirmed ? (
                          <Badge className="text-[10px] bg-emerald-400/10 text-emerald-400 border-0">已验证</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-amber-400/10 text-amber-400 border-0">待验证</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
