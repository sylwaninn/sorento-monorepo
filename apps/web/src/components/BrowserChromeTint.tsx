/**
 * Two strips whose only job is to be sampled by the browser.
 *
 * Safari 26 tints its own toolbars by scanning `position: fixed` and `position: sticky` elements
 * near the top and bottom edges of the viewport and reading `background-color` and
 * `backdrop-filter` off them. When it finds nothing solid there it composites live page pixels
 * behind the chrome instead, which is how the document ends up appearing to scroll inside the
 * address bar and the toolbar. `theme-color` no longer takes part in that decision, so the tint
 * can only be stated as an element.
 *
 * Nothing here is meant to be seen. Both strips sit at `-z-10`, below the body's own opaque
 * background in the painting order, and Safari reads the declared colour rather than the painted
 * result: an element it never draws still answers the question. `aria-hidden` keeps them out of
 * the accessibility tree, and no other engine gives a fixed element this meaning, so elsewhere
 * they are two empty divs that cost nothing.
 */
export const BrowserChromeTint = () => (
  <>
    <div
      aria-hidden="true"
      className="bg-background pointer-events-none fixed inset-x-0 top-0 -z-10 h-3"
    />
    <div
      aria-hidden="true"
      className="bg-background pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-3"
    />
  </>
);
