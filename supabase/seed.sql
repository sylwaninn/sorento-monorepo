-- ============================================================================
-- Development catalog data: 12 procedures, 5 benefits, varied conditions.
-- `code` fields are stable identifiers used by core fixtures and integration tests.
-- Titles/descriptions are French: this is real product content for French users,
-- not code, so it stays in the language it will be displayed in.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedures
-- ----------------------------------------------------------------------------

insert into procedures (code, title, description, organization, recipient_address, time_window, delay_days, reference_profession, source_url, last_verified_date) values
  ('death_civil_status', 'Déclarer le décès à la mairie', 'La déclaration de décès doit être faite dans les 24 heures ouvrées, en général par les pompes funèbres.', 'Mairie du lieu de décès', null, '24h', 1, null, 'https://www.service-public.fr/particuliers/vosdroits/F980', '2026-01-15'),
  ('funeral_arrangements', 'Organiser les obsèques', 'Choisir un opérateur funéraire habilité et organiser les obsèques selon les volontés du défunt.', 'Opérateur funéraire', null, '24h', 6, null, 'https://www.service-public.fr/particuliers/vosdroits/F1199', '2026-01-15'),
  ('notify_employer', 'Informer l''employeur du défunt', 'Prévenir l''employeur du défunt s''il était salarié, pour le solde de tout compte et les documents de fin de contrat.', 'Employeur du défunt', null, '7d', 7, null, 'https://www.service-public.fr/particuliers/vosdroits/F2416', '2026-01-15'),
  ('bank_account_freeze', 'Informer la banque du décès', 'La banque bloque les comptes individuels du défunt dès notification du décès ; les comptes joints restent utilisables sauf opposition.', 'Établissement bancaire', null, '7d', 7, 'notaire', 'https://www.service-public.fr/particuliers/vosdroits/F14203', '2026-01-15'),
  ('health_insurance_card', 'Renvoyer la carte Vitale et signaler le décès à la CPAM', 'La carte Vitale du défunt doit être renvoyée à la CPAM ; le conjoint survivant peut avoir droit au capital décès.', 'CPAM', null, '7d', 7, null, 'https://www.ameli.fr/assure/droits-demarches/deces', '2026-01-15'),
  ('family_allowance_notice', 'Signaler le décès à la CAF', 'Informer la CAF pour la mise à jour des droits et l''éventuelle ouverture de droits liés au veuvage.', 'CAF', null, '7d', 10, null, 'https://www.caf.fr', '2026-01-15'),
  ('insurance_cancellation', 'Résilier ou transférer les contrats d''assurance', 'Signaler le décès aux assureurs (habitation, auto, santé) pour résiliation ou transfert de contrat.', 'Compagnies d''assurance', null, '30d', 30, null, 'https://www.service-public.fr/particuliers/vosdroits/F31228', '2026-01-15'),
  ('estate_notary', 'Consulter un notaire pour la succession', 'La succession doit être réglée avec un notaire, obligatoire au-delà de certains seuils ou en présence de biens immobiliers.', 'Étude notariale', null, '30d', 30, 'notaire', 'https://www.service-public.fr/particuliers/vosdroits/F14198', '2026-01-15'),
  ('tax_office_notice', 'Déclarer le décès aux impôts', 'Informer le centre des impôts et préparer la déclaration de revenus du défunt et, le cas échéant, la déclaration de succession.', 'Service des impôts', null, '30d', 30, 'notaire', 'https://www.impots.gouv.fr', '2026-01-15'),
  ('survivor_pension_request', 'Demander la pension de réversion', 'Le conjoint survivant peut demander la pension de réversion auprès des caisses de retraite du défunt sous conditions.', 'Caisse de retraite', null, '6m', 90, 'conseiller retraite', 'https://www.info-retraite.fr', '2026-01-15'),
  ('landlord_notice', 'Informer le propriétaire ou le syndic', 'Signaler le décès au propriétaire (si locataire) ou au syndic de copropriété (si propriétaire).', 'Propriétaire / syndic', null, '30d', 30, null, 'https://www.service-public.fr/particuliers/vosdroits/F1168', '2026-01-15'),
  ('vehicle_title_transfer', 'Transférer ou vendre le véhicule du défunt', 'La carte grise du véhicule doit être mise au nom des héritiers ou le véhicule vendu, après règlement de la succession.', 'Préfecture / ANTS', null, '6m', 180, 'notaire', 'https://www.service-public.fr/particuliers/vosdroits/F13375', '2026-01-15'),
  ('ciclade_search', 'Rechercher sur Ciclade', 'Ciclade est le service gratuit de la Caisse des Dépôts qui recense les comptes bancaires et contrats d''assurance vie en déshérence. La recherche se fait avec le nom du défunt et sa date de naissance ou de décès.', 'Caisse des Dépôts', null, '6m', 90, null, 'https://ciclade.caissedesdepots.fr', '2026-01-15'),
  ('agira_request', 'Saisir l''AGIRA pour les contrats d''assurance vie', 'L''AGIRA recherche les contrats d''assurance vie dont le défunt pourrait être bénéficiaire, à partir d''une simple demande écrite ou en ligne.', 'AGIRA', null, '6m', 90, null, 'https://www.agira.asso.fr', '2026-01-15');

