/*
 * Couche de stockage : lit/écrit les données via la fonction serveur Netlify (/api/data),
 * qui parle elle-même à l'API GitHub avec un token gardé côté serveur (variable d'environnement
 * Netlify — voir netlify/functions/data.js). Plus aucun token ni configuration côté navigateur :
 * l'accès à l'appli se fait uniquement en connaissant le lien du site.
 *
 * API_BASE est vide sur le site déployé (chemins relatifs /api/data). L'outil d'import local
 * (import.html, jamais publié) le renseigne avec l'URL complète du site Netlify pour pouvoir
 * appeler la même fonction depuis un fichier ouvert en local.
 */
function apiBase() {
  return (typeof window !== 'undefined' && window.CDP_API_BASE) || '';
}

/** Lit un fichier JSON. Retourne {data, sha} — sha vaut null si le fichier n'existe pas encore
 *  (dans ce cas data vaut le "fallback" fourni), ou une valeur non-nulle sinon (peu importe
 *  laquelle : le serveur gère lui-même le sha GitHub, le client n'en a plus besoin). */
async function chargerJSON(path, fallback) {
  try {
    const res = await fetch(`${apiBase()}/api/data?path=${encodeURIComponent(path)}`);
    if (res.status === 404) return { data: fallback, sha: null };
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur serveur ${res.status} sur ${path}`);
    }
    const data = await res.json();
    return { data, sha: 'ok' };
  } catch (e) {
    console.error('chargerJSON', path, e);
    throw e;
  }
}

/** Écrit un fichier JSON (le serveur crée ou met à jour, et gère les conflits d'écriture). */
async function sauvegarderJSON(path, data, message) {
  const res = await fetch(`${apiBase()}/api/data?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(message ? { 'X-Message': message } : {}) },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Échec de sauvegarde (${res.status})`);
  }
  return res.json();
}

// Conservés pour compatibilité avec le code existant : avant le proxy serveur, ces fonctions
// vérifiaient qu'un token GitHub était configuré côté navigateur. Ce n'est plus nécessaire.
const ghConfig = { isConfigured: () => true };
async function testerConnexion() {
  try {
    const res = await fetch(`${apiBase()}/api/data?path=config.json`);
    return res.ok || res.status === 404;
  } catch (e) {
    return false;
  }
}
