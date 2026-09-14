"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/ToastProvider";
import type { Recipe } from "@/lib/types";
import { addTagsAction } from "../actions";
import styles from "@/components/RecipeSheets.module.css";

const SUGGESTED_EXTRAS = ["One pot", "Weeknight", "Grill", "Freezer"];

export function AddTagSheet({
  open,
  onClose,
  recipe,
  existingCuisines,
}: {
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
  existingCuisines: string[];
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();
  const [staged, setStaged] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      setStaged([]);
      setTagInput("");
    }
  }, [open]);

  const suggestions = Array.from(new Set([...existingCuisines, ...SUGGESTED_EXTRAS])).filter(
    (t) => !recipe.tags.includes(t)
  );

  function toggleSuggestion(t: string) {
    setStaged((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function commit() {
    const extra = [...staged, ...(tagInput.trim() ? [tagInput.trim()] : [])];
    if (extra.length === 0) {
      flash("Type a tag first");
      return;
    }
    startTransition(async () => {
      await addTagsAction(recipe.id, extra);
      onClose();
      flash("Tag added");
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <span className={styles.kicker}>Tag {recipe.name}</span>
      <div className={styles.tagInputRow}>
        <input
          className="input"
          style={{ minHeight: 44 }}
          placeholder="New tag — type and press enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagInput.trim()) {
              e.preventDefault();
              setStaged((prev) => (prev.includes(tagInput.trim()) ? prev : [...prev, tagInput.trim()]));
              setTagInput("");
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary pressable"
          style={{ minHeight: 44, width: 50, padding: 0, flex: "none" }}
          onClick={() => {
            if (tagInput.trim()) {
              setStaged((prev) => (prev.includes(tagInput.trim()) ? prev : [...prev, tagInput.trim()]));
              setTagInput("");
            }
          }}
        >
          ＋
        </button>
      </div>
      {staged.length > 0 && (
        <div className={styles.chipRow}>
          {staged.map((t) => (
            <button
              key={t}
              type="button"
              className="tag tag-accent-2 pressable"
              style={{ cursor: "pointer", border: "none" }}
              onClick={() => setStaged((prev) => prev.filter((x) => x !== t))}
            >
              {t} ✕
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className={styles.pillRow}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.pill} pressable ${staged.includes(s) ? styles.pillOn : ""}`}
              onClick={() => toggleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary btn-block pressable"
        disabled={isPending}
        onClick={commit}
      >
        Add to recipe
      </button>
    </Sheet>
  );
}
