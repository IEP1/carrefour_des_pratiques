/*
 * Algorithme de répartition des enseignants sur les ateliers (3 sessions).
 *
 * Règles appliquées :
 * 1. Chaque enseignant doit obtenir 3 ateliers distincts, un par session.
 * 2. On traite les choix par rang (1 à nombreChoix), tous les rangs 1 d'abord,
 *    puis tous les rangs 2, etc. — mais un enseignant bloqué sur un choix
 *    (aucune session dispo pour cet atelier) voit son choix suivant "promu"
 *    au même tour : il ne perd pas de rang à cause d'un atelier complet.
 * 3. Dans un même tour, priorité à l'enseignant qui a rempli ses choix le
 *    plus tôt (horodatage de la première saisie complète).
 * 4. Un enseignant placé sur 3 ateliers sort des calculs.
 * 5. À l'issue des 5 rangs, un enseignant encore incomplet (choix épuisés
 *    ou jamais remplis) est placé sur les ateliers de son cycle les moins
 *    remplis, en tentant d'équilibrer les groupes.
 * 6. Pour une session donnée, on choisit — parmi les sessions encore
 *    disponibles pour cet atelier et cet enseignant — celle qui compte le
 *    moins de participants, afin d'équilibrer les 3 sessions entre elles.
 */

function capaciteAtelier(atelier, config) {
  return atelier.capacite || config.capaciteParDefaut;
}

function calculerRepartition(ateliers, config, enseignants) {
  const sessionIds = config.sessions.map(s => s.id);

  // Places restantes par atelier et par session.
  const restant = {};
  ateliers.forEach(a => {
    restant[a.id] = {};
    sessionIds.forEach(s => { restant[a.id][s] = capaciteAtelier(a, config); });
  });

  // État de chaque enseignant.
  const etat = {};
  enseignants.forEach(e => {
    etat[e.id] = {
      enseignant: e,
      pointeur: 0,           // index courant dans e.choix
      sessions: {},           // sessionId -> atelierId
      atelierIds: new Set(),  // ateliers déjà obtenus (anti-doublon)
      placements: 0
    };
  });

  function sessionsEligibles(ensEtat, atelierId) {
    return sessionIds.filter(s =>
      !ensEtat.sessions[s] && restant[atelierId][s] > 0
    );
  }

  function meilleureSession(atelierId, sessionsDispo) {
    // Celle qui a le moins de participants actuellement (= le plus de places restantes).
    return sessionsDispo.slice().sort((a, b) => restant[atelierId][b] - restant[atelierId][a])[0];
  }

  function placer(ensEtat, atelierId, session) {
    restant[atelierId][session]--;
    ensEtat.sessions[session] = atelierId;
    ensEtat.atelierIds.add(atelierId);
    ensEtat.placements++;
  }

  // ---- Passes par rang de choix (avec promotion immédiate en cas de blocage) ----
  for (let rang = 0; rang < config.nombreChoix; rang++) {
    const aTraiterCeTour = enseignants
      .filter(e => etat[e.id].placements < 3 && etat[e.id].pointeur === rang)
      .sort((a, b) => comparerPriorite(a, b));

    for (const e of aTraiterCeTour) {
      const ensEtat = etat[e.id];
      while (ensEtat.placements < 3 && ensEtat.pointeur < e.choix.length) {
        const atelierId = e.choix[ensEtat.pointeur];
        if (ensEtat.atelierIds.has(atelierId)) { ensEtat.pointeur++; continue; }
        const dispo = sessionsEligibles(ensEtat, atelierId);
        if (dispo.length > 0) {
          placer(ensEtat, atelierId, meilleureSession(atelierId, dispo));
          ensEtat.pointeur++;
          break; // un placement par enseignant par tour ; il repassera au tour suivant si besoin
        } else {
          ensEtat.pointeur++; // choix bloqué -> promotion immédiate du choix suivant, même tour
        }
      }
    }
  }

  // ---- Repli : cycle + équilibrage pour les enseignants encore incomplets ----
  const incomplets = enseignants
    .filter(e => etat[e.id].placements < 3)
    .sort((a, b) => comparerPriorite(a, b));

  for (const e of incomplets) {
    const ensEtat = etat[e.id];
    let tentatives = 0;
    while (ensEtat.placements < 3 && tentatives < ateliers.length * 3 + 10) {
      tentatives++;
      const option = meilleureOptionRepli(e, ensEtat, ateliers, restant, sessionIds);
      if (!option) break; // plus aucune place disponible nulle part
      placer(ensEtat, option.atelierId, option.session);
    }
  }

  return construireResultat(ateliers, config, enseignants, etat, restant);
}

