# Carrefour des pratiques — IEP1

Application de gestion du carrefour des pratiques : liste des ateliers, choix des enseignants
par école, répartition automatique sur 3 sessions, et feuilles d'émargement.

Site 100% statique (HTML/CSS/JS, aucune installation), hébergé sur **Netlify**. Les données
(écoles, enseignants, choix, répartition) sont stockées dans **Supabase** (base Postgres), une
ligne par document (`config`, `ateliers`, `ecoles`, `ecoles/<id>`, `repartition`).

La clé Supabase utilisée par le site (`js/data-backend.js`) est la clé **anon**, publique par
conception : la protection réelle vient des règles d'accès (RLS) définies sur la table
`documents` dans Supabase, pas du secret de cette clé. Il n'y a donc **aucun token à gérer** —
l'accès à l'appli se fait uniquement en connaissant le lien du site (pas de mot de passe, sur le
principe de confiance voulu pour cet usage).

## Mise en service (une seule fois)

1. **Créer un projet Supabase** sur supabase.com.
2. Dans *SQL Editor*, exécuter :
   ```sql
   create table documents (
     path text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table documents enable row level security;
   create policy "Lecture publique" on documents for select using (true);
   create policy "Écriture publique" on documents for insert with check (true);
   create policy "Mise à jour publique" on documents for update using (true);
   ```
3. Dans *Project Settings → API*, copier l'**URL du projet** et la clé **anon public**, et les
   coller dans `js/data-backend.js` (`SUPABASE_URL` et `SUPABASE_ANON_KEY`).
4. **Déployer sur Netlify** : *Add new project → Import from Git → GitHub* → sélectionner ce
   repo. Aucune configuration de build nécessaire (site statique).

## Import initial des enseignants

`import.html` (jamais publié, voir `.gitignore`) écrit en une fois la liste réelle des
enseignants (`js/import-data.local.js`, également jamais publié) dans Supabase. À exécuter une
seule fois en local, en ouvrant simplement le fichier dans un navigateur.

## Fonctionnement

- **Ateliers** (`index.html`) : liste, ajout/retrait, statut à valider/validé, paramètres de
  l'événement (date, lieu, sessions, capacité, nombre de choix), impression 1 page.
- **Écoles** (`ecoles.html` → `ecole.html`) : chaque directeur choisit son école (pas de mot de
  passe), gère ses enseignants et leurs 5 choix classés par ordre de préférence. Feuille vierge
  imprimable pour un remplissage papier en amont. Un panneau *Administration* (mot de passe
  local, voir le code) permet de réinitialiser les choix ou les enseignants d'une école.
- **Répartition** (`repartition.html`) : calcule automatiquement les 3 sessions pour tous les
  enseignants de toutes les écoles (règles de priorité par rang de choix, horodatage de saisie,
  et repli par cycle — y compris Directeur/DESED/CLIS/Locuteur, éligibles à tous les ateliers).
- **Émargement** (`emargement.html`) : génère les feuilles de présence (une par atelier et par
  session) pour un ou plusieurs ateliers sélectionnés.

Chaque école a son propre document (`ecoles/<id>`), ce qui limite les conflits entre directeurs
qui saisissent en même temps sur des écoles différentes — et une même ligne s'écrit toujours
proprement (pas de conflit d'écriture possible avec Supabase, contrairement à l'ancien stockage
GitHub).
