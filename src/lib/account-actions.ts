/** Run completion UI only after the database confirms the write. */
export async function confirmAccountWrite(
  write: () => PromiseLike<{ error: { message: string } | null }>,
  complete: () => void,
): Promise<void> {
  const { error } = await write();
  if (error) throw new Error(error.message);
  complete();
}

/** A backslash, a space or any control character can make browsers parse the path differently. */
function hasUnsafeCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x5c || code <= 0x20) return true;
  }
  return false;
}

/** Auth destinations must stay on this origin, including URL normalization. */
export function safeAuthNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || hasUnsafeCharacter(value))
    return "/partners";
  const base = "https://nisab.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/partners";
  } catch {
    return "/partners";
  }
}
