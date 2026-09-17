"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/ToastProvider";
import { ProteinPicker } from "@/components/ProteinPicker";
import { type Recipe } from "@/lib/types";
import { updateRecipeAction, removeTagAction, deleteRecipeAction } from "../actions";
import styles from "@/components/RecipeSheets.module.css";

export function EditRecipeSheet({
  open,
  onClose,
  recipe,
}: {
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(recipe.name);
  const [protein, setProtein] = useState(recipe.protein ?? "Chicken");
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(recipe.name);
      setProtein(recipe.protein ?? "Chicken");
      setTagInput("");
      setConfirmDelete(false);
    }
  }, [open, recipe]);

  const displayTags = recipe.tags.length > 0 ? recipe.tags : recipe.cuisine ? [recipe.cuisine] : [];

  function removeTag(tag: string) {
    startTransition(async () => {
      await removeTagAction(recipe.id, tag);
      router.refresh();
    });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) {
      flash("Type a tag first");
      return;
    }
    startTransition(async () => {
      await updateRecipeAction(recipe.id, { tags: [...recipe.tags, t] });
      setTagInput("");
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updateRecipeAction(recipe.id, { name, protein });
      if (!result.ok) {
        flash(result.reason);
        return;
      }
      onClose();
      flash("Recipe updated");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const recipeName = recipe.name;
      await deleteRecipeAction(recipe.id);
      onClose();
      flash(`${recipeName} deleted`);
      router.push("/recipes");
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <span className={styles.kicker}>Edit recipe</span>
      <input className="input" style={{ minHeight: 46 }} value={name} onChange={(e) => setName(e.target.value)} />

      <span className={styles.kicker}>Protein</span>
      <ProteinPicker value={protein} onChange={setProtein} />

      <span className={styles.kicker}>Tags — tap to remove</span>
      <div className={styles.chipRow}>
        {displayTags.map((t) => (
          <button
            key={t}
            type="button"
            className="tag tag-neutral pressable"
            style={{ cursor: "pointer", border: "none" }}
            disabled={isPending}
            onClick={() => removeTag(t)}
          >
            {t} ✕
          </button>
        ))}
      </div>
      <div className={styles.tagInputRow}>
        <input
          className="input"
          style={{ minHeight: 44 }}
          placeholder="New tag — type and press enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary pressable"
          style={{ minHeight: 44, width: 50, padding: 0, flex: "none" }}
          onClick={addTag}
        >
          ＋
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block pressable"
        style={{ minHeight: 48 }}
        disabled={isPending}
        onClick={save}
      >
        Save changes
      </button>
      <button
        type="button"
        className="btn btn-ghost pressable"
        style={{ minHeight: 44, color: "var(--color-accent-700)", justifyContent: "center" }}
        disabled={isPending}
        onClick={handleDelete}
      >
        {confirmDelete ? "Tap again to delete permanently" : "Delete recipe"}
      </button>
    </Sheet>
  );
}
