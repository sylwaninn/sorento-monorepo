export interface Article {
  title: string;
  paragraphs: readonly string[];
}

// Editorial content lands here later; the route and layout exist so an article is a data
// entry rather than a new page to build.
const articles: Record<string, Article | undefined> = {};

export const contentPagesContent = {
  notFoundTitle: "Article introuvable",
  notFoundBody: "Cet article n'existe pas ou n'est pas encore publié.",

  cta: {
    title: "Savoir ce qui vous concerne, vous",
    description:
      "Le diagnostic est gratuit, sans compte, et vous dit quelles démarches et quelles aides s'appliquent à votre situation.",
    button: "Commencer mon diagnostic",
  },

  articles,
} as const;
