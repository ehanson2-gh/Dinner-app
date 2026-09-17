"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/ToastProvider";
import { weekdayLetter, dayNumber, formatWeekdayDayMonth, formatCookedAgo } from "@/lib/date";
import { NEVER_COOKED_DAYS } from "@/lib/types";
import type { AvatarColor, WeekPlanDay } from "@/lib/types";
import {
  regenerateWeek,
  swapDay,
  clearDay,
  pickRecipeForDayAction,
  saveWeek,
  confirmAte,
  quickAlt,
} from "./actions";
import styles from "./WeekScreen.module.css";

type RecipeOption = { id: string; name: string; daysSinceLastCooked: number };

export function WeekScreen({
  weekStartDate,
  weekRangeLabel,
  dates,
  days,
  saved,
  loggedDates,
  loggedNotes,
  activityText,
  activityAvatarName,
  activityAvatarColor,
  todayISO,
  recipes,
}: {
  weekStartDate: string;
  weekRangeLabel: string;
  dates: string[];
  days: WeekPlanDay[];
  saved: boolean;
  loggedDates: string[];
  loggedNotes: Record<string, string | null>;
  activityText: string;
  activityAvatarName: string;
  activityAvatarColor: AvatarColor;
  todayISO: string;
  recipes: RecipeOption[];
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selDate, setSelDate] = useState(dates.includes(todayISO) ? todayISO : dates[0]);
  // The picker sheet serves two intents: "plan" (Pick recipe — set the day)
  // and "log" (Log what we actually ate — set the day and log it in one go).
  const [picker, setPicker] = useState<null | "plan" | "log">(null);
  const [pq, setPq] = useState("");

  const selIndex = dates.indexOf(selDate);
  const selDay = days[selIndex];
  const isLogged = loggedDates.includes(selDate);
  const loggedSet = useMemo(() => new Set(loggedDates), [loggedDates]);

  function selectDay(date: string) {
    setSelDate(date);
    try {
      document.cookie = `dt_selday=${date};path=/;max-age=2592000`;
    } catch {
      // localStorage/cookies can be unavailable (private mode); non-critical.
    }
  }

  function openPicker(intent: "plan" | "log") {
    setPq("");
    setPicker(intent);
  }

  function run(action: () => Promise<void>, after?: () => void) {
    startTransition(async () => {
      await action();
      router.refresh();
      after?.();
    });
  }

  const filteredPicks = recipes
    .filter((r) => r.name.toLowerCase().includes(pq.toLowerCase()))
    .slice(0, 30);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={`${styles.h1}`}>This week</h1>
        <span className={styles.range}>{weekRangeLabel}</span>
      </div>

      <div className={styles.strip}>
        {dates.map((date, i) => {
          const on = date === selDate;
          const day = days[i];
          const logged = loggedSet.has(date);
          let pipColor: string;
          if (logged) pipColor = on ? "var(--color-bg)" : "var(--color-accent-2)";
          else if (day.kind === "meal")
            pipColor = on
              ? "color-mix(in srgb, var(--color-bg) 55%, transparent)"
              : "color-mix(in srgb, var(--color-text) 22%, transparent)";
          else pipColor = "transparent";

          return (
            <button
              key={date}
              type="button"
              className={`${styles.tile} pressable ${on ? styles.tileOn : ""}`}
              onClick={() => selectDay(date)}
            >
              <span className={styles.tileLetter}>{weekdayLetter(date)}</span>
              <span className={styles.tileNum}>{dayNumber(date)}</span>
              <span className={styles.tilePip} style={{ background: pipColor }} />
            </button>
          );
        })}
      </div>

      <div className={styles.pane}>
        <div className={styles.paneKickerRow}>
          <span className={styles.paneKicker}>{formatWeekdayDayMonth(selDate)}</span>
          <StatusBadge logged={isLogged} kind={selDay.kind} />
        </div>
        <h2 className={styles.mealName}>{selDay.name}</h2>
        {selDay.tags.length > 0 && (
          <div className={styles.tagRow}>
            {selDay.tags.map((t) => (
              <span key={t} className="tag tag-accent-2">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className={styles.note}>{loggedNotes[selDate] || "No notes yet"}</p>

        <button
          type="button"
          className="btn btn-primary btn-block btn-lg pressable"
          disabled={isPending}
          onClick={() =>
            run(
              () => confirmAte(weekStartDate, selIndex),
              () => flash(`${selDay.name} logged`)
            )
          }
        >
          {isLogged ? "✓ Logged — confirm again" : "✓ We ate this"}
        </button>

        <button type="button" className={styles.ghostLink} onClick={() => openPicker("log")}>
          {isLogged ? "Logged something else? →" : "Log what we actually ate →"}
        </button>

        <div className={styles.actionRow}>
          <button
            type="button"
            className="btn btn-secondary pressable"
            style={{ minHeight: 44 }}
            disabled={isPending}
            onClick={() => run(() => swapDay(weekStartDate, selIndex))}
          >
            Swap
          </button>
          <button
            type="button"
            className="btn btn-secondary pressable"
            style={{ minHeight: 44 }}
            disabled={isPending}
            onClick={() => openPicker("plan")}
          >
            Pick recipe
          </button>
          <button
            type="button"
            className="btn btn-secondary pressable"
            style={{ minHeight: 44, width: 46, padding: 0, flex: "none" }}
            disabled={isPending}
            onClick={() => run(() => clearDay(weekStartDate, selIndex))}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.weekActionRow}>
        <button
          type="button"
          className="btn btn-secondary pressable"
          style={{ minHeight: 44 }}
          disabled={isPending}
          onClick={() => run(() => regenerateWeek(weekStartDate))}
        >
          ↻ Regenerate week
        </button>
        <button
          type="button"
          className="btn btn-primary pressable"
          style={{ minHeight: 44 }}
          disabled={isPending || saved}
          onClick={() => run(() => saveWeek(weekStartDate), () => flash("Week saved"))}
        >
          {saved ? "✓ Saved" : "Save week"}
        </button>
      </div>

      <div className={styles.activity}>
        <Avatar name={activityAvatarName} color={activityAvatarColor} size={18} fontSize={9} />
        <span className={styles.activityText}>
          {activityAvatarName} {activityText.slice(activityAvatarName.length + 1)}
        </span>
      </div>

      <Sheet open={picker !== null} onClose={() => setPicker(null)}>
        <span className={styles.sheetKicker}>
          {picker === "log"
            ? `What did we actually eat on ${formatWeekdayDayMonth(selDate)}?`
            : `Pick a recipe for ${formatWeekdayDayMonth(selDate)}`}
        </span>
        <input
          className="input"
          style={{ minHeight: 44, flex: "none" }}
          placeholder="Search recipes"
          value={pq}
          onChange={(e) => setPq(e.target.value)}
        />
        <div className={styles.pickList}>
          {filteredPicks.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.pickRow} pressable`}
              disabled={isPending}
              onClick={() =>
                run(
                  async () => {
                    await pickRecipeForDayAction(weekStartDate, selIndex, r.id);
                    // "Log" means the day is both re-planned and recorded as eaten.
                    if (picker === "log") await confirmAte(weekStartDate, selIndex);
                  },
                  () => {
                    if (picker === "log") flash(`${r.name} logged`);
                    setPicker(null);
                  }
                )
              }
            >
              <span>{r.name}</span>
              <span className={styles.pickMeta}>{formatCookedAgo(r.daysSinceLastCooked, NEVER_COOKED_DAYS)}</span>
            </button>
          ))}
        </div>

        {picker === "log" && (
          <>
            <div className={styles.sheetAlts}>
              <button
                type="button"
                className="btn btn-secondary pressable"
                style={{ minHeight: 42 }}
                disabled={isPending}
                onClick={() =>
                  run(
                    () => quickAlt(weekStartDate, selIndex, "Leftovers"),
                    () => {
                      setPicker(null);
                      flash("Leftovers logged");
                    }
                  )
                }
              >
                Leftovers
              </button>
              <button
                type="button"
                className="btn btn-secondary pressable"
                style={{ minHeight: 42 }}
                disabled={isPending}
                onClick={() =>
                  run(
                    () => quickAlt(weekStartDate, selIndex, "Dining out"),
                    () => {
                      setPicker(null);
                      flash("Dining out logged");
                    }
                  )
                }
              >
                Dining out
              </button>
            </div>
            <Link
              href={`/log?date=${selDate}`}
              className={styles.ghostLink}
              onClick={() => setPicker(null)}
            >
              ＋ Something else — notes, tags, photo, link
            </Link>
          </>
        )}
      </Sheet>

    </div>
  );
}

function StatusBadge({ logged, kind }: { logged: boolean; kind: "meal" | "non" }) {
  if (logged) {
    return (
      <span className="badge" style={{ background: "var(--color-accent-2-100)", color: "var(--color-accent-2-800)" }}>
        Logged
      </span>
    );
  }
  if (kind === "meal") {
    return (
      <span className="badge" style={{ background: "var(--color-accent-100)", color: "var(--color-accent-800)" }}>
        Planned
      </span>
    );
  }
  return (
    <span className="badge" style={{ background: "var(--color-neutral-100)", color: "var(--color-neutral-800)" }}>
      Non-meal
    </span>
  );
}
