const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function safeImageUrl(value: string | null | undefined): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function spriteImg(
  source: string | null | undefined,
  alt: string,
  className: string,
): string {
  const url = safeImageUrl(source);
  if (!url) {
    return `<div class="${className} sprite-fallback" aria-hidden="true">&#9679;</div>`;
  }

  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" referrerpolicy="no-referrer">`;
}

export function typeChips(types: readonly string[]): string {
  return types
    .map(
      (type) =>
        `<span class="type" data-type="${escapeHtml(type.toLowerCase())}">${escapeHtml(type)}</span>`,
    )
    .join("");
}

export function stripBattleMarkdown(message: string): string {
  return message.replace(/\*/g, "");
}

export function initialOf(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}
