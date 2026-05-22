"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  tableName: z.string().min(1),
  textColumn: z.string().min(1),
  idColumn: z.string().min(1),
  vectorColumn: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function RegisterProjectSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      host: "",
      port: 3306,
      database: "",
      user: "",
      password: "",
      tableName: "",
      textColumn: "",
      idColumn: "",
      vectorColumn: "embedding",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await authedFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      toast.error("Failed to register project");
      return;
    }

    const data = (await res.json()) as { apiKey: string };
    setApiKey(data.apiKey);
    setOpen(false);
    reset();
    router.refresh();
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Register Project
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Register Project</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4 px-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project Name" error={errors.name?.message}>
                <Input placeholder="Project Name" {...register("name")} />
              </Field>
              <Field label="Slug" error={errors.slug?.message}>
                <Input placeholder="spm" {...register("slug")} />
              </Field>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Client Database Connection
            </p>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Host" error={errors.host?.message} className="col-span-2">
                <Input placeholder="127.0.0.1" {...register("host")} />
              </Field>
              <Field label="Port" error={errors.port?.message}>
                <Input type="number" {...register("port", { valueAsNumber: true })} />
              </Field>
            </div>
            <Field label="Database" error={errors.database?.message}>
              <Input placeholder="my_database" {...register("database")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="User" error={errors.user?.message}>
                <Input placeholder="db_user" {...register("user")} />
              </Field>
              <Field label="Password" error={errors.password?.message}>
                <Input type="password" placeholder="••••••••" {...register("password")} />
              </Field>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Table Configuration
            </p>

            <Field label="Table Name" error={errors.tableName?.message}>
              <Input placeholder="products" {...register("tableName")} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Text Column" error={errors.textColumn?.message}>
                <Input placeholder="name" {...register("textColumn")} />
              </Field>
              <Field label="ID Column" error={errors.idColumn?.message}>
                <Input placeholder="id" {...register("idColumn")} />
              </Field>
              <Field label="Vector Column" error={errors.vectorColumn?.message}>
                <Input placeholder="embedding" {...register("vectorColumn")} />
              </Field>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Registering…" : "Register"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!apiKey} onOpenChange={(o) => !o && setApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project registered</DialogTitle>
            <DialogDescription>
              Copy your API key now - it will not be shown again in full.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">{apiKey}</span>
            <Button variant="ghost" size="sm" onClick={copyKey}>
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Pass this key as <code className="text-xs">X-API-Key</code> when calling{" "}
            <code className="text-xs">POST /api/sessions</code>.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
