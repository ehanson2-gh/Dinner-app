"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatWeekdayDayMonth } from "@/lib/date";
import { useToast } from "@/components/ToastProvider";
import { NewRecipeSheet } from "@/components/NewRecipeSheet";
import { commitLog } from "./actions";
import styles from "./LogForm.module.css";

const NON_MEALS = ["Leftovers", "Dining out", "Skipped"];

type RecipeOption = {
  name: string;
  protein: string | null;
  cuisine: string | null;
  timesCooked: number;
  daysSinceLastCooked: number;
};

export function LogForm({
  todayISO,
  fixedDate,
  initialQuery,
  initialMore,
  recipes,
  existingCuisines,
}: {
  todayISO: string;
  fixedDate?: string;
  initialQuery: string;
  initialMore: boolean;
  recipes: RecipeOption[];
  existingCuisines: string[];
}) {
  const router = useRouter();
  const { flash } = useToast();
  const [isPending, startTransition] = useTransition();

  const [logOffset, setLogOffset] = useState<0 | 1>(0);
  const [q, setQ] = useState(initialQuery);
  const [more, setMore] = useState(initialMore);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>(() => {
    const match = recipes.find((r) => r.name.toLowerCase() === initialQuery.toLowerCase());
    return match ? [match.protein, match.cuisine].filter((t): t is string => Boolean(t)) : [];
  });
  const [tagDraft, setTagDraft] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);

  const targetDate = fixedDate ?? (logOffset === 0 ? todayISO : addDays(todayISO, -1));
  const dateLabel =
    fixedDate !== undefined
      ? targetDate === todayISO
        ? `Tonight, ${formatWeekdayDayMonth(targetDate)}`
        : `Logging for ${formatWeekdayDayMonth(targetDate)}`
      : logOffset === 0
        ? `Tonight, ${formatWeekdayDayMonth(todayISO)}`
        : formatWeekdayDayMonth(addDays(todayISO, -1));

  const qLower = q.trim().toLowerCase();
  const exactMatch = recipes.find((r) => r.name.toLowerCase() === qLower);
  const matches = useMemo(() => {
    if (!q.trim()) return [];
    return recipes
      .filter((r) => r.name.toLowerCase().includes(qLower) && r.name.toLowerCase() !== qLower)
      .slice(0, 4);
  }, [recipes, q, qLower]);

  const cookedOften = useMemo(
    () =>
      recipes
        .filter((r) => r.timesCooked > 0)
        .sort((a, b) => b.timesCooked - a.timesCooked)
        .slice(0, 5),
    [recipes]
  );

  const isMealEntry = !NON_MEALS.includes(q);
  const showDetails = q.trim().length > 0;

  function pickName(name: string) {
    setQ(name);
    const match = recipes.find((r) => r.name.toLowerCase() === name.toLowerCase());
    setTags(match ? [match.protein, match.cuisine].filter((t): t is string => Boolean(t)) : []);
  }

  function submit() {
    if (!q.trim()) {
      flash("Pick a meal first");
      return;
    }
    startTransition(async () => {
      const result = await commitLog({
        date: targetDate,
        name: q,
        note,
        tags: isMealEntry ? tags : [],
        photoCount,
        linkCount,
      });
      if (!result.ok) {
        flash(result.reason);
        return;
      }
      flash("Logged");
      router.push("/week");
      router.refresh();
    });
  }

  const attachSummary =
    photoCount + linkCount === 0 ? "Nothing attached yet" : `${photoCount} photo(s) · ${linkCount} link(s) attached`;

  return (
    <div className={styles.wrap}>
      <div>
        <p className={styles.sub}>
          {dateLabel}
          {fixedDate === undefined && (
            <>
              {" · "}
              <button type="button" onClick={() => setLogOffset((o) => (o === 0 ? 1 : 0))}>
                yesterday instead
              </button>
            </>
          )}
        </p>

        <input
          className="input"
          style={{ minHeight: 48, fontSize: 16 }}
          placeholder="What did you eat?"
          value={q}
          onChange={(e) => pickName(e.target.value)}
        />

        {matches.length > 0 && !exactMatch && (
          <div className={styles.matches}>
            {matches.map((m) => (
              <button key={m.name} type="button" className={styles.matchRow} onClick={() => pickName(m.name)}>
                {m.name} <span className="sub">· {m.daysSinceLastCooked}d ago</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.kicker}>Cooked often</div>
        <div className={styles.chipRow}>
          {cookedOften.map((r) => (
            <button
              key={r.name}
              type="button"
              className={`${styles.chip} pressable ${q === r.name ? styles.chipOn : ""}`}
              onClick={() => pickName(r.name)}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div className={styles.kicker}>Not a meal</div>
        <div className={styles.nonMealRow}>
          {NON_MEALS.map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.chip} pressable ${q === n ? styles.chipOn : ""}`}
              onClick={() => pickName(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {showDetails && (
          <div className={styles.extras}>
            <button type="button" className={styles.moreToggle} onClick={() => setMore((m) => !m)}>
              {more ? "− Hide extras" : "＋ Notes, tags, photo, link"}
            </button>
            {more && (
              <div className={styles.moreBody}>
                <textarea
                  className="input"
                  placeholder="Notes"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {isMealEntry && (
                  <div className={styles.tagEditRow}>
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
                    <input
                      className={`tag tag-outline ${styles.tagInput}`}
                      placeholder="＋ tag"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagDraft.trim()) {
                          e.preventDefault();
                          setTags((prev) => (prev.includes(tagDraft.trim()) ? prev : [...prev, tagDraft.trim()]));
                          setTagDraft("");
                        }
                      }}
                    />
                  </div>
                )}
                <div className={styles.attachRow}>
                  <button
                    type="button"
                    className="btn btn-secondary pressable"
                    style={{ minHeight: 42 }}
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
                    style={{ minHeight: 42 }}
                    onClick={() => {
                      setLinkCount((n) => n + 1);
                      flash("Link attached");
                    }}
                  >
                    ＋ Link
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary pressable"
                    style={{ minHeight: 42 }}
                    onClick={() => setNewRecipeOpen(true)}
                  >
                    ＋ Recipe
                  </button>
                </div>
                <p className="sub">{attachSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.submitWrap}>
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg pressable"
          disabled={isPending}
          onClick={submit}
        >
          {q ? `Log ${q}` : "Log dinner"}
        </button>
      </div>

      <NewRecipeSheet
        open={newRecipeOpen}
        onClose={() => setNewRecipeOpen(false)}
        initialName={q}
        existingCuisines={existingCuisines}
      />
    </div>
  );
}
