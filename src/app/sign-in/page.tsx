import { getTheHousehold, getMembers } from "@/lib/data";
import { SignInForm } from "./SignInForm";
import styles from "./page.module.css";

export default async function SignInPage() {
  const household = await getTheHousehold();
  const members = await getMembers(household.id);

  return (
    <div className={styles.wrap}>
      <div className={styles.mark}>D</div>
      <h1 className={styles.title}>Dinner Tracker</h1>
      <p className={styles.sub}>{household.name}</p>

      <SignInForm members={members} />

      <p className={styles.footer}>
        One shared history, two logins.
        <br />
        Every entry is stamped with who added it.
      </p>
    </div>
  );
}
