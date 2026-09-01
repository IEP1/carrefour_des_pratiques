/* En-tête commun, injecté sur chaque page. Plus de bouton/modale de connexion : l'accès aux
 * données passe par la fonction serveur Netlify (/api/data), sans configuration côté navigateur. */

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
    </header>
  `;
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
