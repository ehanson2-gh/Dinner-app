import { redirect } from "next/navigation";

// If we got here, proxy.ts already confirmed the visitor is signed in
// (unauthenticated requests are redirected to /sign-in before this renders).
export default function RootPage() {
  redirect("/week");
}
