/* En-tête commun + modale de connexion au repo de données GitHub, injectés sur chaque page. */

const PAGES_NAV = [
  { href: 'index.html', label: 'Ateliers' },
  { href: 'ecoles.html', label: 'Écoles' },
  { href: 'repartition.html', label: 'Répartition' },
  { href: 'emargement.html', label: "Émargement" }
];

function injecterEntete(pageActive) {
  const cible = document.getElementById('entete-app');
  if (!cible) return;
  const liens = PAGES_NAV.map(p => `<a href="${p.href}" class="${p.href === pageActive ? 'actif' : ''}">${p.label}</a>`).join('');
  cible.innerHTML = `
    <header class="entete no-print">
      <img src="assets/logo-iep1.png" alt="Logo IEP1">
      <div class="titres">
        <h1>Carrefour des pratiques</h1>
        <p class="sous-titre">IEP1 — Avec les équipes, pour les élèves</p>
      </div>
      <nav>${liens}</nav>
      <button class="btn btn-sm btn-secondaire" id="btn-connexion-donnees" type="button" title="Connexion au stockage des données">⚙ Données</button>
    </header>
  `;
  document.getElementById('btn-connexion-donnees').addEventListener('click', ouvrirModaleConnexion);
  injecterModaleConnexion();
  majPastilleConnexion();
}

function injecterModaleConnexion() {
  if (document.getElementById('modale-connexion')) return;
  const div = document.createElement('div');
  div.id = 'modale-connexion';
  div.className = 'no-print';
  div.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(14,33,56,.5);z-index:100;align-items:center;justify-content:center;';
  div.innerHTML = `
    <div class="carte" style="max-width:440px;width:92%;">
      <h3 style="margin-top:0;">Connexion au repo de données</h3>
      <p class="intro" style="margin-bottom:14px;">
        Les données (écoles, enseignants, choix) sont stockées dans votre repo GitHub <strong>privé</strong>,
        distinct du repo public du site. Renseignez-le une fois par appareil.
      </p>
      <div class="champ">
        <label for="ci-owner">Compte / organisation GitHub</label>
        <input type="text" id="ci-owner" placeholder="IEP1">
      </div>
      <div class="champ">
        <label for="ci-repo">Nom du repo privé de données</label>
        <input type="text" id="ci-repo" placeholder="carrefour_des_pratiques-data">
      </div>
      <div class="champ">
        <label for="ci-branch">Branche</label>
        <input type="text" id="ci-branch" placeholder="main">
      </div>
      <div class="champ">
        <label for="ci-token">Token d'accès personnel (fine-grained, droits Contents en lecture/écriture sur ce repo)</label>
        <input type="text" id="ci-token" placeholder="github_pat_...">
      </div>
      <p id="ci-message" class="alerte" style="display:none;"></p>
      <div class="groupe-btns" style="justify-content:flex-end;">
        <button class="btn btn-danger btn-sm" id="ci-deconnecter" type="button">Déconnecter</button>
        <button class="btn btn-secondaire" id="ci-fermer" type="button">Fermer</button>
        <button class="btn btn-primaire" id="ci-tester" type="button">Tester &amp; enregistrer</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  document.getElementById('ci-owner').value = ghConfig.owner;
  document.getElementById('ci-repo').value = ghConfig.repo;
  document.getElementById('ci-branch').value = ghConfig.branch;
  document.getElementById('ci-token').value = ghConfig.token;

  document.getElementById('ci-fermer').addEventListener('click', fermerModaleConnexion);
  document.getElementById('ci-deconnecter').addEventListener('click', () => {
    ghConfig.clear();
    ['ci-owner', 'ci-repo', 'ci-branch', 'ci-token'].forEach(id => document.getElementById(id).value = '');
    majPastilleConnexion();
    afficherMessageModale('Déconnecté. Les données seront lues/écrites uniquement en local (démo).', 'alerte-info');
  });
  document.getElementById('ci-tester').addEventListener('click', async () => {
    const owner = document.getElementById('ci-owner').value.trim();
    const repo = document.getElementById('ci-repo').value.trim();
    const branch = document.getElementById('ci-branch').value.trim() || 'main';
    const token = document.getElementById('ci-token').value.trim();
    if (!owner || !repo || !token) {
      afficherMessageModale('Merci de renseigner le compte, le repo et le token.', 'alerte-warn');
      return;
    }
    ghConfig.set(owner, repo, branch, token);
    afficherMessageModale('Test de connexion en cours…', 'alerte-info');
    const ok = await testerConnexion();
    if (ok) {
      afficherMessageModale('Connexion réussie ! Les données seront désormais sauvegardées sur GitHub.', 'alerte-ok');
      majPastilleConnexion();
    } else {
      afficherMessageModale("Échec : vérifiez le nom du repo et les droits du token (Contents: Read and write).", 'alerte-err');
    }
  });
}

function afficherMessageModale(msg, classe) {
  const el = document.getElementById('ci-message');
  el.textContent = msg;
  el.className = 'alerte ' + classe;
  el.style.display = 'block';
}

function ouvrirModaleConnexion() {
  document.getElementById('modale-connexion').style.display = 'flex';
}
function fermerModaleConnexion() {
  document.getElementById('modale-connexion').style.display = 'none';
}

function majPastilleConnexion() {
  const btn = document.getElementById('btn-connexion-donnees');
  if (!btn) return;
  if (ghConfig.isConfigured()) {
    btn.textContent = '🟢 Données : ' + ghConfig.repo;
  } else {
    btn.textContent = '⚪ Données : non connecté';
  }
}
