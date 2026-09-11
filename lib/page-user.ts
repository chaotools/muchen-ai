import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySession } from "@/lib/auth";
import { findUser } from "@/lib/users";

export async function pageUser(admin = false) {
  const session = await verifySession((await cookies()).get(sessionCookieName)?.value);
  const user = session?.userId ? await findUser(session.userId) : null;
  if (!user || user.email !== session?.email) redirect("/login");
  if (admin && user.role !== "ADMIN") redirect("/");
  return user;
}
