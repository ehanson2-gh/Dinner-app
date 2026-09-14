import { requireSession } from "@/lib/session";
import { TabBar } from "@/components/TabBar";
import { ToastProvider } from "@/components/ToastProvider";
import styles from "./layout.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <ToastProvider>
      <div className={styles.body}>{children}</div>
      <TabBar />
    </ToastProvider>
  );
}
