"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

type Me = { id: string; name: string; email: string; role: string; createdAt: string };

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authedFetch("/api/admin/me")
      .then((r) => r.json())
      .then((data: Me) => { setMe(data); setName(data.name); });
  }, []);

  async function saveName() {
    setSaving(true);
    setNameMsg(null);
    const res = await authedFetch("/api/admin/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setNameMsg(res.ok ? { ok: true, text: "Name updated" } : { ok: false, text: json.error });
    if (res.ok && me) setMe({ ...me, name: json.name });
    setSaving(false);
  }

  async function changePassword() {
    setSaving(true);
    setPwMsg(null);
    const res = await authedFetch("/api/admin/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const json = await res.json();
    setPwMsg(res.ok ? { ok: true, text: "Password changed" } : { ok: false, text: json.error });
    if (res.ok) { setCurrentPw(""); setNewPw(""); }
    setSaving(false);
  }

  if (!me) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">{me.email}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Info</CardTitle>
            <Badge variant="secondary">{me.role.replace("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {nameMsg && (
            <p className={`text-sm ${nameMsg.ok ? "text-green-600" : "text-destructive"}`}>
              {nameMsg.text}
            </p>
          )}
          <Button onClick={saveName} disabled={saving || name === me.name} size="sm">
            Save name
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Current password</Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? "text-green-600" : "text-destructive"}`}>
              {pwMsg.text}
            </p>
          )}
          <Button onClick={changePassword} disabled={saving || !currentPw || !newPw} size="sm">
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
