/**
 * Every public destination, declared once.
 *
 * The route table, the navigation copy and the sections themselves read these constants, so
 * renaming a homepage section cannot leave a header link pointing at an anchor that no longer
 * exists: the rename stops compiling instead of failing silently in the browser.
 */
export const publicPath = {
  home: "/",
  diagnostic: "/diagnostic",
  login: "/connexion",
  signup: "/inscription",
  legalNotice: "/mentions-legales",
  privacy: "/confidentialite",
  terms: "/conditions-generales",
} as const;

/** Homepage section identifiers. The value is the DOM id, the key is how code refers to it. */
export const landingAnchor = {
  top: "top",
  audiences: "situations",
  result: "resultat",
  howItWorks: "fonctionnement",
  trust: "confiance",
  faq: "faq",
} as const;

export type LandingAnchorId = keyof typeof landingAnchor;

/**
 * The prefix lets a nested route (a legal page) point back at a homepage section, which a bare
 * fragment cannot do because it would resolve against the current path.
 */
export const landingAnchorHref = (anchor: LandingAnchorId, prefix = "") =>
  `${prefix}#${landingAnchor[anchor]}`;
