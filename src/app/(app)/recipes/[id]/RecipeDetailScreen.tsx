"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { formatWeekdayDayMonth } from "@/lib/date";
import type { Recipe } from "@/lib/types";
import { addPhotoPlaceholderAction, addSourceLinkAction, addRecipeToWeekAction } from "../actions";
import { EditRecipeSheet } from "./EditRecipeSheet";
import { AddTagSheet } from "./AddTagSheet";
import styles from "./RecipeDetailScreen.module.css";

export function RecipeDetailScreen({
  recipe,
  existingCuisines,
}: {
  recipe: Recipe;
  existingCuisines: string[];
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const otherTags = (recipe.tags.length > 0 ? recipe.tags : recipe.cuisine ? [recipe.cuisine] : []).filter(
    (t) => t !== recipe.protein
  );

  const historyParts = [
    `Cooked ${recipe.timesCooked} ${recipe.timesCooked === 1 ? "time" : "times"}`,
    recipe.timesCooked === 0 ? "not cooked yet" : `last ${recipe.daysSinceLastCooked} days ago`,
  ];
  if (recipe.origin) historyParts.push(recipe.origin);
  const history = historyParts.join(" · ");

  function addPhoto() {
    startTransition(async () => {
      await addPhotoPlaceholderAction(recipe.id, "dish photo");
      flash("Photo attached");
      router.refresh();
    });
  }

  function submitLink() {
    if (!linkUrl.trim()) {
      flash("Enter a URL first");
      return;
    }
    startTransition(async () => {
      await addSourceLinkAction(recipe.id, {
        title: linkTitle.trim() || linkUrl.trim(),
        url: linkUrl.trim(),
      });
      setAddingLink(false);
      setLinkTitle("");
      setLinkUrl("");
      flash("Link added");
      router.refresh();
    });
  }

  function addToWeek() {
    startTransition(async () => {
      const result = await addRecipeToWeekAction(recipe.id);
      flash(`Added to ${formatWeekdayDayMonth(result.weekdayLabel)}`);
      router.push("/week");
      router.refresh();
    });
  }

  return (
    <div>
      <div className={styles.topRow}>
        <button type="button" className={styles.back} onClick={() => router.push("/recipes")}>
          ← Recipes
        </button>
        <button type="button" className={styles.edit} onClick={() => setEditOpen(true)}>
          Edit
        </button>
      </div>

      <h1 className={styles.h1}>{recipe.name}</h1>
      <div className={styles.tagRow}>
        {recipe.protein && <span className="tag tag-accent-2">{recipe.protein}</span>}
        {otherTags.map((t) => (
          <span key={t} className="tag tag-neutral">
            {t}
          </span>
        ))}
        <button type="button" className={`tag tag-outline ${styles.addTagChip}`} onClick={() => setAddTagOpen(true)}>
          ＋ Tag
        </button>
      </div>

      <div className={styles.photoRail}>
        {recipe.photos.map((p) => (
          <div key={p.id} className={`${styles.photo} washed`}>
            <span className={styles.photoCaption}>{p.caption}</span>
          </div>
        ))}
        <button type="button" className={styles.addPhoto} disabled={isPending} onClick={addPhoto}>
          ＋ Photo
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.kicker}>Sources</div>
        {recipe.links.map((link) => (
          <a
            key={link.id}
            className={styles.sourceRow}
            href={link.url || undefined}
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.favicon} />
            <span className={styles.sourceMid}>
              <div className={styles.sourceTitle}>{link.title}</div>
              <div className={styles.sourceDetail}>{link.url}</div>
            </span>
          </a>
        ))}
        {addingLink ? (
          <div className={styles.addLinkForm}>
            <input
              className="input"
              style={{ minHeight: 44 }}
              placeholder="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
            />
            <input
              className="input"
              style={{ minHeight: 44 }}
              placeholder="Title (optional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-block pressable"
              disabled={isPending}
              onClick={submitLink}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-block pressable"
            style={{ minHeight: 44 }}
            onClick={() => setAddingLink(true)}
          >
            ＋ Add source link
          </button>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.kicker}>History</div>
        <p className={styles.history}>{history}</p>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block pressable"
        style={{ minHeight: 48 }}
        disabled={isPending}
        onClick={addToWeek}
      >
        Add to this week
      </button>

      <EditRecipeSheet open={editOpen} onClose={() => setEditOpen(false)} recipe={recipe} />
      <AddTagSheet
        open={addTagOpen}
        onClose={() => setAddTagOpen(false)}
        recipe={recipe}
        existingCuisines={existingCuisines}
      />
    </div>
  );
}
