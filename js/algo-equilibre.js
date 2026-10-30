/*
 * Répartition ÉQUILIBRÉE des enseignants sur les ateliers (remplace js/algo.js dans le calcul).
 *
 * Règles dures (jamais violées, vérifiées par verifierRepartition après chaque calcul) :
 *  - chaque enseignant est dans UN SEUL atelier par créneau (jamais deux le même créneau) ;
 *  - un enseignant ne suit jamais deux fois le même atelier ;
 *  - un atelier ne dépasse jamais sa capacité, et n'accueille personne sur un créneau fermé.
 * Objectifs, par ordre d'importance :
 *  1. au moins `config.minParAtelier` enseignants (10 par défaut) dans chaque atelier ouvert sur un créneau ;
 *  2. respecter au mieux les vœux (rang 1 > rang 2 > … > hors vœux), les premiers inscrits étant légèrement favorisés.
 * Les ateliers peu demandés sont automatiquement ouverts sur 2 créneaux seulement (voir choisirFermetures) :
 * l'algorithme en ferme un à la fois, en commençant par les moins demandés, tant que cela améliore le résultat,
 * et étale les fermetures sur des créneaux différents (les intervenants ne sont pas tous libérés en même temps).
 * Les intervenants libérés ne sont pas replacés : ils restent hors roulement (voir estFormateur,
 * js/data-store.js) et choisissent eux-mêmes où aller.
 *
 * Méthode : construction gloutonne (tous les vœux n°1 d'abord, comme js/algo.js) puis recuit simulé
 * déterministe (graine fixe : mêmes données => même résultat).
 * Contrairement à js/algo.js, le quota par école et par atelier n'est pas appliqué : le minimum par groupe prime.
 */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const MIN_PAR_ATELIER_DEFAUT = 10;
const COUT_RANG = [0, 2, 5, 9, 14];   // coût d'avoir son vœu n°1 … n°5
const COUT_HORS_VOEUX = 40;           // placé sur un atelier qu'il n'a pas demandé
const COUT_HORS_CYCLE = 25;           // … en plus, atelier non prévu pour son cycle
const PENALITE_MANQUE = 50;           // par enseignant manquant sous le minimum d'un groupe

const ITERATIONS_RECHERCHE = 150000;  // calculs d'essai (choix des fermetures), plus rapides que le calcul final
const ECHECS_AVANT_ARRET = 2;         // on arrête de fermer des ateliers après 2 essais sans amélioration
const GAIN_RELATIF = 0.05;            // une fermeture n'est retenue que si elle améliore la note d'au moins 5 %

/** Choisit quels ateliers n'ouvrir que sur 2 créneaux : { atelierId: [sessionId fermé] }.
 *  On essaie de fermer les ateliers du moins demandé au plus demandé, un par un ; chaque fermeture est retenue
 *  seulement si elle améliore la note (groupes sous le minimum d'abord, puis satisfaction des vœux). Le créneau
 *  fermé est toujours celui qui compte le moins de fermetures : elles sont étalées sur tous les créneaux. */
function choisirFermetures(valides, config, enseignants, options) {
  const sessionIds = config.sessions.map(s => s.id);
  if (sessionIds.length < 2) return {};
  const demande = {};
  valides.forEach(a => { demande[a.id] = 0; });
  enseignants.forEach(e => new Set(e.choix || []).forEach(id => { if (id in demande) demande[id]++; }));
  const ordre = valides.map((a, i) => ({ a, i })).sort((x, y) => demande[x.a.id] - demande[y.a.id] || x.i - y.i).map(x => x.a);

  const essai = { ...options, iterations: ITERATIONS_RECHERCHE };
  const noter = f => {
    const r = resoudreEquilibre(valides, config, enseignants, essai, f);
    return r.erreur ? Infinity : r.stats.equilibre.note;
  };
  let fermetures = {}, meilleure = noter(fermetures), echecs = 0;
  const nbFermes = sessionIds.map(() => 0);
  for (const a of ordre) {
    if (echecs >= ECHECS_AVANT_ARRET) break;
    const si = nbFermes.indexOf(Math.min(...nbFermes));
    const essaiFermetures = { ...fermetures, [a.id]: [sessionIds[si]] };
    const note = noter(essaiFermetures);
    if (note < meilleure * (1 - GAIN_RELATIF)) { fermetures = essaiFermetures; meilleure = note; nbFermes[si]++; echecs = 0; }
    else echecs++;
  }
  return fermetures;
}

