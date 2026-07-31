import type { ComponentType } from "react";
import { createBrowserRouter, Outlet, ScrollRestoration, type RouteObject } from "react-router";
import { CanonicalUrl } from "@/components/CanonicalUrl";
import { LandingPage } from "@/features/landing/LandingPage";
import { publicPath } from "@/navigation";

type ScreenLoader = () => Promise<ComponentType>;

/**
 * React Router owns page-level code splitting, so the homepage does not download authenticated
 * screens, admin tables, PDF tooling, or form flows before they are requested.
 */
const lazyScreen =
  (load: ScreenLoader): NonNullable<RouteObject["lazy"]> =>
  async () => ({ Component: await load() });

const legalModule = () => import("@/features/legal/LegalPage");

/**
 * Exported as data, not only as a built router, so the smoke suite can walk the table and
 * render every screen. A route added here is smoke-tested the moment it is added.
 */
const appRoutes: RouteObject[] = [
  {
    path: publicPath.diagnostic,
    lazy: lazyScreen(
      async () => (await import("@/features/diagnostic/DiagnosticWizardPage")).DiagnosticWizardPage,
    ),
  },
  {
    path: publicPath.legalNotice,
    lazy: lazyScreen(async () => (await legalModule()).LegalNoticePage),
  },
  {
    path: publicPath.privacy,
    lazy: lazyScreen(async () => (await legalModule()).PrivacyPage),
  },
  {
    path: publicPath.terms,
    lazy: lazyScreen(async () => (await legalModule()).TermsPage),
  },
  {
    path: "/guides/:slug",
    lazy: lazyScreen(async () => (await import("@/features/content/ArticlePage")).ArticlePage),
  },
  {
    path: "/diagnostic/resultat",
    lazy: lazyScreen(
      async () => (await import("@/features/diagnostic/DiagnosticResultPage")).DiagnosticResultPage,
    ),
  },
  {
    path: "/invitations/accepter",
    lazy: lazyScreen(
      async () => (await import("@/features/dossier/AcceptInvitationPage")).AcceptInvitationPage,
    ),
  },
  {
    path: "/contact-confiance/confirmer",
    lazy: lazyScreen(
      async () =>
        (await import("@/features/activation/ConsentTrustedContactPage")).ConsentTrustedContactPage,
    ),
  },
  {
    path: "/contact-confiance/activer",
    lazy: lazyScreen(
      async () =>
        (await import("@/features/activation/ActivateTrustedContactPage"))
          .ActivateTrustedContactPage,
    ),
  },
  {
    lazy: lazyScreen(async () => (await import("@/auth/RequireGuest")).RequireGuest),
    children: [
      {
        path: publicPath.signup,
        lazy: lazyScreen(async () => (await import("@/features/auth/SignupPage")).SignupPage),
      },
      {
        path: publicPath.login,
        lazy: lazyScreen(async () => (await import("@/features/auth/LoginPage")).LoginPage),
      },
      {
        path: "/mot-de-passe-oublie",
        lazy: lazyScreen(
          async () =>
            (await import("@/features/auth/PasswordResetRequestPage")).PasswordResetRequestPage,
        ),
      },
    ],
  },
  {
    path: "/verification-email",
    lazy: lazyScreen(async () => (await import("@/features/auth/VerifyEmailPage")).VerifyEmailPage),
  },
  {
    path: "/auth/reset",
    lazy: lazyScreen(
      async () =>
        (await import("@/features/auth/PasswordResetConfirmPage")).PasswordResetConfirmPage,
    ),
  },
  {
    lazy: lazyScreen(async () => (await import("@/auth/RequireAuth")).RequireAuth),
    children: [
      {
        path: "/mes-dossiers",
        lazy: lazyScreen(
          async () => (await import("@/features/dossiers/DossiersPage")).DossiersPage,
        ),
      },
      {
        path: "/parametres",
        lazy: lazyScreen(
          async () => (await import("@/features/account/SettingsPage")).SettingsPage,
        ),
      },
      {
        path: "/dossiers/:dossierId",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/DossierHomePage")).DossierHomePage,
        ),
      },
      {
        path: "/dossiers/:dossierId/demarches/:procedureId",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/ProcedureDetailPage")).ProcedureDetailPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/aides",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/BenefitsPage")).BenefitsPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/argent-oublie",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/ForgottenMoneyPage")).ForgottenMoneyPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/documents",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/DocumentsPage")).DocumentsPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/membres",
        lazy: lazyScreen(async () => (await import("@/features/dossier/MembersPage")).MembersPage),
      },
      {
        path: "/dossiers/:dossierId/activite",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/ActivityPage")).ActivityPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/ma-situation",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/SubjectFormPage")).SubjectFormPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/contrats",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/ContractsPage")).ContractsPage,
        ),
      },
      {
        path: "/dossiers/:dossierId/souhaits",
        lazy: lazyScreen(async () => (await import("@/features/dossier/WishesPage")).WishesPage),
      },
      {
        path: "/dossiers/:dossierId/contact-de-confiance",
        lazy: lazyScreen(
          async () => (await import("@/features/dossier/TrustedContactPage")).TrustedContactPage,
        ),
      },
      {
        lazy: lazyScreen(async () => (await import("@/auth/RequireAdmin")).RequireAdmin),
        children: [
          {
            path: "/admin",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/AdminHomePage")).AdminHomePage,
            ),
          },
          {
            path: "/admin/referentiel",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/CatalogPage")).CatalogPage,
            ),
          },
          {
            path: "/admin/historique",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/CatalogHistoryPage")).CatalogHistoryPage,
            ),
          },
          {
            path: "/admin/test-profil",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/ProfileTestingPage")).ProfileTestingPage,
            ),
          },
          {
            path: "/admin/statistiques",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/MetricsPage")).MetricsPage,
            ),
          },
          {
            path: "/admin/design-system",
            lazy: lazyScreen(
              async () => (await import("@/features/admin/DesignSystemPage")).DesignSystemPage,
            ),
          },
        ],
      },
    ],
  },
];

/**
 * What every route needs and no screen should have to remember.
 *
 * ScrollRestoration is there because a client navigation leaves the scroll position where the
 * previous screen left it, so following a call to action from the bottom of the homepage would
 * open the next screen halfway down. A full page load never had that problem, and neither should
 * the navigation that replaced it.
 */
const DocumentLayout = () => (
  <>
    <ScrollRestoration />
    <CanonicalUrl />
    <Outlet />
  </>
);

export const routes: RouteObject[] = [
  {
    element: <DocumentLayout />,
    children: [
      { path: publicPath.home, element: <LandingPage /> },
      {
        lazy: lazyScreen(async () => (await import("@/auth/AuthProvider")).AuthBoundary),
        children: appRoutes,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
