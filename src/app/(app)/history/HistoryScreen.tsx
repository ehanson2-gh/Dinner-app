"use client";

import { useState, useTransition } from "react";
import { Avatar, EmptyAvatar } from "@/components/Avatar";
import {
  monthLong,
  firstWeekdayOfMonthMon0,
  daysInMonth,
  toISO,
  formatDayMonthYear,
} from "@/lib/date";
import type { AvatarColor, LogEntry } from "@/lib/types";
import { fetchMonthLogs } from "./actions";
import styles from "./HistoryScreen.module.css";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type MemberInfo = { id: string; name: string; avatarColor: AvatarColor };

export function HistoryScreen({
  initialYear,
  initialMonth0,
  initialDay,
  initialLogs,
  members,
  footerCount,
  footerEarliestDate,
}: {
  initialYear: number;
  initialMonth0: number;
  initialDay: number;
  initialLogs: Record<string, LogEntry>;
  members: MemberInfo[];
  footerCount: number;
  footerEarliestDate: string | null;
}) {
  const [year, setYear] = useState(initialYear);
  const [month0, setMonth0] = useState(initialMonth0);
  const [day, setDay] = useState(initialDay);
  const [logs, setLogs] = useState(initialLogs);
  const [isPending, startTransition] = useTransition();

  function goTo(y: number, m0: number, d: number) {
    setYear(y);
    setMonth0(m0);
    setDay(d);
    startTransition(async () => {
      const fresh = await fetchMonthLogs(y, m0);
      setLogs(fresh);
    });
  }

  function prevMonth() {
    if (month0 === 0) goTo(year - 1, 11, day);
    else goTo(year, month0 - 1, day);
  }
  function nextMonth() {
    if (month0 === 11) goTo(year + 1, 0, day);
    else goTo(year, month0 + 1, day);
  }

  const offset = firstWeekdayOfMonthMon0(year, month0);
  const dim = daysInMonth(year, month0);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const selectedISO = toISO(year, month0 + 1, day);
  const selectedEntry = logs[selectedISO];

  return (
    <div>
      <h1 className={styles.h1}>History</h1>

      <div className={styles.stepperRow}>
        <button type="button" className={`${styles.iconBtn} pressable`} onClick={prevMonth}>
          ‹
        </button>
        <span className={styles.monthLabel}>
          {monthLong(month0)} {year}
        </span>
        <button type="button" className={`${styles.iconBtn} pressable`} onClick={nextMonth}>
          ›
        </button>
      </div>

      <div className={styles.yearRow}>
        <button type="button" className={`${styles.yearBtn} pressable`} onClick={() => goTo(year - 1, month0, day)}>
          ‹ {year - 1}
        </button>
        <button
          type="button"
          className={`${styles.yearBtn} pressable`}
          onClick={() => {
            const now = new Date();
            goTo(now.getFullYear(), now.getMonth(), now.getDate());
          }}
        >
          Today
        </button>
        <button type="button" className={`${styles.yearBtn} pressable`} onClick={() => goTo(year + 1, month0, day)}>
          {year + 1} ›
        </button>
      </div>

      <div className={styles.weekdayHeader}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>

      <div className={styles.grid} style={{ opacity: isPending ? 0.6 : 1 }}>
        {Array.from({ length: offset }, (_, i) => (
          <div key={`b${i}`} className={styles.cellBlank} />
        ))}
        {Array.from({ length: dim }, (_, i) => i + 1).map((d) => {
          const iso = toISO(year, month0 + 1, d);
          const entry = logs[iso];
          const on = d === day;
          const logger = entry ? memberById.get(entry.loggedBy) : undefined;
          let dotColor = "transparent";
          if (entry) {
            dotColor = on ? "var(--color-bg)" : logger?.avatarColor === "accent-2" ? "var(--color-accent-2)" : "var(--color-accent)";
          }
          return (
            <button
              key={d}
              type="button"
              className={`${styles.cell} pressable ${on ? styles.cellOn : ""}`}
              onClick={() => setDay(d)}
            >
              <span>{d}</span>
              <span className={styles.dot} style={{ background: dotColor }} />
            </button>
          );
        })}
      </div>

      <div className={styles.pane}>
        <span className={styles.paneKicker}>{formatDayMonthYear(selectedISO)}</span>
        {selectedEntry ? (
          <div className={styles.paneRow}>
            <Avatar
              name={memberById.get(selectedEntry.loggedBy)?.name ?? selectedEntry.loggedByName}
              color={memberById.get(selectedEntry.loggedBy)?.avatarColor ?? "accent"}
              size={26}
              fontSize={11}
            />
            <span className={styles.paneName}>{selectedEntry.freeTextName}</span>
          </div>
        ) : (
          <div className={styles.paneRow}>
            <EmptyAvatar size={26} />
            <span className={styles.paneName}>No dinner logged</span>
          </div>
        )}
        <p className={styles.paneNote}>
          {selectedEntry
            ? selectedEntry.note || `Logged by ${selectedEntry.loggedByName}`
            : "Tap another day, or step back a month."}
        </p>
      </div>

      <p className={styles.footer}>
        {footerCount === 0
          ? "No dinners logged yet."
          : `${footerCount} dinner${footerCount === 1 ? "" : "s"} logged${
              footerEarliestDate ? ` since ${formatDayMonthYear(footerEarliestDate)}` : ""
            }`}
      </p>
    </div>
  );
}
