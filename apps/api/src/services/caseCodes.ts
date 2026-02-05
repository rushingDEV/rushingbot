export function generateCaseCode(prefix = "CASE"): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const time = Date.now().toString(36).slice(-2).toUpperCase();
  return `${prefix}-${rand}${time}`;
}
