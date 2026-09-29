/**
 * Escapes special Markdown characters in raw text for Telegram legacy Markdown format.
 * Reserved characters: _, *, `, [, \
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\\[])/g, "\\$1");
}
