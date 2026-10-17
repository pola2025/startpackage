import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MetaSetupClient from "./meta-setup-client";

export default async function MetaSetupPage() {
  const session = await auth();
  const role = String(
    (session?.user as { role?: string } | undefined)?.role ?? "",
  );
  if (!session || !["super", "designer", "operator"].includes(role))
    redirect("/admin/login");
  return <MetaSetupClient />;
}
