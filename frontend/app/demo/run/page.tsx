import { redirect } from "next/navigation";
import { authConfigured, getAuth, isLocalPreview } from "@/lib/auth/server";
import LiveRun from "./run";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live cited review", robots: { index: false, follow: false } };
export default async function Page() {
  const local = isLocalPreview();
  if (!local) {
    if (!authConfigured()) redirect("/login");
    const session = await getAuth().getSession().catch(() => null);
    if (!session?.data?.user || session.error) redirect("/login");
  }
  return <LiveRun local={local} />;
}
