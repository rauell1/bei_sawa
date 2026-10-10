import { BrandLogo } from "./brand-logo";
import { redirect } from "next/navigation";
import { authConfigured, getAuth, isLocalPreview } from "@/lib/auth/server";
import Desk from "./desk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review desk", alternates: { canonical: "/" } };
export default async function Home() {
  if (isLocalPreview()) return <Desk localPreview />;
  if (!authConfigured()) return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><h1>BeiSawa is being configured</h1><p>The review desk will be available once sign-in is connected.</p></section></main>;
  const { data: session, error } = await getAuth().getSession();
  if (error) return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><h1>Sign-in is temporarily unavailable</h1><p>Please try again shortly.</p></section></main>;
  if (!session?.user) redirect("/login");
  return <Desk />;
}