-- ----------------------------------------------------------------------------
-- Benefits
-- ----------------------------------------------------------------------------

insert into benefits (code, title, main_condition, estimated_amount, organization, form_url, caution_text, time_window, source_url, last_verified_date) values
  ('death_benefit_cpam', 'Capital décès de la Sécurité sociale', 'Le défunt était salarié ou demandeur d''emploi indemnisé au moment du décès.', 'environ 3 900 €', 'CPAM', 'https://www.ameli.fr/assure/droits-demarches/famille/deces-assure/capital-deces', 'Les personnes dans une situation comme la vôtre peuvent avoir droit à un capital décès versé par la Sécurité sociale.', '30d', 'https://www.ameli.fr/assure/droits-demarches/famille/deces-assure/capital-deces', '2026-01-15'),
  ('widowhood_allowance', 'Allocation de veuvage', 'Conjoint survivant de moins de 55 ans, ressources sous plafond, défunt ayant cotisé au régime général.', 'jusqu''à environ 700 €/mois', 'CARSAT', 'https://www.lassuranceretraite.fr', 'Les personnes dans une situation comme la vôtre peuvent avoir droit à l''allocation de veuvage sous conditions de ressources.', '6m', 'https://www.lassuranceretraite.fr', '2026-01-15'),
  ('survivor_pension', 'Pension de réversion', 'Conjoint survivant ou ex-conjoint, sous conditions d''âge et de ressources selon le régime du défunt.', 'jusqu''à 54 % de la pension du défunt', 'Caisses de retraite', 'https://www.info-retraite.fr', 'Les personnes dans une situation comme la vôtre peuvent avoir droit à une pension de réversion sous conditions.', '6m', 'https://www.info-retraite.fr', '2026-01-15'),
  ('funeral_expenses_aid', 'Aide financière aux frais d''obsèques', 'Foyer aux ressources modestes, sur étude du dossier par l''action sociale de la CAF ou de la mairie.', 'variable selon situation', 'CAF / CCAS', 'https://www.caf.fr', 'Les personnes dans une situation comme la vôtre peuvent avoir droit à une aide ponctuelle aux frais d''obsèques.', '7d', 'https://www.caf.fr', '2026-01-15'),
  ('provident_death_benefit', 'Capital décès d''un contrat de prévoyance', 'Le défunt avait souscrit un contrat de prévoyance ou d''assurance-emprunteur mentionnant un bénéficiaire.', 'variable selon contrat', 'Assureur du défunt', 'https://www.service-public.fr/particuliers/vosdroits/F31228', 'Les personnes dans une situation comme la vôtre peuvent avoir droit à un capital versé au titre d''un contrat de prévoyance existant.', '30d', 'https://www.service-public.fr/particuliers/vosdroits/F31228', '2026-01-15');

-- ----------------------------------------------------------------------------
-- Conditions (tree evaluated by packages/core; fields come from the diagnostic)
-- ----------------------------------------------------------------------------

insert into conditions (procedure_id, expression)
select id, jsonb_build_object(
  'type', 'comparison', 'field', 'maritalStatus', 'operator', 'in', 'value', jsonb_build_array('married', 'civilUnion')
)
from procedures where code = 'survivor_pension_request';