function calculerRepartitionEquilibree(ateliers, config, enseignants, options = {}) {
  const debut = Date.now();
  const valides = ateliers.filter(a => a.statut !== 'a_valider');
  const fermetures = options.fermetures || choisirFermetures(valides, config, enseignants, options);
  const resultat = resoudreEquilibre(valides, config, enseignants, options, fermetures);
  if (resultat.erreur) return resultat;

  const violations = verifierRepartition(resultat, valides, config);
  if (violations.length > 0) {
    return { erreur: 'Contrôle des règles échoué : ' + violations.slice(0, 5).join(' ; ') };
  }
  resultat.stats.equilibre.dureeMs = Date.now() - debut;
  return resultat;
}

function resoudreEquilibre(valides, config, enseignants, options, fermetures) {
  const sessionIds = config.sessions.map(s => s.id);
  const S = sessionIds.length;
  const minGroupe = options.minParGroupe ?? config.minParAtelier ?? MIN_PAR_ATELIER_DEFAUT;
  const coutRang = options.coutRang || COUT_RANG;
  const coutHors = options.coutHors ?? COUT_HORS_VOEUX;
  const coutHorsCycle = options.coutHorsCycle ?? COUT_HORS_CYCLE;
  const inclureNonInscrits = options.inclureNonInscrits !== undefined ? !!options.inclureNonInscrits : !!config.repartirNonInscrits;

  // ---- Ateliers ----
  const A = valides.length;
  const idxAtelier = {}; valides.forEach((a, i) => { idxAtelier[a.id] = i; });
  const hi = valides.map(a => capaciteAtelier(a, config));
  const ouvert = valides.map(a => sessionIds.map(s => !(fermetures[a.id] || []).includes(s)));
  const lo = valides.map((a, i) => ouvert[i].map(o => o ? minGroupe : 0));

  // ---- Enseignants participants (les intervenants sont déjà exclus en amont) ----
  const aChoixUtile = e => Array.isArray(e.choix) && e.choix.some(id => idxAtelier[id] !== undefined);
  const T = [];                                              // { e, choix:[indice d'atelier…], utile }
  const sansChoix = [];
  enseignants.forEach(e => {
    const utile = aChoixUtile(e);
    if (!utile) { sansChoix.push(e); if (!inclureNonInscrits) return; }
    T.push({ e, utile, choix: (e.choix || []).map(id => idxAtelier[id]).filter(i => i !== undefined) });
  });
  // priorité = ordre d'enregistrement (les sans-horodatage en dernier)
  T.sort((x, y) => {
    const hx = x.e.horodatage ? Date.parse(x.e.horodatage) : Infinity;
    const hy = y.e.horodatage ? Date.parse(y.e.horodatage) : Infinity;
    return hx === hy ? 0 : hx - hy;
  });
  const nT = T.length;
  const poids = T.map((t, i) => 1.5 - 0.75 * (nT > 1 ? i / (nT - 1) : 0));   // 1,5 (premier inscrit) … 0,75 (dernier)

  // ---- Coûts ----
  const cout = T.map(t => {
    const ligne = new Array(A).fill(0);
    for (let a = 0; a < A; a++) {
      const r = t.choix.indexOf(a);
      if (r >= 0) ligne[a] = coutRang[Math.min(r, coutRang.length - 1)];
      else {
        let c = coutHors;
        const cyc = t.e.cycle;
        if (CYCLES_RESTREINTS.includes(cyc) && !(valides[a].cycles || []).includes(cyc)) c += coutHorsCycle;
        ligne[a] = c;
      }
    }
    return ligne;
  });

  // ---- Capacité globale par créneau ----
  const capaCreneau = sessionIds.map((s, si) => valides.reduce((somme, a, i) => somme + (ouvert[i][si] ? hi[i] : 0), 0));
  const minCreneau = sessionIds.map((s, si) => valides.reduce((somme, a, i) => somme + lo[i][si], 0));
  const verifs = sessionIds.map((s, si) => ({ creneau: s, enseignants: nT, placesMin: minCreneau[si], placesMax: capaCreneau[si] }));
  if (capaCreneau.some(c => nT > c)) {
    const creneau = sessionIds[capaCreneau.findIndex(c => nT > c)];
    return { erreur: `Capacité insuffisante : ${nT} enseignants à placer mais pas assez de places au créneau ${creneau} (ateliers fermés ou capacités trop basses).`, verifs };
  }

  // ---- État ----
  const aff = T.map(() => new Array(S).fill(-1));            // atelier de chaque enseignant sur chaque créneau
  const n = valides.map(() => new Array(S).fill(0));
  const utilise = (ti, a, sauf) => { for (let s = 0; s < S; s++) if (s !== sauf && aff[ti][s] === a) return true; return false; };

  // Construction initiale : même esprit que js/algo.js — tous les vœux n°1 d'abord (par ordre
  // d'inscription), puis les n°2, etc. ; le créneau choisi est celui où l'atelier est le moins rempli.
  for (let r = 0; r < 5; r++) {
    for (let ti = 0; ti < nT; ti++) {
      const a = T[ti].choix[r];
      if (a === undefined || utilise(ti, a, -1)) continue;
      let bestS = -1, reste = -1;
      for (let s = 0; s < S; s++) {
        if (aff[ti][s] !== -1 || !ouvert[a][s] || n[a][s] >= hi[a]) continue;
        const rr = hi[a] - n[a][s];
        if (rr > reste) { reste = rr; bestS = s; }
      }
      if (bestS >= 0) { aff[ti][bestS] = a; n[a][bestS]++; }
    }
  }
  // Créneaux restants : meilleur atelier disponible (vœu restant, sinon atelier du cycle, le moins rempli)
  for (let s = 0; s < S; s++) {
    for (let ti = 0; ti < nT; ti++) {
      if (aff[ti][s] !== -1) continue;
      let meilleurAtelier = -1, mc = Infinity;
      for (let a = 0; a < A; a++) {
        if (!ouvert[a][s] || n[a][s] >= hi[a] || utilise(ti, a, s)) continue;
        const c = cout[ti][a] + 0.05 * n[a][s];
        if (c < mc) { mc = c; meilleurAtelier = a; }
      }
      if (meilleurAtelier >= 0) { aff[ti][s] = meilleurAtelier; n[meilleurAtelier][s]++; }
    }
  }

  // ---- Recuit simulé ----
  const rnd = mulberry32(options.graine ?? 20261104);
  const P = options.penaliteManque ?? PENALITE_MANQUE;
  const manque = (a, s, dn) => Math.max(0, lo[a][s] - (n[a][s] + dn)) - Math.max(0, lo[a][s] - n[a][s]);
  const totalManqueRapide = () => {
    let m = 0;
    for (let a = 0; a < A; a++) for (let s = 0; s < S; s++) { const d = lo[a][s] - n[a][s]; if (d > 0) m += d; }
    return m;
  };
  let totalManque = totalManqueRapide();
  let E = 0;
  for (let ti = 0; ti < nT; ti++) for (let s = 0; s < S; s++) if (aff[ti][s] >= 0) E += poids[ti] * cout[ti][aff[ti][s]];
  E += P * totalManque;
  let meilleurE = Infinity, meilleurAff = null;
  const copie = () => aff.map(l => l.slice());
  if (totalManque === 0) { meilleurE = E; meilleurAff = copie(); }

  const iterations = options.iterations ?? (400000 + 2000 * nT);
  const T0 = options.temperatureInitiale ?? 8, T1 = 0.05;
  const cleManque = () => { const l = []; for (let a = 0; a < A; a++) for (let s = 0; s < S; s++) if (n[a][s] < lo[a][s]) l.push([a, s]); return l; };

  for (let it = 0; it < iterations; it++) {
    const temp = T0 * Math.pow(T1 / T0, it / iterations);
    let dE = 0, appliquer = null;
    const type = rnd();
    if (type < 0.45) {
      // M1 : un enseignant change d'atelier sur un créneau
      const ti = (rnd() * nT) | 0;
      const s = (rnd() * S) | 0;
      const a = aff[ti][s]; const b = (rnd() * A) | 0;
      if (a < 0 || b === a || !ouvert[b][s] || n[b][s] >= hi[b] || utilise(ti, b, s)) continue;
      dE = poids[ti] * (cout[ti][b] - cout[ti][a]) + P * (manque(a, s, -1) + manque(b, s, +1));
      appliquer = () => { aff[ti][s] = b; n[a][s]--; n[b][s]++; };
    } else if (type < 0.72) {
      // M2 : deux enseignants échangent leurs ateliers sur un créneau
      const t1 = (rnd() * nT) | 0, t2 = (rnd() * nT) | 0;
      if (t1 === t2) continue;
      const s = (rnd() * S) | 0;
      const a = aff[t1][s], b = aff[t2][s];
      if (a < 0 || b < 0 || a === b || utilise(t1, b, s) || utilise(t2, a, s)) continue;
      dE = poids[t1] * (cout[t1][b] - cout[t1][a]) + poids[t2] * (cout[t2][a] - cout[t2][b]);
      appliquer = () => { aff[t1][s] = b; aff[t2][s] = a; };
    } else if (type < 0.82) {
      // M3 : un enseignant permute deux de ses créneaux (change la répartition par créneau, pas ses ateliers)
      const ti = (rnd() * nT) | 0;
      const s1 = (rnd() * S) | 0;
      const s2 = (rnd() * S) | 0;
      if (s1 === s2) continue;
      const a1 = aff[ti][s1], a2 = aff[ti][s2];
      if (a1 < 0 || a2 < 0 || !ouvert[a1][s2] || !ouvert[a2][s1]) continue;
      if (n[a1][s2] + 1 > hi[a1] || n[a2][s1] + 1 > hi[a2]) continue;
      dE = P * (manque(a1, s1, -1) + manque(a1, s2, +1) + manque(a2, s2, -1) + manque(a2, s1, +1));
      appliquer = () => { aff[ti][s1] = a2; aff[ti][s2] = a1; n[a1][s1]--; n[a1][s2]++; n[a2][s2]--; n[a2][s1]++; };
    } else {
      // M4 guidé : combler un groupe sous le minimum avec un enseignant pris dans un groupe au-dessus du minimum
      if (totalManque === 0) continue;
      const l = cleManque(); const [b, s] = l[(rnd() * l.length) | 0];
      const ti = (rnd() * nT) | 0;
      const a = aff[ti][s];
      if (a < 0 || a === b || n[a][s] <= lo[a][s] || n[b][s] >= hi[b] || utilise(ti, b, s)) continue;
      dE = poids[ti] * (cout[ti][b] - cout[ti][a]) + P * (manque(a, s, -1) + manque(b, s, +1));
      appliquer = () => { aff[ti][s] = b; n[a][s]--; n[b][s]++; };
    }
    if (dE <= 0 || rnd() < Math.exp(-dE / temp)) {
      appliquer();
      E += dE;
      totalManque = totalManqueRapide();
      if (totalManque === 0 && E < meilleurE - 1e-9) { meilleurE = E; meilleurAff = copie(); }
    }
  }

  // On retient la meilleure solution sans groupe sous le minimum ; à défaut, l'état final.
  const final = meilleurAff || aff;
  const nFinal = valides.map(() => new Array(S).fill(0));
  final.forEach(l => l.forEach((a, s) => { if (a >= 0) nFinal[a][s]++; }));
  const sousMinimum = [];
  for (let a = 0; a < A; a++) for (let s = 0; s < S; s++) {
    if (ouvert[a][s] && nFinal[a][s] < minGroupe) sousMinimum.push({ atelierId: valides[a].id, creneau: sessionIds[s], effectif: nFinal[a][s] });
  }

  // ---- Résultat (même forme que calculerRepartition, avec en plus les créneaux fermés) ----
  const parSession = {};
  sessionIds.forEach((sid, si) => {
    parSession[sid] = valides.map((a, i) => ({
      atelierId: a.id, titre: a.titre, intervenants: a.intervenants, capacite: hi[i], ferme: !ouvert[i][si], participants: []
    }));
  });
  const rangsObtenus = [];
  const parEnseignant = T.map((t, ti) => {
    const sessions = {}; const rangs = [];
    final[ti].forEach((a, si) => {
      if (a < 0) return;
      sessions[sessionIds[si]] = valides[a].id;
      parSession[sessionIds[si]][a].participants.push({ id: t.e.id, nom: t.e.nom, ecoleNom: t.e.ecoleNom });
      const r = t.choix.indexOf(a); rangs.push(r >= 0 ? r + 1 : 0);
    });
    rangsObtenus.push(rangs);
    return { id: t.e.id, nom: t.e.nom, ecoleNom: t.e.ecoleNom, cycle: t.e.cycle, sessions, complet: Object.keys(sessions).length === S };
  });
  Object.values(parSession).forEach(gs => gs.forEach(g => g.participants.sort((x, y) => x.nom.localeCompare(y.nom))));

  let coutVoeux = 0, manqueFinal = 0;
  final.forEach((l, ti) => l.forEach(a => { if (a >= 0) coutVoeux += poids[ti] * cout[ti][a]; }));
  sousMinimum.forEach(m => { manqueFinal += minGroupe - m.effectif; });

  const fermes = [];
  valides.forEach((a, i) => sessionIds.forEach((sid, si) => {
    if (!ouvert[i][si]) fermes.push({ atelierId: a.id, titre: a.titre, intervenants: a.intervenants, creneau: sid });
  }));

  return {
    genereLe: new Date().toISOString(),
    parSession, parEnseignant, fermes,
    nonInscrits: sansChoix.map(e => ({ id: e.id, nom: e.nom, ecoleNom: e.ecoleNom })),
    stats: {
      totalEnseignants: T.length,
      complets: parEnseignant.filter(e => e.complet).length,
      incomplets: parEnseignant.filter(e => !e.complet).length,
      sansChoix: sansChoix.length, nonInscritsInclus: inclureNonInscrits,
      equilibre: {
        minParGroupe: minGroupe, sousMinimum, note: Math.round((manqueFinal * 1000 + coutVoeux) * 100) / 100,
        satisfaction: calculerSatisfaction(T, rangsObtenus),
        iterations, energie: Math.round((meilleurE === Infinity ? E : meilleurE) * 100) / 100
      }
    },
    verifs
  };
}

