import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/server/session";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/redeem");
  return user;
}
