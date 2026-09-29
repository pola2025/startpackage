import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginBlocksClient from "./login-blocks-client";

export default async function LoginBlocksPage() {
  const session = await auth();
  const role = String((session?.user as { role?: string } | undefined)?.role ?? "");
  if (!session || !["super", "designer", "operator"].includes(role)) redirect("/admin/login");
  return <LoginBlocksClient />;
}
