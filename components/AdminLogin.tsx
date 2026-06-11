"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <CardTitle className="text-lg">后台管理</CardTitle>
          <p className="text-xs text-zinc-500 mt-1">AI 陪练 · 管理员登录</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs">{error}</div>
            )}
            <Input
              type="email" placeholder="管理员邮箱" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 text-sm"
            />
            <Input
              type="password" placeholder="密码" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 text-sm"
            />
            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              登录后台
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
