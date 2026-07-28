import { createBrowserRouter, type RouteObject } from "react-router";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireAdmin } from "@/auth/RequireAdmin";
import { RequireGuest } from "@/auth/RequireGuest";
import { ArticlePage } from "@/features/content/ArticlePage";
import { LandingPage } from "@/features/landing/LandingPage";
import { LegalNoticePage, PrivacyPage, TermsPage } from "@/features/legal/LegalPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PasswordResetRequestPage } from "@/features/auth/PasswordResetRequestPage";
import { PasswordResetConfirmPage } from "@/features/auth/PasswordResetConfirmPage";
import { DiagnosticWizardPage } from "@/features/diagnostic/DiagnosticWizardPage";
import { DiagnosticResultPage } from "@/features/diagnostic/DiagnosticResultPage";
import { DossiersPage } from "@/features/dossiers/DossiersPage";
import { SettingsPage } from "@/features/account/SettingsPage";
import { DossierHomePage } from "@/features/dossier/DossierHomePage";
import { ProcedureDetailPage } from "@/features/dossier/ProcedureDetailPage";
import { BenefitsPage } from "@/features/dossier/BenefitsPage";
import { ForgottenMoneyPage } from "@/features/dossier/ForgottenMoneyPage";
import { DocumentsPage } from "@/features/dossier/DocumentsPage";
import { MembersPage } from "@/features/dossier/MembersPage";
import { ActivityPage } from "@/features/dossier/ActivityPage";
import { AcceptInvitationPage } from "@/features/dossier/AcceptInvitationPage";
import { SubjectFormPage } from "@/features/dossier/SubjectFormPage";
import { ContractsPage } from "@/features/dossier/ContractsPage";
import { WishesPage } from "@/features/dossier/WishesPage";
import { TrustedContactPage } from "@/features/dossier/TrustedContactPage";
import { ConsentTrustedContactPage } from "@/features/activation/ConsentTrustedContactPage";
import { ActivateTrustedContactPage } from "@/features/activation/ActivateTrustedContactPage";
import { AdminHomePage } from "@/features/admin/AdminHomePage";
import { CatalogPage } from "@/features/admin/CatalogPage";
import { CatalogHistoryPage } from "@/features/admin/CatalogHistoryPage";
import { ProfileTestingPage } from "@/features/admin/ProfileTestingPage";
import { MetricsPage } from "@/features/admin/MetricsPage";

/**
 * Exported as data, not only as a built router, so the smoke suite can walk the table and
 * render every screen. A route added here is smoke-tested the moment it is added — which is
 * the only version of "every page has a test" that survives the page count growing.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/diagnostic", element: <DiagnosticWizardPage /> },
  { path: "/mentions-legales", element: <LegalNoticePage /> },
  { path: "/confidentialite", element: <PrivacyPage /> },
  { path: "/conditions-generales", element: <TermsPage /> },
  // E04: the route and layout exist so an article is content to add, not a page to build.
  { path: "/guides/:slug", element: <ArticlePage /> },
  { path: "/diagnostic/resultat", element: <DiagnosticResultPage /> },
  { path: "/invitations/accepter", element: <AcceptInvitationPage /> },
  { path: "/contact-confiance/confirmer", element: <ConsentTrustedContactPage /> },
  { path: "/contact-confiance/activer", element: <ActivateTrustedContactPage /> },
  {
    element: <RequireGuest />,
    children: [
      { path: "/inscription", element: <SignupPage /> },
      { path: "/connexion", element: <LoginPage /> },
      { path: "/mot-de-passe-oublie", element: <PasswordResetRequestPage /> },
    ],
  },
  { path: "/verification-email", element: <VerifyEmailPage /> },
  { path: "/auth/reset", element: <PasswordResetConfirmPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/mes-dossiers", element: <DossiersPage /> },
      { path: "/parametres", element: <SettingsPage /> },
      { path: "/dossiers/:dossierId", element: <DossierHomePage /> },
      { path: "/dossiers/:dossierId/demarches/:procedureId", element: <ProcedureDetailPage /> },
      { path: "/dossiers/:dossierId/aides", element: <BenefitsPage /> },
      { path: "/dossiers/:dossierId/argent-oublie", element: <ForgottenMoneyPage /> },
      { path: "/dossiers/:dossierId/documents", element: <DocumentsPage /> },
      { path: "/dossiers/:dossierId/membres", element: <MembersPage /> },
      { path: "/dossiers/:dossierId/activite", element: <ActivityPage /> },
      { path: "/dossiers/:dossierId/ma-situation", element: <SubjectFormPage /> },
      { path: "/dossiers/:dossierId/contrats", element: <ContractsPage /> },
      { path: "/dossiers/:dossierId/souhaits", element: <WishesPage /> },
      { path: "/dossiers/:dossierId/contact-de-confiance", element: <TrustedContactPage /> },
      {
        element: <RequireAdmin />,
        children: [
          { path: "/admin", element: <AdminHomePage /> },
          { path: "/admin/referentiel", element: <CatalogPage /> },
          { path: "/admin/historique", element: <CatalogHistoryPage /> },
          { path: "/admin/test-profil", element: <ProfileTestingPage /> },
          { path: "/admin/statistiques", element: <MetricsPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
