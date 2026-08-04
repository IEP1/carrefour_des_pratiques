/*
 * Données initiales, extraites de "LISTING DES ATELIERS POSSIBLES.docx" et
 * "Tableau bord circonscription IEP1.xlsx". Servent de point de départ tant
 * qu'aucune donnée n'a encore été enregistrée sur le repo GitHub privé.
 * Modifiables ensuite entièrement depuis l'application.
 */

const SEED_CONFIG = {
  titreEvenement: 'Carrefour des pratiques',
  date: '2026-11-05',
  lieu: 'EEPU Clain - Dumbéa',
  nombreChoix: 5,
  capaciteParDefaut: 20,
  sessions: [
    { id: 1, label: 'Atelier 1', horaire: '8h15 - 9h00' },
    { id: 2, label: 'Atelier 2', horaire: '9h10 - 10h00' },
    { id: 3, label: 'Atelier 3', horaire: '10h15 - 11h00' }
  ]
};

const SEED_ATELIERS = [
  { id: 'at-01', titre: "Odyssée orthographe cycle 1", cycles: ['C1'], intervenants: ['Catherine GERMAIN'], statut: 'a_valider' },
  { id: 'at-02', titre: "Odyssée orthographe cycles 2 et 3", cycles: ['C2', 'C3'], intervenants: ['Anne-Marie EDELINE', 'Ingrid LEROUX'], statut: 'a_valider' },
  { id: 'at-03', titre: "Résolvons des problèmes : 1 jour 1 problème", cycles: ['C1', 'C2', 'C3'], intervenants: ['Cindy VERLAGUET', 'Floriane SOERIA'], statut: 'valide' },
  { id: 'at-04', titre: "Mon quotidien augmenté grâce à l'IA : mes outils, des outils pour les élèves", cycles: ['C3'], intervenants: ['Guillaume MILLOT'], statut: 'valide' },
  { id: 'at-05', titre: "Mon quotidien augmenté grâce à l'IA : mes outils, des outils pour les élèves", cycles: ['C3'], intervenants: ['Frédéric CORDONIN'], statut: 'valide' },
  { id: 'at-06', titre: "Récréa'livres", cycles: ['C3'], intervenants: ['Maude GUERRY'], statut: 'a_valider' },
  { id: 'at-07', titre: "Odyssée de l'orthographe en classe de PS et MS", cycles: ['C1'], intervenants: ['Graziella DUBOIS', 'Anais CAIHE', 'Noémie CAPITAINE'], statut: 'valide' },
  { id: 'at-08', titre: "Manipuler autrement en géométrie : Géogébra au Cycle 3", cycles: ['C3'], intervenants: ['Nadia CAFFA'], statut: 'valide' },
  { id: 'at-09', titre: "Cooking challenge", cycles: ['C2'], intervenants: ['Priscillia BOURGADE'], statut: 'a_valider' },
  { id: 'at-10', titre: "EFCK : la parole", cycles: ['C1', 'C2', 'C3'], intervenants: ['Stacy SELEFEN'], statut: 'a_valider' },
  { id: 'at-11', titre: "Vivre la récréation autrement : les co-pilotes", cycles: ['C2', 'C3'], intervenants: ['Karine GUAGENTI'], statut: 'valide' },
  { id: 'at-12', titre: "Osons entrer en grammaire au CP", cycles: ['C2'], intervenants: ['Laure SCHULER'], statut: 'valide' },
  { id: 'at-13', titre: "Motivons les élèves à l'école en 2026 pour mieux apprendre", cycles: ['C1', 'C2', 'C3'], intervenants: ['Magali COLORAS'], statut: 'valide' },
  { id: 'at-14', titre: "Innover en EPS : envolons-nous avec le Kin-Ball", cycles: ['C1', 'C2', 'C3'], intervenants: ['Nadège REDON'], statut: 'valide' },
  { id: 'at-15', titre: "Innover en EPS : le foot à l'école", cycles: ['C2', 'C3'], intervenants: ['Joseph REDON', 'Lydie SADIMAN'], statut: 'valide' },
  { id: 'at-16', titre: "École du CHT", cycles: ['C1', 'C2', 'C3'], intervenants: ['Sonja TENG'], statut: 'valide' },
  { id: 'at-17', titre: "BEP : salle de régulation dans l'école", cycles: ['C1', 'C2', 'C3'], intervenants: ['Nathalie BACHELIER-CUGGIA'], statut: 'valide' },
  { id: 'at-18', titre: "Narramus", cycles: ['C2'], intervenants: ['Mélodie JAININ', 'Vincent RENAIS'], statut: 'valide' },
  { id: 'at-19', titre: "La production d'écrit en classe de CP", cycles: ['C2'], intervenants: ['Marie-Cécile GUERRINI', 'Vincent RENAIS'], statut: 'valide' },
  { id: 'at-20', titre: "Apprentilangue", cycles: ['C1'], intervenants: ['Morgane BADIE'], statut: 'a_valider' }
];

const SEED_ECOLES = [
  'BARDOU', 'BENEBIG', 'CHT', 'CLAIN', 'DORBRITZ', 'DSMer',
  'EEPU FONG', 'EMPU FONG', 'EEPU MDR', 'EMPU MDR',
  'DILLENSEGER', 'L. DE GRESLAN', 'MAINGUET', 'MYOSOTIS', 'NIAOULIS',
  'OASIS', 'ORANGERS', 'YAHOUE', 'PETUNIAS', 'S. RUSSIER', 'F. SURLEAU',
  'DESED'
].map(nom => ({ id: nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), nom }));
