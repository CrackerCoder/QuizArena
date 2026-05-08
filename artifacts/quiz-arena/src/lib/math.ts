import katex from "katex";

/**
 * Escapes characters that are special in HTML.
 * Applied to every non-math text segment so that AI-generated content
 * cannot inject markup even when passed to dangerouslySetInnerHTML.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders text containing $...$ inline math and $$...$$ block math.
 * All non-math text is HTML-escaped before being returned, so the
 * result is safe to pass to dangerouslySetInnerHTML.
 */
export function renderMath(text: string): string {
  if (!text) return "";

  const parts: string[] = [];
  // Matches $$...$$  (block) or $...$  (inline), in that priority order.
  const mathRe = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRe.exec(text)) !== null) {
    // Escape plain text before this math segment.
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    const full = match[0];
    const isBlock = full.startsWith("$$");
    const expr = isBlock ? full.slice(2, -2) : full.slice(1, -1);

    try {
      parts.push(
        katex.renderToString(expr.trim(), {
          displayMode: isBlock,
          throwOnError: false,
        }),
      );
    } catch {
      // Escape the raw delimiter+expression on KaTeX failure.
      parts.push(escapeHtml(full));
    }

    lastIndex = match.index + full.length;
  }

  // Escape any remaining plain text after the last math segment.
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join("");
}
