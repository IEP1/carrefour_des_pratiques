/*
 * Accès haut niveau aux données de l'appli : combine le stockage Supabase
 * (js/data-backend.js) et les données de démarrage (js/seed-data.js).
 * Chaque école a son propre document => pas de conflit entre directeurs
 * qui travaillent sur des écoles différentes au même moment.
 */

const Store = {
  async chargerConfig() {
    const { data } = await chargerJSON('config.json', SEED_CONFIG);
    return data;
  },
  async sauvegarderConfig(cfg) {
    await sauvegarderJSON('config.json', cfg, 'Mise à jour configuration événement');
  },

  async chargerAteliers() {
    const { data } = await chargerJSON('ateliers.json', SEED_ATELIERS);
    return data;
  },
  async sauvegarderAteliers(liste) {
    await sauvegarderJSON('ateliers.json', liste, 'Mise à jour liste des ateliers');
  },

  async chargerEcoles() {
    const { data } = await chargerJSON('ecoles.json', SEED_ECOLES);
    return data;
  },
  async sauvegarderEcoles(liste) {
    await sauvegarderJSON('ecoles.json', liste, 'Mise à jour liste des écoles');
  },

  async chargerEcole(ecoleId) {
    const secours = (typeof SEED_ENSEIGNANTS_PAR_ECOLE !== 'undefined' && SEED_ENSEIGNANTS_PAR_ECOLE[ecoleId])
      || { enseignants: [] };
    const { data } = await chargerJSON(`ecoles/${ecoleId}.json`, secours);
    return data;
  },
  async sauvegarderEcole(ecoleId, data, nomEcole) {
    await sauvegarderJSON(`ecoles/${ecoleId}.json`, data, `Mise à jour école ${nomEcole || ecoleId}`);
  },

  /** Charge la liste des écoles ET le contenu (enseignants/choix) de chacune. */
  async chargerToutesLesEcolesAvecDonnees() {
    const ecoles = await this.chargerEcoles();
    const resultats = await Promise.all(ecoles.map(async e => ({
      ...e,
      donnees: await this.chargerEcole(e.id)
    })));
    return resultats;
  },

  async chargerRepartition() {
    const { data } = await chargerJSON('repartition.json', null);
    return data;
  },
  async sauvegarderRepartition(rep) {
    await sauvegarderJSON('repartition.json', rep, 'Nouvelle répartition calculée');
  },

  /** Recalcule la répartition à partir de l'état actuel de toutes les écoles et l'enregistre.
   *  Nécessite js/algo.js (calculerRepartition). Sûr à appeler automatiquement à chaque
   *  enregistrement d'école : l'horodatage garantit qu'un enseignant déjà placé ne peut jamais
   *  être "déplacé" par quelqu'un qui remplit plus tard (voir js/algo.js).
   *  Par défaut, respecte le réglage `config.repartirNonInscrits` (persistant) — on peut le
   *  forcer ponctuellement via options.inclureNonInscrits (true/false). */
  async recalculerRepartition(options = {}) {
    const [ateliers, config, ecolesAvecDonnees] = await Promise.all([
      this.chargerAteliers(), this.chargerConfig(), this.chargerToutesLesEcolesAvecDonnees()
    ]);
    const enseignants = [];
    ecolesAvecDonnees.forEach(ec => {
      (ec.donnees.enseignants || []).forEach(ens => enseignants.push({ ...ens, ecoleNom: ec.nom }));
    });
    // Un enseignant qui anime un atelier ne peut pas être aussi participant : il est occupé sur
    // les 3 créneaux à animer le sien. Exclu du roulement, quel que soit son statut de choix.
    const participants = enseignants.filter(e => !estFormateur(e, ateliers));
    if (participants.length === 0) return null;
    const resultat = calculerRepartition(ateliers, config, participants, options);
    resultat.stats.formateurs = enseignants.length - participants.length;
    await this.sauvegarderRepartition(resultat);
    return resultat;
  }
};

/** Normalise un nom pour une comparaison robuste (accents, casse, espaces superflus). */
function normaliserNom(nom) {
  return (nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Vrai si cet enseignant anime un atelier (n'importe lequel, validé ou non) : il ne peut alors
 *  ni faire de choix, ni être placé dans le roulement — il anime le sien sur les 3 créneaux.
 *  Détection par nom (les intervenants d'un atelier sont juste des noms en texte libre). */
function estFormateur(enseignant, ateliers) {
  const nomNorm = normaliserNom(enseignant.nom);
  return (ateliers || []).some(a => (a.intervenants || []).some(i => normaliserNom(i) === nomNorm));
}

function genererIdAtelier(existants) {
  let n = existants.length + 1;
  let id;
  do { id = 'at-' + String(n).padStart(2, '0'); n++; } while (existants.some(a => a.id === id));
  return id;
}

function genererIdEnseignant() {
  return 'ens-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function horodatageMaintenant() {
  return new Date().toISOString();
}
