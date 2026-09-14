"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NewRecipeSheet } from "@/components/NewRecipeSheet";
import { RECIPE_FILTER_PILLS, type Recipe } from "@/lib/types";
import styles from "./RecipesScreen.module.css";

export function RecipesScreen({
  recipes,
  existingCuisines,
}: {
  recipes: Recipe[];
  existingCuisines: string[];
}) {
  const [rq, setRq] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);

  const cards = useMemo(() => {
    const q = rq.toLowerCase();
    return recipes.filter(
      (r) => r.name.toLowerCase().includes(q) && (filter === "All" || r.protein === filter || r.cuisine === filter)
    );
  }, [recipes, rq, filter]);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.h1}>Recipes</h1>
        <button
          type="button"
          className="btn btn-primary pressable"
          style={{ minHeight: 40 }}
          onClick={() => setNewRecipeOpen(true)}
        >
          ＋ Add
        </button>
      </div>

      <input
        className="input"
        style={{ minHeight: 44 }}
        placeholder="Search recipes"
        value={rq}
        onChange={(e) => setRq(e.target.value)}
      />

      <div className={styles.filterRow}>
        {RECIPE_FILTER_PILLS.map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.pill} pressable ${filter === f ? styles.pillOn : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          Nothing matches.{" "}
          <button
            type="button"
            onClick={() => {
              setFilter("All");
              setRq("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {cards.map((r) => {
            const hasPhotos = r.photos.length > 0;
            const tagList = (r.tags.length > 0 ? r.tags : r.cuisine ? [r.cuisine] : []).filter(
              (t) => t !== r.protein
            );
            const meta =
              r.timesCooked === 0
                ? "Not cooked yet"
                : `Cooked ${r.timesCooked}× · last ${r.daysSinceLastCooked}d ago`;
            const linkWord = r.links.length === 1 ? "link" : "links";
            const photoWord = r.photos.length === 1 ? "photo" : "photos";

            return (
              <Link key={r.id} href={`/recipes/${r.id}`} className={`${styles.card} pressable`}>
                <div className={`${styles.thumb} ${hasPhotos ? styles.thumbPhoto : styles.thumbNoPhoto}`}>
                  {hasPhotos ? "photo" : "no photo"}
                </div>
                <div className={styles.mid}>
                  <div className={styles.name}>{r.name}</div>
                  <div className={styles.meta}>{meta}</div>
                  <div className={styles.tagRow}>
                    {r.protein && <span className="tag tag-accent-2">{r.protein}</span>}
                    {tagList.map((t) => (
                      <span key={t} className="tag tag-neutral">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.right}>
                  {r.links.length} {linkWord}
                  {" · "}
                  {r.photos.length} {photoWord}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <NewRecipeSheet
        open={newRecipeOpen}
        onClose={() => setNewRecipeOpen(false)}
        existingCuisines={existingCuisines}
      />
    </div>
  );
}
