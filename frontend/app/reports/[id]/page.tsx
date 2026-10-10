import { redirect, notFound } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import ReportReader from "./report-reader";
export const dynamic = "force-dynamic";
export const metadata = { title: "Filed report", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) notFound();
  if (!authConfigured()) redirect("/login");
  const session = await getAuth().getSession().catch(() => null);
  if (!session || session.error || !session.data?.user) redirect("/login");
  return <ReportReader id={id} />;
}
