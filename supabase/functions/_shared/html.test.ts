import { assertEquals } from "jsr:@std/assert@1";
import { escapeHtml } from "@shared/html.ts";

Deno.test("escapeHtml neutralises a tag injected through a name field", () => {
  assertEquals(escapeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
});

Deno.test("escapeHtml neutralises an anchor injected into an email body", () => {
  assertEquals(
    escapeHtml('<a href="https://phishing.example">Cliquez ici</a>'),
    "&lt;a href=&quot;https://phishing.example&quot;&gt;Cliquez ici&lt;/a&gt;",
  );
});

Deno.test(
  "escapeHtml escapes both quote characters, so an attribute cannot be broken out of",
  () => {
    assertEquals(escapeHtml(`" onmouseover='x`), "&quot; onmouseover=&#39;x");
  },
);

// Ampersand first, or every other replacement's own escape gets escaped a second time.
Deno.test("escapeHtml does not double-escape its own output", () => {
  assertEquals(escapeHtml("a & b"), "a &amp; b");
  assertEquals(escapeHtml(escapeHtml("<b>")), "&amp;lt;b&amp;gt;");
});

Deno.test("escapeHtml leaves ordinary names and accented characters untouched", () => {
  assertEquals(escapeHtml("Marie-Hélène d’Aubigné"), "Marie-Hélène d’Aubigné");
  assertEquals(escapeHtml(""), "");
});