insert into conditions (procedure_id, expression)
select id, jsonb_build_object(
  'type', 'comparison', 'field', 'ownsVehicle', 'operator', 'eq', 'value', true
)
from procedures where code = 'vehicle_title_transfer';

insert into conditions (procedure_id, expression)
select id, jsonb_build_object(
  'type', 'or', 'conditions', jsonb_build_array(
    jsonb_build_object('type', 'comparison', 'field', 'housingStatus', 'operator', 'eq', 'value', 'tenant'),
    jsonb_build_object('type', 'comparison', 'field', 'housingStatus', 'operator', 'eq', 'value', 'owner')
  )
)
from procedures where code = 'landlord_notice';

insert into conditions (procedure_id, expression)
select id, jsonb_build_object(
  'type', 'comparison', 'field', 'employmentStatus', 'operator', 'eq', 'value', 'employee'
)
from procedures where code = 'notify_employer';

insert into conditions (benefit_id, expression)
select id, jsonb_build_object(
  'type', 'and', 'conditions', jsonb_build_array(
    jsonb_build_object('type', 'comparison', 'field', 'maritalStatus', 'operator', 'in', 'value', jsonb_build_array('married', 'civilUnion')),
    jsonb_build_object('type', 'comparison', 'field', 'survivingSpouseAge', 'operator', 'lt', 'value', 55)
  )
)
from benefits where code = 'widowhood_allowance';

insert into conditions (benefit_id, expression)
select id, jsonb_build_object(
  'type', 'comparison', 'field', 'employmentStatus', 'operator', 'in', 'value', jsonb_build_array('employee', 'jobseeker')
)
from benefits where code = 'death_benefit_cpam';

insert into conditions (benefit_id, expression)
select id, jsonb_build_object(
  'type', 'comparison', 'field', 'maritalStatus', 'operator', 'in', 'value', jsonb_build_array('married', 'civilUnion', 'divorced')
)
from benefits where code = 'survivor_pension';

-- ----------------------------------------------------------------------------
-- Letter templates
-- ----------------------------------------------------------------------------

insert into letter_templates (procedure_id, title, body_template, variables, source_url, last_verified_date)
select id,
  'Courrier de notification de décès à la banque',
  E'Madame, Monsieur,\n\nJ''ai l''honneur de vous informer du décès de {{deceasedName}}, survenu le {{deathDate}}, titulaire du compte n° {{accountNumber}} dans votre établissement.\n\nJe vous prie de bien vouloir procéder aux formalités nécessaires liées à cette situation.\n\nVeuillez trouver ci-joint une copie de l''acte de décès.\n\nJe vous prie d''agréer, Madame, Monsieur, l''expression de mes salutations distinguées.\n\n{{senderName}}',
  jsonb_build_array('deceasedName', 'deathDate', 'accountNumber', 'senderName'),
  'https://www.service-public.fr/particuliers/vosdroits/F14203',
  '2026-01-15'
from procedures where code = 'bank_account_freeze';

insert into letter_templates (procedure_id, title, body_template, variables, source_url, last_verified_date)
select id,
  'Courrier de signalement du décès à la CPAM',
  E'Madame, Monsieur,\n\nJe vous informe du décès de {{deceasedName}}, survenu le {{deathDate}}, numéro de sécurité sociale {{socialSecurityNumber}}.\n\nJe vous retourne ci-joint la carte Vitale du défunt ainsi qu''une copie de l''acte de décès.\n\nJe vous prie d''agréer, Madame, Monsieur, l''expression de mes salutations distinguées.\n\n{{senderName}}',
  jsonb_build_array('deceasedName', 'deathDate', 'socialSecurityNumber', 'senderName'),
  'https://www.ameli.fr/assure/droits-demarches/deces',
  '2026-01-15'
from procedures where code = 'health_insurance_card';

-- ----------------------------------------------------------------------------
-- Local dev only (seed.sql never runs in a hosted environment): pin the vault cron
-- secret to the value in supabase/functions/.env so pg_cron can authenticate against
-- the locally served Edge Functions. Hosted environments keep the generated secret.
-- ----------------------------------------------------------------------------

select vault.update_secret(
  (select id from vault.secrets where name = 'cron_secret'),
  'local-dev-cron-secret'
);
