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
 * 7. Un enseignant qui n'a fait AUCUN choix (choix vide) n'entre pas dans la
 *    répartition tant que `config.repartirNonInscrits` n'est pas activé.
 *    Une fois activé, ces enseignants sont répartis en tout dernier (repli
 *    uniquement), après TOUS ceux qui ont fait au moins un choix — pour que
 *    ceux qui ont pris la peine de s'inscrire restent toujours prioritaires.
 * 8. Les ateliers au statut "à valider" sont entièrement exclus (répartition
 *    et places disponibles) tant qu'ils ne sont pas confirmés.
 * 9. Quota par école : dans un même atelier, une école ne peut occuper plus
 *    d'une fraction des places (1/2 ou 1/3 selon la taille de l'atelier, voir
 *    quotaEcoleAtelier) — pour éviter qu'une grosse école "monopolise" un
 *    atelier populaire. Directeurs et référents DESED n'y sont pas soumis.
 *    Ce quota n'est qu'une préférence d'équilibrage, pas une vraie place
 *    perdue : si des sièges restent vides faute de candidats hors-quota (un
 *    atelier peu demandé), une dernière passe le lève pour ne rien gâcher.
 */

function capaciteAtelier(atelier, config) {
  return atelier.capacite || config.capaciteParDefaut;
}

/** Un enseignant a "réellement fait des choix" dès qu'il a sélectionné au moins un atelier
 *  (choix complets ou non) — à distinguer de ceux qui n'ont jamais ouvert la grille. */
function aFaitDesChoix(e) {
  return Array.isArray(e.choix) && e.choix.length > 0;
}

const CATEGORIES_SANS_QUOTA_ECOLE = ['DIRECTEUR', 'DESED'];

/** Nombre max d'enseignants d'UNE MÊME école admis dans un atelier, tous créneaux confondus.
 *  1/2 pour les petits ateliers (un tiers y serait trop sévère), 1/3 pour les plus grands,
 *  où laisser une école prendre la moitié des places serait vraiment excessif. */
function quotaEcoleAtelier(atelier, config) {
  const capaciteTotale = capaciteAtelier(atelier, config) * config.sessions.length;
  const ratio = capaciteTotale <= 30 ? 0.5 : (1 / 3);
  return Math.max(1, Math.floor(capaciteTotale * ratio));
}

