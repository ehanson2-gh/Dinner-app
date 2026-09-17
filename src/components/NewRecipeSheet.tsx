"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/ToastProvider";
import { ProteinPicker } from "@/components/ProteinPicker";
import { createRecipeAction } from "@/app/(app)/recipes/actions";
import styles from "./RecipeSheets.module.css";

const SUGGESTED_EXTRAS = ["One pot", "Weeknight", "Grill", "Freezer"];

export function NewRecipeSheet({
  open,
  onClose,
  initialName = "",
  existingCuisines,
  existingProteins = [],
}: {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  existingCuisines: string[];
  existingProteins?: string[];
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [protein, setProtein] = useState<string>("Chicken");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setProtein("Chicken");
      setTags([]);
      setTagInput("");
      setPhotoCount(0);
      setLinkCount(0);
      setError(null);
    }
  }, [open, initialName]);

  const suggestions = Array.from(new Set([...existingCuisines, ...SUGGESTED_EXTRAS])).filter(Boolean);

  function addTag(t: string) {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
  }

  function toggleSuggestion(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function save() {
    if (!name.trim()) {
      setError("Name it first");
      flash("Name it first");
      return;
    }
    startTransition(async () => {
      const result = await createRecipeAction({ name, protein, tags, photoCount, linkCount });
      if (!result.ok) {
        setError(result.reason);
        flash(result.reason);
        return;
      }
      onClose();
      flash(`${name.trim()} saved to recipes`);
      router.push("/recipes");
      router.refresh();
    });
  }

  const summary =
    photoCount + linkCount === 0
      ? "Add a cookbook photo or a link now, or later."
      : `${photoCount} photo(s) · ${linkCount} link(s) ready`;

  return (
    <Sheet open={open} onClose={onClose}>
      <span className={styles.kicker}>New recipe</span>
      <input
        className="input"
        style={{ minHeight: 46 }}
        placeholder="Recipe name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <span className={styles.kicker}>Protein</span>
      <ProteinPicker value={protein} onChange={setProtein} extras={existingProteins} />

      <span className={styles.kicker}>Tags</span>
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
              addTag(tagInput);
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
              addTag(tagInput);
              setTagInput("");
            }
          }}
        >
          ＋
        </button>
      </div>
      {tags.length > 0 && (
        <div className={styles.chipRow}>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className="tag tag-accent-2 pressable"
              style={{ cursor: "pointer", border: "none" }}
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
            >
              {t} ✕
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <span className={styles.subKicker}>Or reuse one:</span>
          <div className={styles.pillRow}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.pill} pressable ${tags.includes(s) ? styles.pillOn : ""}`}
                onClick={() => toggleSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={styles.attachRow}>
        <button
          type="button"
          className="btn btn-secondary pressable"
          style={{ flex: 1, minHeight: 42 }}
          onClick={() => {
            setPhotoCount((n) => n + 1);
            flash("Photo attached");
          }}
        >
          ＋ Photo
        </button>
        <button
          type="button"
          className="btn btn-secondary pressable"
          style={{ flex: 1, minHeight: 42 }}
          onClick={() => {
            setLinkCount((n) => n + 1);
            flash("Link attached");
          }}
        >
          ＋ Link
        </button>
      </div>
      <p className="sub">{summary}</p>
      {error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary btn-block pressable"
        style={{ minHeight: 48 }}
        disabled={isPending}
        onClick={save}
      >
        Save recipe
      </button>
    </Sheet>
  );
}
