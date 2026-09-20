const DEFAULT_REDIRECT = "/projects";

/** Accept only same-site paths; reject protocol-relative and backslash variants. */
export function safeLocalRedirect(value: unknown, fallback = DEFAULT_REDIRECT): string {
  const hasControlCharacter =
    typeof value === "string" &&
    Array.from(value).some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    });

  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    hasControlCharacter
  ) {
    return fallback;
  }
  return value;
}
