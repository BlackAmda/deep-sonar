"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden bg-[#0A1628]">
        {/* Subtle radial glow behind logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-[480px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-16 text-center">
          <Image src="/DeepSonar.png" alt="DeepSonar" width={280} height={280} priority className="drop-shadow-[0_0_40px_rgba(6,182,212,0.35)]" />
          <div className="flex flex-col gap-2">
            <p className="text-cyan-400 text-sm font-medium tracking-widest uppercase">
              Semantic Search Platform
            </p>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Embed your data. Search by meaning. Deploy in minutes.
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 bg-background">
        <div className="w-full max-w-sm flex flex-col gap-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3">
            <Image src="/DeepSonar.png" alt="DeepSonar" width={40} height={40} />
            <span className="text-lg font-semibold">DeepSonar</span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your admin account</p>
          </div>

          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full mt-1">
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
