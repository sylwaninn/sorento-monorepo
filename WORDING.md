# WORDING.md: copy and wording strategy

Read this before writing or editing ANY user-facing French copy: UI strings,
marketing pages, catalog data, emails, letter templates, FAQ answers, meta
tags. It applies to every surface a family reads. Code stays in English
(CLAUDE.md); this file governs what the reader sees.

Why it exists: the reader may have lost someone days ago. Every word is read
in that state. The product's promise ("unclaimed benefits and sums") is also
the easiest one to phrase in a way that sounds predatory or guilt-inducing.
These rules keep the promise audible and the tone irreproachable.

## Voice

- Sober, calm, precise. Short sentences. One idea per sentence.
- Vouvoiement, always. No exclamation marks, no emojis, no superlatives
  ("le meilleur", "révolutionnaire"), no fake proximity ("on s'occupe de
  tout").
- The reader stays the actor: Sorento "indique", "organise", "prépare des
  modèles"; the reader "décide", "vérifie", "signe". Never promise Sorento
  does a procedure for them (it is also the legal line).
- No guilt, no pressure: no countdown language, no "vite", no "dernière
  chance", no loss-aversion framing ("ne ratez pas", "ne passez pas à
  côté"). State what exists; let the reader come to it.
- Sentence case everywhere. FAQ questions are written in the visitor's own
  voice.

## Naming the death

Never blunt, never opaque. Three tiers:

**Forbidden everywhere:** "mort", "mourir", "perdre la vie", "disparu(e)" /
"disparition" (reads as a missing person), "cadavre", "enterrement" (say
"obsèques"). Also forbidden: poetic euphemisms that hide what the product is
("le grand voyage", "s'en aller").

**Sparing anchors, one per screen at most:** "décès", "après un décès",
"la personne décédée". Use them where clarity or search intent demands it:
the page title and meta tags, the hero title, a legal page. They are how
the visitor knows they are in the right place; repetition is what wounds.

**Preferred in running copy:** "la perte d'un proche", "l'après",
"le moment venu", "en votre absence" (preparation journey), "vos proches".
These carry the meaning without restating the event in every paragraph.

**Official terms stay verbatim, always:** "capital décès", "acte de décès",
"allocation décès", "assurance décès", "pension de réversion", "allocation
de veuvage". Never euphemize an administrative name: the reader must be able
to find it on the official site. This overrides the sparing-anchor budget:
official names do not count against it.

Letter templates and catalog entries may use administrative vocabulary
("la personne décédée", "le défunt") because their register is the
administration's, not ours.

## Naming the money

The angle "aides non réclamées, capitaux oubliés" is the product's core
promise. It is kept, but phrased with dignity.

**Forbidden:** "argent" (bare), "récupérer" / "récupération" (sounds like
profiteering), "toucher", "encaisser", "empocher", "gagner", "cagnotte",
"jackpot", any amount presented as a promise.

**Preferred:** "les sommes", "les capitaux", "les aides", "vos droits",
"ce qui peut vous revenir", "les sommes qui vous reviennent" (for sums
actually paid out), "percevoir" / "versement" (administrative register),
"faire valoir vos droits", "capitaux non réclamés" (the official ACPR
descriptor; describes the stock, never an instruction to the reader).

## Plain words, no jargon

- A word the visitor would not say to a friend does not belong in the copy.
  Test every noun against that.
- "Diagnostic" is banned in user-facing copy: product jargon with a medical
  ring, and nobody knows what it produces. The action is "faire le point
  (sur ma/votre situation)"; what it produces is "une première synthèse" /
  "votre synthèse". Routes and code identifiers (/diagnostic) are
  unaffected.
- Section titles state a commitment or a benefit for the reader, never a
  self-assessment: "Des engagements clairs envers votre famille", not
  "Un service utile et à sa juste place".

## Entitlement caution (compliance, from CLAUDE.md)

- Always conditional: "peut vous concerner", "pourrait vous revenir",
  "les personnes dans une situation comme la vôtre peuvent avoir droit à".
- Never "vous avez droit à", "vous allez recevoir", "vous êtes éligible".
- Amounts are indicative, sourced and dated, never a promise.
- Every screen touching inheritance refers to the regulated professional
  (notaire, avocat). Sorento is "de l'information générale personnalisée".

## The two journeys: Organiser vs Préparer

The product has two faces and the copy must never blur them. Each has its
own verb family; the verbs are the signposts.

**Organiser (after a loss, dossier ACTIVE).** The reader handles the
procedures following a death.

- Verbs: organiser, avancer, suivre, répartir, vérifier, compléter.
- Nouns: les démarches, le parcours, le dossier, la synthèse.
- CTA stems: "Organiser les démarches", "Commencer les démarches",
  "Faire le point sur ma situation".

**Préparer (in advance, dossier PREPARATION).** The reader arranges their
own affairs so their relatives find everything ready.

- Verbs: préparer, rassembler, transmettre, alléger, laisser, désigner.
- Nouns: ma préparation, mes souhaits, mes contrats et documents, contact
  de confiance.
- CTA stems: "Commencer ma préparation", "Préparer l'après".
- Never "préparer vos affaires" / "ses propres affaires": "affaires" reads
  as belongings or business and says nothing. Name the concrete objects
  (contrats, documents, souhaits) or say "préparer l'après".
- "L'après" never takes a possessive: "mon après" / "votre après" is not
  idiomatic French and drifts towards "my afterlife". When it matters that
  the reader is preparing their own after, the possessive goes on the
  beneficiaries: "préparer l'après pour mes proches", "pour les vôtres".

The two entry doors are named by the pair, verbatim: the hero offers
"Organiser les démarches" (primary, into the questionnaire) and
"Préparer l'après pour mes proches" (secondary, towards the two-paths
section). Any surface that opens both journeys reuses these labels rather
than inventing synonyms: the pair is how a visitor learns the product has
two faces. Inside the product, where the context already says whose
preparation it is (the preparation dashboard), the short form
"Préparer l'après" is enough.

Separation rules:

- "Préparer" never appears in an Organiser title, CTA, button or label.
  For documents in the Organiser journey, say "prêts à relire", "modèles",
  "compléter" instead of "préparés" / "préparer". (The verb is the brand of
  the other journey; a stray "préparez vos courriers" makes the two faces
  indistinguishable.)
- "Les démarches" is never the headline noun of Préparer copy, except when
  it deliberately names the relatives' future work ("alléger les démarches
  de vos proches").
- A surface serving both journeys names both explicitly and in this order:
  Organiser first (the urgent reader), Préparer second. The audiences
  section of the landing page is the reference pattern.
- Possessives follow the journey: Organiser speaks of "les démarches" (they
  belong to the situation), Préparer speaks of "ma préparation, mes
  souhaits" (they belong to the reader).

## CTA rules

- Verb-first infinitive. First person ("mon", "ma") for commitment CTAs;
  impersonal for navigation ("Comment ça marche", "Voir le plan d'action").
- One primary CTA per screen. Everything else is quiet/secondary.
- "Gratuit" budget: the hero (subtitle or primary CTA), the final CTA, and
  sections whose subject is cost (pricing FAQ, reassurance). Nowhere else:
  a "gratuit" on every button reads as insistence, and insistence reads as
  a catch.
- No urgency, no scarcity, no loss-aversion in CTAs. The deadline pressure
  belongs to the procedures themselves, stated factually with their dates,
  never to the marketing.
- The closing section invites rather than announces: a short, quiet title
  ("Le premier pas peut être tout petit."), set small. The page has already
  argued its case; the ending only has to hold the door open.

## Micro-rules

- No em dash, en dash or horizontal bar, anywhere (CLAUDE.md rule).
- French typography: space before € ("4 009 €"), no space before a comma,
  apostrophes typographiques (’) in copy strings.
- Brand: "Sorento", never "SORENTO" or "sorento" in copy. Signature:
  "L’après, plus simplement."
- Numbers that are promises of scale ("643 000 décès") belong to B2B
  material, not to the family-facing site.
- Comfort phrases ("à votre rythme", "pas à pas", "vous gardez la main",
  "une démarche à la fois") appear at most twice per page. Repeated, they
  stop soothing and start sounding like a script.

## Enforcement

- All copy lives in content modules (`content/*.ts`, `components/content.ts`),
  never inline in components.
- Copy asserted or clicked by E2E journeys is mirrored in
  `e2e/support/copy*.ts` through `mirrors()`. Change both in the same
  commit; `pnpm check:tests` refuses a drifted mirror.
- When a wording decision is not covered here, add the rule here in the
  same PR as the copy it decides.
