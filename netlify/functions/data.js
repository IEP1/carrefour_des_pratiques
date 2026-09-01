/*
 * Proxy serveur entre l'appli et le repo GitHub privé de données.
 *
 * Le token GitHub (variable d'environnement Netlify, jamais exposé au navigateur) est utilisé
 * ici pour lire/écrire les fichiers JSON. Le client n'a plus aucun secret à gérer : l'accès à
 * l'appli se fait uniquement en connaissant le lien du site.
 *
 * Variables d'environnement Netlify requises (Site settings → Environment variables) :
 *   GH_DATA_OWNER  - compte/organisation GitHub (ex: IEP1)
 *   GH_DATA_REPO   - nom du repo privé de données
 *   GH_DATA_BRANCH - branche (ex: main)
 *   GH_DATA_TOKEN  - fine-grained PAT, portée Contents: Read and write, limité à ce repo
 *
 * Appel : GET /api/data?path=ecoles/clain.json  → renvoie le JSON du fichier
 *         PUT /api/data?path=ecoles/clain.json  (corps = JSON) → écrit le fichier
 *         En-tête optionnel X-Message pour un message de commit descriptif.
 */

const GITHUB_API = 'https://api.github.com';

const ENTETES_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Message'
};

function reponseJSON(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...ENTETES_CORS },
    body: JSON.stringify(body)
  };
}

function b64Encode(str) { return Buffer.from(str, 'utf-8').toString('base64'); }
function b64Decode(str) { return Buffer.from(str, 'base64').toString('utf-8'); }

// N'autorise que des chemins de fichiers JSON relatifs, sans remontée de dossier.
function cheminValide(path) {
  return typeof path === 'string' && /^[a-zA-Z0-9_\-\/]+\.json$/.test(path) && !path.includes('..');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: ENTETES_CORS, body: '' };

  const owner = process.env.GH_DATA_OWNER;
  const repo = process.env.GH_DATA_REPO;
  const branch = process.env.GH_DATA_BRANCH || 'main';
  const token = process.env.GH_DATA_TOKEN;
  if (!owner || !repo || !token) {
    return reponseJSON(500, { error: "Configuration serveur incomplète (variables d'environnement Netlify manquantes)." });
  }

  const path = event.queryStringParameters && event.queryStringParameters.path;
  if (!cheminValide(path)) return reponseJSON(400, { error: 'Chemin invalide.' });

  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const ghHeaders = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'carrefour-des-pratiques-proxy'
  };

  try {
    if (event.httpMethod === 'GET') {
      const res = await fetch(`${url}?ref=${branch}`, { headers: ghHeaders });
      if (res.status === 404) return reponseJSON(404, { error: 'Introuvable' });
      if (!res.ok) return reponseJSON(res.status, { error: `Erreur GitHub ${res.status}` });
      const json = await res.json();
      const contenu = b64Decode(json.content.replace(/\n/g, ''));
      return reponseJSON(200, JSON.parse(contenu));
    }

    if (event.httpMethod === 'PUT') {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return reponseJSON(400, { error: 'Corps JSON invalide.' }); }
      const message = (event.headers && (event.headers['x-message'] || event.headers['X-Message'])) || `Mise à jour ${path}`;

      // Jusqu'à 3 tentatives en cas de conflit (409) : on relit le sha courant à chaque essai.
      for (let tentative = 0; tentative < 3; tentative++) {
        let sha = null;
        const resLecture = await fetch(`${url}?ref=${branch}`, { headers: ghHeaders });
        if (resLecture.ok) sha = (await resLecture.json()).sha;

        const body = { message, content: b64Encode(JSON.stringify(data, null, 2)), branch };
        if (sha) body.sha = sha;

        const resEcriture = await fetch(url, { method: 'PUT', headers: ghHeaders, body: JSON.stringify(body) });
        if (resEcriture.ok) return reponseJSON(200, { ok: true });
        if (resEcriture.status !== 409) {
          const err = await resEcriture.json().catch(() => ({}));
          return reponseJSON(resEcriture.status, { error: err.message || `Échec (${resEcriture.status})` });
        }
        // 409 : quelqu'un d'autre a écrit entre-temps, on boucle avec le sha à jour.
      }
      return reponseJSON(409, { error: 'Conflit persistant après plusieurs tentatives, réessayez.' });
    }

    return reponseJSON(405, { error: 'Méthode non supportée.' });
  } catch (e) {
    return reponseJSON(500, { error: e.message });
  }
};
