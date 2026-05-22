"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, RefreshCw, Play, Copy, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  apiKey: string;
}

export function ProjectActions({ projectId, projectName, apiKey }: ProjectActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function triggerIngest() {
    const res = await fetch(`/api/projects/${projectId}/ingest`, { method: "POST" });
    if (res.status === 409) { toast.error("Ingest already running"); return; }
    if (res.status === 503) { toast.error("Ollama unreachable"); return; }
    if (!res.ok) { toast.error("Ingest failed"); return; }
    const data = (await res.json()) as { embedded: number; skipped: number; durationMs: number };
    toast.success(`Ingested ${data.embedded} rows in ${(data.durationMs / 1000).toFixed(1)}s`);
    router.refresh();
  }

  async function rotateKey() {
    const res = await fetch(`/api/projects/${projectId}/rotate-key`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to rotate key"); return; }
    const data = (await res.json()) as { apiKey: string };
    setNewKey(data.apiKey);
    router.refresh();
  }

  async function deleteProject() {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete project"); return; }
    toast.success(`Deleted ${projectName}`);
    router.refresh();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="size-8 p-0">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => copyKey(apiKey)}>
            <Copy className="size-4 mr-2" />
            Copy API Key
          </DropdownMenuItem>
          <DropdownMenuItem onClick={rotateKey}>
            <RotateCcw className="size-4 mr-2" />
            Rotate Key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={triggerIngest}>
            <Play className="size-4 mr-2" />
            Trigger Ingest
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project, all sessions, and all usage logs. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteProject}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Key</DialogTitle>
            <DialogDescription>
              Old key is invalidated. Copy the new key - it won&apos;t be shown again in full.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">{newKey}</span>
            <Button variant="ghost" size="sm" onClick={() => newKey && copyKey(newKey)}>
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
