"use client";

import { useState } from "react";
import { PROTEIN_OPTIONS } from "@/lib/types";
import styles from "./RecipeSheets.module.css";

// Protein is a free-text column, not an enum — PROTEIN_OPTIONS is only the
// starter set, so the row ends in a ＋ that opens a box for a new one.
//
// `extras` carries proteins already in use (the recipe's own, or the
// household's) so they stay selectable rather than silently dropping off.
export function ProteinPicker({
  value,
  onChange,
  extras = [],
}: {
  value: string;
  onChange: (protein: string) => void;
  extras?: string[];
}) {
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const options = Array.from(
    new Set([...PROTEIN_OPTIONS, ...extras, ...added, value].filter(Boolean))
  );

  function commit() {
    const t = draft.trim();
    if (t) {
      setAdded((prev) => (prev.includes(t) ? prev : [...prev, t]));
      onChange(t);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <>
      <div className={styles.pillRow}>
        {options.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.pill} pressable ${value === p ? styles.pillOn : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.pill} pressable`}
          aria-label="Add a protein"
          onClick={() => setAdding((on) => !on)}
        >
          ＋
        </button>
      </div>

      {adding && (
        <div className={styles.tagInputRow}>
          <input
            className="input"
            style={{ minHeight: 44 }}
            placeholder="New protein — type and press enter"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary pressable"
            style={{ minHeight: 44, width: 50, padding: 0, flex: "none" }}
            onClick={commit}
          >
            ＋
          </button>
        </div>
      )}
    </>
  );
}
