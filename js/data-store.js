/*
 * Accès haut niveau aux données de l'appli : combine le stockage GitHub
 * (js/github-store.js) et les données de démarrage (js/seed-data.js).
 * Chaque école a son propre fichier => pas de conflit entre directeurs
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
  }
};

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
