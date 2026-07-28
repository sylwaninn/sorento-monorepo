/**
 * Email bodies are assembled by string interpolation, and several of the values interpolated are
 * typed by one person and read by another: the deceased's first and last name, an inviter's name,
 * the free-text reason attached to an activation opposition. Unescaped, a name is enough to inject
 * a link into an email the recipient has every reason to trust: the trusted contact's designation
 * message and the support notification are both sent on someone else's say-so.
 *
 * Escapes the five characters that matter in both element content and quoted attribute values, so
 * one helper covers every interpolation site.
 */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
