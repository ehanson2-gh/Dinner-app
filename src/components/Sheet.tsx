"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./Sheet.module.css";

const noopSubscribe = () => () => {};

// How far the handle must be dragged down before releasing dismisses the sheet.
const DISMISS_PX = 80;

// How much of the frame's bottom edge is currently hidden behind the on-screen
// keyboard (or any other browser UI that overlays the layout viewport).
//
// iOS Safari/Chrome do not shrink the layout viewport — and so do not shrink
// 100dvh, which .frame is sized by — when the keyboard opens; they only shrink
// visualViewport. Without this the sheet stays anchored to a frame bottom that
// now sits under the keyboard, putting its primary button (Save) out of reach.
function bottomInset() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
}

// Shared shell for all bottom sheets (Recipe picker, New recipe, Edit recipe,
// Add tag) — see README "Bottom sheets" section.
//
// Portaled into #app-frame (rather than rendered inline) so the sheet isn't
// nested inside the page's scrollable body — otherwise its scrim/panel get
// clipped by that container's overflow, letting the tab bar show through
// on top of the sheet's bottom edge.
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startY: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Keep --sheet-bottom-inset in sync with the keyboard while a sheet is open.
  // The scrim reserves it as padding, so the panel — and the save button at the
  // end of it — stay inside the visible part of the viewport.
  useEffect(() => {
    if (!open) return;
    const frame = document.getElementById("app-frame");
    if (!frame) return;

    const sync = () => frame.style.setProperty("--sheet-bottom-inset", `${bottomInset()}px`);
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      frame.style.removeProperty("--sheet-bottom-inset");
    };
  }, [open]);

  // The grab handle drags the panel down to dismiss. A plain tap on it also
  // dismisses, via the click event the browser fires afterwards either way.
  function onHandleDown(e: React.PointerEvent<HTMLButtonElement>) {
    drag.current = { id: e.pointerId, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandleMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== e.pointerId) return;
    const panel = panelRef.current;
    if (!panel) return;
    // Down only — dragging up shouldn't stretch the panel off its anchor.
    panel.style.transition = "none";
    panel.style.transform = `translateY(${Math.max(0, e.clientY - drag.current.startY)}px)`;
  }

  function onHandleUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== e.pointerId) return;
    const dy = e.clientY - drag.current.startY;
    drag.current = null;

    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
    }
    if (dy > DISMISS_PX) onClose();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div ref={panelRef} className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.handle}
          aria-label="Dismiss"
          onClick={onClose}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className={styles.handleBar} />
        </button>
        {children}
      </div>
    </div>,
    document.getElementById("app-frame") ?? document.body
  );
}
