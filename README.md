# Carrefour des pratiques — IEP1

Application de gestion du carrefour des pratiques : liste des ateliers, choix des enseignants
par école, répartition automatique sur 3 sessions, et feuilles d'émargement.

Site 100% statique (HTML/CSS/JS, aucune installation). Les données (écoles, enseignants, choix,
répartition) sont stockées dans un **second repo GitHub privé**, distinct de celui-ci, pour ne
jamais exposer de données personnelles publiquement.

## Mise en service (une seule fois)

1. **Créer le repo de données privé**, par ex. `IEP1/carrefour_des_pratiques-data`, sur github.com
   → *New repository* → cocher **Private**. Il peut rester vide, l'appli crée les fichiers seule.

2. **Créer un token d'accès personnel (fine-grained)** :
   github.com → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens*
   → *Generate new token*.
   - *Repository access* : seulement le repo de données créé à l'étape 1.
   - *Permissions* → *Contents* : **Read and write**.
   - Copier le token généré (il ne sera plus jamais affiché).

3. **Activer GitHub Pages** sur *ce* repo (le code) : *Settings* → *Pages* → *Deploy from a branch*
   → branche `main`, dossier `/ (root)`.

4. Chaque directeur, sur son navigateur, ouvre le site puis clique **⚙ Données** en haut de page
   et renseigne : compte/organisation, nom du repo privé, branche (`main`), et le token créé à
   l'étape 2. Le token reste uniquement dans le navigateur (localStorage), jamais dans le code.

## Fonctionnement

- **Ateliers** (`index.html`) : liste, ajout/retrait, statut à valider/validé, paramètres de
  l'événement (date, lieu, sessions, capacité, nombre de choix), impression 1 page.
- **Écoles** (`ecoles.html` → `ecole.html`) : chaque directeur choisit son école (pas de mot de
  passe), gère ses enseignants et leurs 5 choix classés par ordre de préférence. Feuille vierge
  imprimable pour un remplissage papier en amont.
- **Répartition** (`repartition.html`) : calcule automatiquement les 3 sessions pour tous les
  enseignants de toutes les écoles (règles de priorité par rang de choix, horodatage de saisie,
  et repli par cycle en cas de choix épuisés).
- **Émargement** (`emargement.html`) : génère les feuilles de présence (une par atelier et par
  session) pour un ou plusieurs ateliers sélectionnés.

Chaque école a son propre fichier de données dans le repo privé (`ecoles/<id>.json`), ce qui
évite les conflits entre directeurs qui saisissent en même temps sur des écoles différentes.
Chaque écriture crée un commit sur le repo de données : c'est votre historique de sauvegardes.
