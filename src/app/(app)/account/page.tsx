import { requireSession } from "@/lib/session";
import { getTheHousehold, getMembers } from "@/lib/data";
import { AccountScreen } from "./AccountScreen";

export default async function AccountPage() {
  const session = await requireSession();
  const household = await getTheHousehold();
  const members = await getMembers(household.id);
  const me = members.find((m) => m.id === session.userId) ?? members[0];
  const partner = members.find((m) => m.id !== session.userId);

  return (
    <AccountScreen
      me={me}
      partnerName={partner?.name ?? "your partner"}
      members={members}
      household={household}
    />
  );
}