/** Part des enseignants (ayant fait des choix) qui ont obtenu leur vœu n°1, n°2, n°3 sur l'un de leurs créneaux,
 *  et nombre de placements hors vœux. `rangsObtenus[i]` : rang de vœu (1…) de chaque placement, 0 si hors vœux. */
function calculerSatisfaction(T, rangsObtenus) {
  const pct = [];
  for (let r = 1; r <= 3; r++) {
    let concernes = 0, obtenus = 0;
    T.forEach((t, i) => {
      if (!t.utile || t.choix.length < r) return;
      concernes++;
      if (rangsObtenus[i].includes(r)) obtenus++;
    });
    pct.push(concernes > 0 ? Math.round(100 * obtenus / concernes) : null);
  }
  const valeurs = pct.filter(p => p !== null);
  return {
    voeu1: pct[0], voeu2: pct[1], voeu3: pct[2],
    moyenne: valeurs.length > 0 ? Math.round(valeurs.reduce((s, p) => s + p, 0) / valeurs.length) : null,
    horsVoeux: rangsObtenus.reduce((s, rangs) => s + rangs.filter(r => r === 0).length, 0)
  };
}

/** Contrôle indépendant des règles fondamentales sur un résultat : renvoie la liste des violations (vide = tout est bon).
 *  Ne se fie qu'au résultat produit, pas à l'état interne du calcul. */
