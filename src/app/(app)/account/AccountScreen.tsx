"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/ToastProvider";
import { formatTime12h } from "@/lib/date";
import type { Household, Member } from "@/lib/types";
import { signOut } from "@/app/sign-in/actions";
import { toggleAvoidProtein } from "./actions";
import styles from "./AccountScreen.module.css";

export function AccountScreen({
  me,
  partnerName,
  members,
  household,
}: {
  me: Member;
  partnerName: string;
  members: Member[];
  household: Household;
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();
  const [avoidProtein, setAvoidProtein] = useState(household.avoidBackToBackProtein);

  function handleToggle() {
    setAvoidProtein((v) => !v);
    startTransition(async () => {
      await toggleAvoidProtein();
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className={styles.h1}>Account</h1>

      <div className={styles.profileCard}>
        <Avatar name={me.name} color={me.avatarColor} size={52} fontSize={22} />
        <div>
          <div className={styles.profileName}>{me.name}</div>
          <div className="sub">{me.email ?? "no email set"}</div>
        </div>
        <button
          type="button"
          className={`btn btn-ghost pressable ${styles.editBtn}`}
          onClick={() => flash("Profile editing isn't built yet")}
        >
          Edit
        </button>
      </div>

      <div className={styles.kicker}>You</div>
      <div className={styles.group}>
        <div className={styles.row}>
          Avatar colour
          <span
            className={styles.swatch}
            style={{ background: me.avatarColor === "accent" ? "var(--color-accent)" : "var(--color-accent-2)" }}
          />
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          Remind me to log at
          <span className={`sub ${styles.rowValue}`}>{me.reminderTime ? formatTime12h(me.reminderTime) : "Off"}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          Default log screen
          <span className={`sub ${styles.rowValue}`}>{me.defaultLogScreen}</span>
        </div>
      </div>

      <div className={styles.kicker}>Household · shared with {partnerName}</div>
      <div className={styles.group}>
        <div className={styles.row}>
          Week starts on
          <span className={`sub ${styles.rowValue}`}>
            {household.weekStartsOn.charAt(0).toUpperCase() + household.weekStartsOn.slice(1)}
          </span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          Repeat no sooner than
          <span className={`sub ${styles.rowValue}`}>{household.repeatWindowDays} days</span>
        </div>
        <div className={styles.divider} />
        <button
          type="button"
          className={`${styles.row} ${styles.rowInteractive} pressable`}
          disabled={isPending}
          onClick={handleToggle}
        >
          Avoid back-to-back protein
          <span
            className={styles.toggle}
            style={{
              background: avoidProtein ? "var(--color-accent)" : "var(--color-neutral-300)",
              justifyContent: avoidProtein ? "flex-end" : "flex-start",
            }}
          >
            <span className={styles.toggleKnob} />
          </span>
        </button>
        <div className={styles.divider} />
        <div className={styles.row}>
          Members
          <span className={`sub ${styles.rowValue}`}>{members.map((m) => m.name).join(", ")}</span>
        </div>
      </div>

      <button
        type="button"
        className={`btn btn-secondary btn-block pressable ${styles.signOut}`}
        style={{ minHeight: 44 }}
        onClick={() => startTransition(() => signOut())}
      >
        Sign out
      </button>
    </div>
  );
}