function calculerRepartition(ateliers, config, enseignants, options = {}) {
  const inclureNonInscrits = options.inclureNonInscrits !== undefined
    ? !!options.inclureNonInscrits
    : !!config.repartirNonInscrits;

  const avecChoix = enseignants.filter(aFaitDesChoix);
  const sansChoix = enseignants.filter(e => !aFaitDesChoix(e));
  const participants = inclureNonInscrits ? avecChoix.concat(sansChoix) : avecChoix;

  // Ateliers "à valider" : hors répartition tant qu'ils ne sont pas confirmés.
  const ateliersValides = ateliers.filter(a => a.statut !== 'a_valider');
  const ateliersParId = {};
  ateliersValides.forEach(a => { ateliersParId[a.id] = a; });

  const sessionIds = config.sessions.map(s => s.id);

  // Places restantes par atelier et par session.
  const restant = {};
  ateliersValides.forEach(a => {
    restant[a.id] = {};
    sessionIds.forEach(s => { restant[a.id][s] = capaciteAtelier(a, config); });
  });

  // Quota par école, par atelier (voir règle 9 ci-dessus).
  const quotaParAtelier = {};
  ateliersValides.forEach(a => { quotaParAtelier[a.id] = quotaEcoleAtelier(a, config); });
  const comptageEcoleAtelier = {}; // atelierId -> { ecoleNom -> nombre déjà placé }

  function estExemptQuotaEcole(enseignant) {
    return CATEGORIES_SANS_QUOTA_ECOLE.includes(enseignant.cycle);
  }
  function quotaEcoleAtteint(atelierId, enseignant, ignorerQuota) {
    if (ignorerQuota || estExemptQuotaEcole(enseignant)) return false;
    const compte = (comptageEcoleAtelier[atelierId] && comptageEcoleAtelier[atelierId][enseignant.ecoleNom]) || 0;
    return compte >= quotaParAtelier[atelierId];
  }
  function incrementerQuotaEcole(atelierId, enseignant) {
    if (estExemptQuotaEcole(enseignant)) return;
    if (!comptageEcoleAtelier[atelierId]) comptageEcoleAtelier[atelierId] = {};
    comptageEcoleAtelier[atelierId][enseignant.ecoleNom] = (comptageEcoleAtelier[atelierId][enseignant.ecoleNom] || 0) + 1;
  }

  // État de chaque enseignant participant à ce calcul.
  const etat = {};
  participants.forEach(e => {
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
  // (seuls les enseignants ayant fait des choix ont quelque chose à traiter ici)
  for (let rang = 0; rang < config.nombreChoix; rang++) {
    const aTraiterCeTour = avecChoix
      .filter(e => etat[e.id].placements < 3 && etat[e.id].pointeur === rang)
      .sort((a, b) => comparerPriorite(a, b));

    for (const e of aTraiterCeTour) {
      const ensEtat = etat[e.id];
      while (ensEtat.placements < 3 && ensEtat.pointeur < e.choix.length) {
        const atelierId = e.choix[ensEtat.pointeur];
        if (ensEtat.atelierIds.has(atelierId)) { ensEtat.pointeur++; continue; }
        if (!ateliersParId[atelierId]) { ensEtat.pointeur++; continue; } // atelier "à valider" : ignoré, comme s'il était complet
        const dispo = sessionsEligibles(ensEtat, atelierId);
        if (dispo.length > 0 && !quotaEcoleAtteint(atelierId, e, false)) {
          placer(ensEtat, atelierId, meilleureSession(atelierId, dispo));
          incrementerQuotaEcole(atelierId, e);
          ensEtat.pointeur++;
          break; // un placement par enseignant par tour ; il repassera au tour suivant si besoin
        } else {
          ensEtat.pointeur++; // choix bloqué (place ou quota école) -> promotion immédiate, même tour
        }
      }
    }
  }

  // ---- Repli : cycle + équilibrage pour les enseignants encore incomplets ----
  // Stade 1 : ceux qui ont fait des choix, toujours prioritaires. Stade 2 (seulement si
  // `inclureNonInscrits`) : ceux qui n'ont rien rempli, placés en tout dernier, sur ce qu'il reste.
  // Stade 3 : le quota école est levé pour ne pas laisser un siège vide faute de candidat éligible
  // (signe que l'atelier était peu demandé) — toujours dans le même ordre de priorité.
  function replier(liste, ignorerQuota) {
    for (const e of liste) {
      const ensEtat = etat[e.id];
      let tentatives = 0;
      while (ensEtat.placements < 3 && tentatives < ateliersValides.length * 3 + 10) {
        tentatives++;
        const option = meilleureOptionRepli(e, ensEtat, ateliersValides, restant, sessionIds, quotaEcoleAtteint, ignorerQuota);
        if (!option) break; // plus aucune place disponible nulle part
        placer(ensEtat, option.atelierId, option.session);
        incrementerQuotaEcole(option.atelierId, e);
      }
    }
  }

  const parPrioriteAvecChoix = () => avecChoix.filter(e => etat[e.id].placements < 3).sort((a, b) => comparerPriorite(a, b));
  const parPrioriteSansChoix = () => sansChoix.filter(e => etat[e.id].placements < 3).sort((a, b) => a.nom.localeCompare(b.nom));

  replier(parPrioriteAvecChoix(), false);
  if (inclureNonInscrits) replier(parPrioriteSansChoix(), false);

  // Passe finale : quota école levé, uniquement pour ceux encore incomplets à ce stade.
  replier(parPrioriteAvecChoix(), true);
  if (inclureNonInscrits) replier(parPrioriteSansChoix(), true);

  return construireResultat(ateliersValides, config, participants, etat, restant, sansChoix, inclureNonInscrits);
}

/** Priorité : horodatage le plus ancien d'abord ; sans horodatage = en dernier. */
function comparerPriorite(a, b) {
  if (!a.horodatage && !b.horodatage) return 0;
  if (!a.horodatage) return 1;
  if (!b.horodatage) return -1;
  return new Date(a.horodatage) - new Date(b.horodatage);
}

const CYCLES_RESTREINTS = ['C1', 'C2', 'C3'];

/** Cherche la meilleure place de repli : priorité au cycle de l'enseignant, puis à l'atelier le moins rempli globalement.
 *  Un enseignant Directeur ou référent DESED n'a pas de cycle propre : il est éligible à tous les ateliers.
 *  `quotaEcoleAtteint` et `ignorerQuota` appliquent le quota par école (voir règle 9 en tête de fichier). */
function meilleureOptionRepli(enseignant, ensEtat, ateliers, restant, sessionIds, quotaEcoleAtteint, ignorerQuota) {
  const candidats = [];
  const sansRestrictionDeCycle = !CYCLES_RESTREINTS.includes(enseignant.cycle);
  const ateliersDuCycle = sansRestrictionDeCycle ? ateliers : ateliers.filter(a => a.cycles.includes(enseignant.cycle));
  const pool = ateliersDuCycle.length > 0 ? ateliersDuCycle : ateliers;

  for (const a of pool) {
    if (ensEtat.atelierIds.has(a.id)) continue;
    if (quotaEcoleAtteint(a.id, enseignant, ignorerQuota)) continue;
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
      if (quotaEcoleAtteint(a.id, enseignant, ignorerQuota)) continue;
      for (const s of sessionIds) {
        if (ensEtat.sessions[s]) continue;
        if (restant[a.id][s] <= 0) continue;
        candidats.push({ atelierId: a.id, session: s, restant: restant[a.id][s] });
      }
    }
  }
  if (candidats.length === 0) return null;
  // On choisit la place la MOINS remplie (le plus de "restant"), comme pour les choix classés :
  // équilibrer signifie répartir entre les 3 créneaux, pas empiler tout le monde sur le même.
  candidats.sort((x, y) => y.restant - x.restant);
  return candidats[0];
}

function construireResultat(ateliers, config, enseignants, etat, restant, sansChoix = [], nonInscritsInclus = false) {
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

  // Ordre alphabétique par nom dans chaque groupe (plus pratique pour retrouver quelqu'un
  // sur une feuille d'émargement que l'ordre de traitement, qui regroupait par école).
  Object.values(parSession).forEach(groupes => {
    groupes.forEach(g => g.participants.sort((a, b) => a.nom.localeCompare(b.nom)));
  });

  return {
    genereLe: new Date().toISOString(),
    parSession,
    parEnseignant,
    // Enseignants n'ayant fait aucun choix : toujours listés pour info, qu'ils aient été
    // intégrés à la répartition ci-dessus ou non (voir stats.nonInscritsInclus).
    nonInscrits: sansChoix.map(e => ({ id: e.id, nom: e.nom, ecoleNom: e.ecoleNom })),
    stats: {
      totalEnseignants: enseignants.length,
      complets: parEnseignant.filter(e => e.complet).length,
      incomplets: parEnseignant.filter(e => !e.complet).length,
      sansChoix: sansChoix.length,
      nonInscritsInclus
    }
  };
}
