export const SESSION_COOKIE = "rb_admin_session";

export function isAuthConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export function getExpectedSessionToken() {
  if (process.env.ADMIN_SESSION_TOKEN) {
    return process.env.ADMIN_SESSION_TOKEN;
  }

  const user = process.env.ADMIN_USERNAME || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  return `${user}:${pass}`;
}
