/*
 * Couche de stockage : lit/écrit les données dans Supabase (table "documents", une ligne par
 * "chemin" — même principe qu'un fichier JSON, mais sans les conflits d'écriture qu'on avait
 * avec GitHub : une même ligne s'écrase proprement, sans jamais renvoyer d'erreur de conflit).
 *
 * La clé ci-dessous n'est PAS un secret : c'est la clé "anon" publique de Supabase, prévue pour
 * tourner côté navigateur. La vraie protection vient des règles d'accès (RLS) définies dans
 * Supabase (SQL Editor), pas de cette clé — elle peut être commitée sans risque.
 */
const SUPABASE_URL = 'https://xregaqwolnrhxghpkkjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZWdhcXdvbG5yaHhnaHBra2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzY5MDIsImV4cCI6MjEwMzkxMjkwMn0.Z3jBdSJdUynS1lM-TiSFK7JMRLbzl66lzhlVRtBfem8';

function entetesSupabase(json) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

/** Lit un document. Retourne {data, sha} — sha vaut null si le document n'existe pas encore
 *  (dans ce cas data vaut le "fallback" fourni), non-null sinon (le client n'a plus besoin d'un
 *  vrai sha, Supabase gère lui-même la cohérence des écritures). */
async function chargerJSON(path, fallback) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/documents?path=eq.${encodeURIComponent(path)}&select=data`;
    const res = await fetch(url, { headers: entetesSupabase(false) });
    if (!res.ok) throw new Error(`Erreur Supabase ${res.status} sur ${path}`);
    const lignes = await res.json();
    if (lignes.length === 0) return { data: fallback, sha: null };
    return { data: lignes[0].data, sha: 'ok' };
  } catch (e) {
    console.error('chargerJSON', path, e);
    throw e;
  }
}

/** Écrit un document (crée ou remplace). */
async function sauvegarderJSON(path, data, message) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: { ...entetesSupabase(true), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ path, data })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Échec de sauvegarde (${res.status})`);
  }
}

// Conservés pour compatibilité avec le code existant (avant Supabase, ces fonctions vérifiaient
// qu'un token GitHub était configuré côté navigateur). L'accès Supabase est toujours disponible.
const ghConfig = { isConfigured: () => true };
async function testerConnexion() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=path&limit=1`, { headers: entetesSupabase(false) });
    return res.ok;
  } catch (e) {
    return false;
  }
}
