import { getSessionFromRequest } from "@/lib/auth";
import { findUser, type User } from "@/lib/users";

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function requireUser(request: Request, admin = false): Promise<User> {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) throw new AppError("请先登录沐尘", 401);
  const user = await findUser(session.userId);
  if (!user || user.email !== session.email) throw new AppError("登录已失效，请重新登录", 401);
  if (admin && user.role !== "ADMIN") throw new AppError("当前账号没有管理权限", 403);
  return user;
}

export function apiError(error: unknown) {
  return Response.json({ error: error instanceof AppError ? error.message : "服务暂时不可用，请稍后重试" }, { status: error instanceof AppError ? error.status : 503 });
}
