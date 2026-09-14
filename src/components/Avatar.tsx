import styles from "./Avatar.module.css";
import type { AvatarColor } from "@/lib/types";

export function Avatar({
  name,
  color,
  size = 40,
  fontSize,
  dim = false,
}: {
  name: string;
  color: AvatarColor;
  size?: number;
  fontSize?: number;
  dim?: boolean;
}) {
  const fs = fontSize ?? Math.round(size * 0.4);
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: fs,
        background: color === "accent" ? "var(--color-accent)" : "var(--color-accent-2)",
        opacity: dim ? 0.5 : 1,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function EmptyAvatar({ size = 26 }: { size?: number }) {
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: "var(--color-neutral-200)",
        color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
      }}
    >
      –
    </div>
  );
}
