/* En-tête commun, injecté sur chaque page, et mode administrateur.
 *
 * Mode administrateur : un cadenas dans l'en-tête demande le mot de passe une fois par session de
 * navigateur. Sans lui, le menu n'affiche que "Ateliers" (lecture/impression) et "Écoles" ; les pages
 * Répartition et Émargement, la modification des ateliers et l'espace Administration restent cachés.
 * C'est un garde-fou contre les clics accidentels : le mot de passe est lisible dans ce fichier
 * (dépôt public), ce n'est pas une sécurité contre une personne malveillante. Le vrai filet de
 * sécurité, ce sont les sauvegardes (espace Administration). */

const MOT_DE_PASSE_ADMIN = 'IEP1';
const CLE_ADMIN = 'iep1_admin';

function estAdmin() {
  try { return sessionStorage.getItem(CLE_ADMIN) === '1'; } catch (e) { return false; }
}

function tenterConnexionAdmin(mdp) {
  if (mdp !== MOT_DE_PASSE_ADMIN) return false;
  try { sessionStorage.setItem(CLE_ADMIN, '1'); } catch (e) { /* navigation privée stricte : ignoré */ }
  return true;
}

function deconnecterAdmin() {
  try { sessionStorage.removeItem(CLE_ADMIN); } catch (e) { /* ignoré */ }
  location.reload();
}

/** Remplit `conteneur` avec un petit formulaire de mot de passe. `surReussite` est appelé si le mot de passe est bon. */
function construireFormulaireAdmin(conteneur, surReussite, surAnnuler) {
  conteneur.innerHTML = `
    <div class="champ">
      <label for="admin-mdp-saisie">Mot de passe administrateur</label>
      <input type="password" id="admin-mdp-saisie" autocomplete="off">
    </div>
    <p id="admin-mdp-erreur" class="alerte alerte-err" style="display:none;">Mot de passe incorrect.</p>
    <div class="groupe-btns">
      ${surAnnuler ? '<button class="btn btn-secondaire" id="admin-mdp-annuler">Annuler</button>' : ''}
      <button class="btn btn-primaire" id="admin-mdp-valider">Valider</button>
    </div>`;
  const champ = conteneur.querySelector('#admin-mdp-saisie');
  const valider = () => {
    if (tenterConnexionAdmin(champ.value)) surReussite();
    else { conteneur.querySelector('#admin-mdp-erreur').style.display = 'block'; champ.select(); }
  };
  conteneur.querySelector('#admin-mdp-valider').addEventListener('click', valider);
  champ.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); if (e.key === 'Escape' && surAnnuler) surAnnuler(); });
  if (surAnnuler) conteneur.querySelector('#admin-mdp-annuler').addEventListener('click', surAnnuler);
  champ.focus();
}

/** Fenêtre de saisie du mot de passe (clic sur le cadenas). */
function ouvrirConnexionAdmin() {
  if (document.getElementById('modale-admin')) return;
  const m = document.createElement('div');
  m.id = 'modale-admin';
  m.className = 'no-print';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(14,33,56,.5);z-index:200;display:flex;align-items:center;justify-content:center;';
  m.innerHTML = '<div class="carte" style="max-width:360px;width:92%;"><h3 style="margin-top:0;">Accès administrateur</h3><div id="modale-admin-corps"></div></div>';
  document.body.appendChild(m);
  const fermer = () => m.remove();
  construireFormulaireAdmin(m.querySelector('#modale-admin-corps'), () => location.reload(), fermer);
}

/** À appeler en haut d'une page réservée à l'administrateur (Répartition, Émargement).
 *  Retourne true si l'accès est autorisé ; sinon masque le contenu, affiche le formulaire et retourne false
 *  (la page ne doit alors rien charger ni écrire). */
function exigerAdmin() {
  if (estAdmin()) return true;
  const main = document.querySelector('main');
  if (main) main.style.display = 'none';
  const garde = document.createElement('div');
  garde.className = 'carte no-print';
  garde.style.cssText = 'max-width:420px;margin:60px auto;';
  garde.innerHTML = '<h3 style="margin-top:0;">Page réservée à l\'IEP1</h3><p class="intro">Saisissez le mot de passe administrateur pour accéder à cette page.</p><div id="garde-admin-corps"></div>';
  const cible = document.getElementById('entete-app');
  if (cible) cible.insertAdjacentElement('afterend', garde); else document.body.prepend(garde);
  construireFormulaireAdmin(garde.querySelector('#garde-admin-corps'), () => location.reload(), null);
  return false;
}

const PAGES_NAV = [
  { href: 'index.html', label: 'Ateliers' },
  { href: 'ecoles.html', label: 'Écoles' },
  { href: 'repartition.html', label: 'Répartition', admin: true },
  { href: 'emargement.html', label: "Émargement", admin: true }
];

function injecterEntete(pageActive) {
  const cible = document.getElementById('entete-app');
  if (!cible) return;
  const admin = estAdmin();
  const liens = PAGES_NAV
    .filter(p => !p.admin || admin)
    .map(p => `<a href="${p.href}" class="${p.href === pageActive ? 'actif' : ''}">${p.label}</a>`).join('');
  cible.innerHTML = `
    <header class="entete no-print">
      <div class="entete-marque">
        <img src="assets/logo-iep1.png" alt="Logo IEP1">
        <div class="titres">
          <h1>Carrefour des pratiques</h1>
          <p class="sous-titre">IEP1 — Avec les équipes, pour les élèves</p>
        </div>
      </div>
      <nav>${liens}</nav>
      <div class="entete-spacer">
        <button class="btn-cadenas" id="btn-cadenas" title="${admin ? 'Quitter le mode administrateur' : 'Accès administrateur'}">${admin ? '🔓 Admin · quitter' : '🔒'}</button>
      </div>
    </header>
  `;
  document.getElementById('btn-cadenas').addEventListener('click', admin ? deconnecterAdmin : ouvrirConnexionAdmin);
  // Si la page courante a une sauvegarde en attente (voir ecole.html), on l'attend avant de
  // suivre un lien du menu, pour ne jamais perdre une saisie faite juste avant de cliquer.
  cible.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', async (e) => {
      if (typeof window.assurerSauvegarde === 'function') {
        e.preventDefault();
        await window.assurerSauvegarde();
        location.href = a.href;
      }
    });
  });
}
