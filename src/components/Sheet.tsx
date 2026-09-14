"use client";

import { useEffect } from "react";
import styles from "./Sheet.module.css";

// Shared shell for all five bottom sheets (Confirm, Recipe picker, New
// recipe, Edit recipe, Add tag) — see README "Bottom sheets" section.
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        {children}
      </div>
    </div>
  );
}