function verifierRepartition(resultat, ateliersValides, config) {
  const violations = [];
  const sessionIds = config.sessions.map(s => s.id);
  const atelierParId = {}; ateliersValides.forEach(a => { atelierParId[a.id] = a; });

  sessionIds.forEach(sid => {
    const vus = new Set();
    resultat.parSession[sid].forEach(g => {
      if (g.participants.length > g.capacite) violations.push(`${g.titre} dépasse sa capacité au créneau ${sid}`);
      if (g.ferme && g.participants.length > 0) violations.push(`${g.titre} a des participants au créneau ${sid} alors qu'il est fermé`);
      g.participants.forEach(p => {
        if (vus.has(p.id)) violations.push(`${p.nom} est dans deux ateliers au créneau ${sid}`);
        vus.add(p.id);
      });
    });
  });
  resultat.parEnseignant.forEach(e => {
    const ateliersVus = new Set();
    Object.entries(e.sessions).forEach(([sid, atelierId]) => {
      if (!atelierParId[atelierId]) violations.push(`${e.nom} est placé sur un atelier inconnu ou non validé`);
      if (ateliersVus.has(atelierId)) violations.push(`${e.nom} suit deux fois le même atelier`);
      ateliersVus.add(atelierId);
      const groupe = (resultat.parSession[sid] || []).find(g => g.atelierId === atelierId);
      if (!groupe || !groupe.participants.some(p => p.id === e.id)) violations.push(`${e.nom} : incohérence entre sa fiche et le créneau ${sid}`);
    });
  });
  return violations;
}
