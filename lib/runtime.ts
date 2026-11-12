/** 安全边界不能只依赖 NODE_ENV：生产若用自定义启动命令或平台未注入该变量，
 *  会静默降级到演示模式（硬编码密钥、内存存储、演示邀请码）。
 *  只要配置了数据库，就按"持久化运行"处理。 */
export function isProductionLike() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.DATABASE_URL);
}

/**
 * 取反向代理追加的客户端地址。X-Forwarded-For 最左值可由客户端伪造，
 * 最右值才是可信代理追加的真实地址；X-Real-IP 由代理覆盖时优先使用。
 * 部署层必须保证至少一个可信代理覆盖/追加这两个头。
 */
export function trustedClientIp(request: Request) {
  const headers = request.headers;
  const realIp = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  return realIp || forwarded.at(-1) || "unknown";
}
