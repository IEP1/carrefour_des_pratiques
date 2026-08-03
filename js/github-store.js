/*
 * Couche de stockage : lit/écrit les données de l'appli dans un repo GitHub
 * privé, via l'API REST "contents". Chaque école a son propre fichier JSON
 * pour éviter les conflits d'écriture entre directeurs qui travaillent en
 * même temps sur des écoles différentes.
 *
 * Le token (Personal Access Token à portée restreinte au repo de données)
 * est saisi une fois par appareil et reste uniquement dans le localStorage
 * du navigateur — il n'est jamais transmis ailleurs qu'à api.github.com.
 */
const GH_API = 'https://api.github.com';

const ghConfig = {
  get owner() { return localStorage.getItem('cdp_data_owner') || ''; },
  get repo() { return localStorage.getItem('cdp_data_repo') || ''; },
  get branch() { return localStorage.getItem('cdp_data_branch') || 'main'; },
  get token() { return localStorage.getItem('cdp_data_token') || ''; },
  set(owner, repo, branch, token) {
    localStorage.setItem('cdp_data_owner', owner);
    localStorage.setItem('cdp_data_repo', repo);
    localStorage.setItem('cdp_data_branch', branch || 'main');
    localStorage.setItem('cdp_data_token', token);
  },
  clear() {
    ['cdp_data_owner', 'cdp_data_repo', 'cdp_data_branch', 'cdp_data_token'].forEach(k => localStorage.removeItem(k));
  },
  isConfigured() { return !!(this.owner && this.repo && this.token); }
};

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}
function b64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

async function ghRequest(path, options = {}) {
  if (!ghConfig.isConfigured()) throw new Error('Stockage des données non connecté — cliquez sur ⚙ Données en haut de page pour renseigner le repo GitHub privé.');
  const url = `${GH_API}/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${ghConfig.token}`,
      ...(options.headers || {})
    }
  });
  return res;
}

/** Lit un fichier JSON du repo de données. Retourne {data, sha} ou {data: fallback, sha: null} si absent. */
async function chargerJSON(path, fallback) {
  if (!ghConfig.isConfigured()) return { data: fallback, sha: null };
  try {
    const res = await ghRequest(`${path}?ref=${ghConfig.branch}`);
    if (res.status === 404) return { data: fallback, sha: null };
    if (!res.ok) throw new Error(`Erreur GitHub ${res.status} sur ${path}`);
    const json = await res.json();
    const contenu = b64DecodeUnicode(json.content.replace(/\n/g, ''));
    return { data: JSON.parse(contenu), sha: json.sha };
  } catch (e) {
    console.error('chargerJSON', path, e);
    throw e;
  }
}

/** Écrit un fichier JSON dans le repo de données (crée ou met à jour). */
async function sauvegarderJSON(path, data, message) {
  if (!ghConfig.isConfigured()) throw new Error('Stockage des données non connecté — cliquez sur ⚙ Données en haut de page pour renseigner le repo GitHub privé.');
  // On relit le sha juste avant d'écrire pour limiter les conflits (dernier écrit gagne sinon 409).
  let sha = null;
  try {
    const res = await ghRequest(`${path}?ref=${ghConfig.branch}`);
    if (res.ok) sha = (await res.json()).sha;
  } catch (e) { /* fichier probablement inexistant, on le crée */ }

  const body = {
    message: message || `Mise à jour ${path}`,
    content: b64EncodeUnicode(JSON.stringify(data, null, 2)),
    branch: ghConfig.branch
  };
  if (sha) body.sha = sha;

  const res = await ghRequest(path, { method: 'PUT', body: JSON.stringify(body) });
  if (res.status === 409) {
    throw new Error('CONFLIT: quelqu\'un d\'autre vient de modifier ce fichier. Rechargez la page et recommencez.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Échec de sauvegarde (${res.status}) : ${err.message || ''}`);
  }
  return res.json();
}

async function testerConnexion() {
  if (!ghConfig.isConfigured()) return false;
  try {
    const res = await fetch(`${GH_API}/repos/${ghConfig.owner}/${ghConfig.repo}`, {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${ghConfig.token}` }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
