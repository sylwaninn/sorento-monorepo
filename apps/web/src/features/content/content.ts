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
      "Répondez à quelques questions, gratuitement et sans compte : vous découvrez les démarches et les aides qui pourraient s'appliquer à votre situation.",
    button: "Faire le point sur ma situation",
  },

  articles,
} as const;