/** Priorité : horodatage le plus ancien d'abord ; sans horodatage = en dernier. */
function comparerPriorite(a, b) {
  if (!a.horodatage && !b.horodatage) return 0;
  if (!a.horodatage) return 1;
  if (!b.horodatage) return -1;
  return new Date(a.horodatage) - new Date(b.horodatage);
}

/** Cherche la meilleure place de repli : priorité au cycle de l'enseignant, puis à l'atelier le moins rempli globalement. */
function meilleureOptionRepli(enseignant, ensEtat, ateliers, restant, sessionIds) {
  const candidats = [];
  const ateliersDuCycle = ateliers.filter(a => !enseignant.cycle || a.cycles.includes(enseignant.cycle));
  const pool = ateliersDuCycle.length > 0 ? ateliersDuCycle : ateliers;

  for (const a of pool) {
    if (ensEtat.atelierIds.has(a.id)) continue;
    for (const s of sessionIds) {
      if (ensEtat.sessions[s]) continue;
      if (restant[a.id][s] <= 0) continue;
      candidats.push({ atelierId: a.id, session: s, restant: restant[a.id][s] });
    }
  }
  if (candidats.length === 0) {
    // Aucune place dans le cycle : on relâche la contrainte de cycle.
    for (const a of ateliers) {
      if (ensEtat.atelierIds.has(a.id)) continue;
      for (const s of sessionIds) {
        if (ensEtat.sessions[s]) continue;
        if (restant[a.id][s] <= 0) continue;
        candidats.push({ atelierId: a.id, session: s, restant: restant[a.id][s] });
      }
    }
  }
  if (candidats.length === 0) return null;
  // On choisit la place la plus remplie (le moins de "restant") pour équilibrer les groupes.
  candidats.sort((x, y) => x.restant - y.restant);
  return candidats[0];
}

function construireResultat(ateliers, config, enseignants, etat, restant) {
  const parSession = {};
  config.sessions.forEach(s => {
    parSession[s.id] = ateliers.map(a => ({
      atelierId: a.id,
      titre: a.titre,
      intervenants: a.intervenants,
      capacite: capaciteAtelier(a, config),
      participants: []
    }));
  });

  const parEnseignant = enseignants.map(e => {
    const ensEtat = etat[e.id];
    config.sessions.forEach(s => {
      const atelierId = ensEtat.sessions[s.id];
      if (atelierId) {
        const groupe = parSession[s.id].find(g => g.atelierId === atelierId);
        groupe.participants.push({ id: e.id, nom: e.nom, ecoleNom: e.ecoleNom });
      }
    });
    return {
      id: e.id, nom: e.nom, ecoleNom: e.ecoleNom, cycle: e.cycle,
      sessions: { ...ensEtat.sessions },
      complet: ensEtat.placements === 3
    };
  });

  return {
    genereLe: new Date().toISOString(),
    parSession,
    parEnseignant,
    stats: {
      totalEnseignants: enseignants.length,
      complets: parEnseignant.filter(e => e.complet).length,
      incomplets: parEnseignant.filter(e => !e.complet).length
    }
  };
}
