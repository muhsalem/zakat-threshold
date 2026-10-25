/** Run completion UI only after the database confirms the write. */
export async function confirmAccountWrite(
  write: () => PromiseLike<{ error: { message: string } | null }>,
  complete: () => void,
): Promise<void> {
  const { error } = await write();
  if (error) throw new Error(error.message);
  complete();
}

/** Auth destinations must stay on this origin, including URL normalization. */
export function safeAuthNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/partners";
  const base = "https://nisab.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/partners";
  } catch {
    return "/partners";
  }
}