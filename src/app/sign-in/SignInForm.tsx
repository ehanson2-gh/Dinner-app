"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import type { Member } from "@/lib/types";
import { signIn } from "./actions";
import styles from "./SignInForm.module.css";

export function SignInForm({ members }: { members: Member[] }) {
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forgotHint, setForgotHint] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selected = members.find((m) => m.id === selectedId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn(selectedId, password);
      // A successful sign-in redirects server-side and never returns here.
      if (result && !result.ok) setError(result.reason);
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.users}>
        {members.map((m) => (
          <button
            type="button"
            key={m.id}
            className={`${styles.card} pressable ${m.id === selectedId ? styles.cardSelected : ""}`}
            onClick={() => setSelectedId(m.id)}
          >
            <Avatar name={m.name} color={m.avatarColor} size={56} fontSize={24} dim={m.id !== selectedId} />
            <span className={styles.name}>{m.name}</span>
          </button>
        ))}
      </div>

      <input
        className={`input ${styles.passwordInput}`}
        type="password"
        placeholder="Household password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className="btn btn-primary btn-block btn-lg pressable"
        disabled={isPending || !selected}
      >
        {isPending ? "Signing in…" : `Sign in as ${selected?.name ?? ""}`}
      </button>

      <button type="button" className={styles.forgot} onClick={() => setForgotHint(true)}>
        Forgot password
      </button>
      {forgotHint && (
        <p className={styles.hint}>
          Run <code>npm run set-password</code> locally to set a new one.
        </p>
      )}
    </form>
  );
}
