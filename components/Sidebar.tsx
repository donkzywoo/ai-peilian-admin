"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, LogOut, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/support", label: "客服消息", icon: MessageCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-56 border-r border-zinc-800 bg-zinc-900 h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm text-zinc-100">
          <Shield className="h-4 w-4 text-emerald-400" />
          AI 陪练管理
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出
        </Button>
      </div>
    </aside>
  );
}
