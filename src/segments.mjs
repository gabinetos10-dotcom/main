/**
 * Segments de prospection : un nom metier en francais, le mot-cle envoye a
 * Google, et le type Places correspondant quand il en existe un.
 *
 * Le mot-cle seul suffit a l'API ; le type resserre la recherche mais peut etre
 * refuse si Google le retire de sa nomenclature — le collecteur retombe alors
 * automatiquement sur le mot-cle.
 */
export const SEGMENTS = {
  restaurant:      { libelle: 'Restaurants',            requete: 'restaurant',              type: 'restaurant' },
  pizzeria:        { libelle: 'Pizzerias',              requete: 'pizzeria',                type: 'restaurant' },
  brasserie:       { libelle: 'Bars et brasseries',     requete: 'bar brasserie',           type: 'bar' },
  cafe:            { libelle: 'Cafes et salons de the', requete: 'cafe salon de the',       type: 'cafe' },
  boulangerie:     { libelle: 'Boulangeries',           requete: 'boulangerie patisserie',  type: 'bakery' },
  traiteur:        { libelle: 'Traiteurs',              requete: 'traiteur',                type: 'meal_takeaway' },
  boucherie:       { libelle: 'Boucheries',             requete: 'boucherie charcuterie',   type: null },
  primeur:         { libelle: 'Primeurs et epiceries',  requete: 'epicerie primeur',        type: null },
  coiffeur:        { libelle: 'Coiffeurs',              requete: 'salon de coiffure',       type: 'hair_care' },
  barbier:         { libelle: 'Barbiers',               requete: 'barbier',                 type: 'hair_care' },
  esthetique:      { libelle: 'Instituts de beaute',    requete: 'institut de beaute',      type: 'beauty_salon' },
  ongles:          { libelle: 'Onglerie',               requete: 'onglerie manucure',       type: 'nail_salon' },
  massage:         { libelle: 'Massage et spa',         requete: 'spa massage',             type: 'spa' },
  tatoueur:        { libelle: 'Tatoueurs',              requete: 'salon de tatouage',       type: null },
  fleuriste:       { libelle: 'Fleuristes',             requete: 'fleuriste',               type: 'florist' },
  garage:          { libelle: 'Garages auto',           requete: 'garage automobile',       type: 'car_repair' },
  carrosserie:     { libelle: 'Carrossiers',            requete: 'carrosserie',             type: 'car_repair' },
  plombier:        { libelle: 'Plombiers',              requete: 'plombier',                type: 'plumber' },
  electricien:     { libelle: 'Electriciens',           requete: 'electricien',             type: 'electrician' },
  menuisier:       { libelle: 'Menuisiers',             requete: 'menuisier',               type: null },
  macon:           { libelle: 'Maconnerie',             requete: 'macon batiment',          type: null },
  peintre:         { libelle: 'Peintres en batiment',   requete: 'peintre en batiment',     type: 'painter' },
  serrurier:       { libelle: 'Serruriers',             requete: 'serrurier',               type: 'locksmith' },
  paysagiste:      { libelle: 'Paysagistes',            requete: 'paysagiste jardinier',    type: null },
  pressing:        { libelle: 'Pressings',              requete: 'pressing blanchisserie',  type: 'laundry' },
  cordonnier:      { libelle: 'Cordonniers',            requete: 'cordonnerie',             type: null },
  optique:         { libelle: 'Opticiens',              requete: 'opticien',                type: null },
  bijouterie:      { libelle: 'Bijouteries',            requete: 'bijouterie',              type: 'jewelry_store' },
  pretaporter:     { libelle: 'Pret-a-porter',          requete: 'magasin de vetements',    type: 'clothing_store' },
  animalerie:      { libelle: 'Animaleries et toilettage', requete: 'toilettage animalerie', type: 'pet_store' },
  veterinaire:     { libelle: 'Veterinaires',           requete: 'cabinet veterinaire',     type: 'veterinary_care' },
  kine:            { libelle: 'Kinesitherapeutes',      requete: 'kinesitherapeute',        type: null },
  dentiste:        { libelle: 'Dentistes',              requete: 'cabinet dentaire',        type: null },
  immobilier:      { libelle: 'Agences immobilieres',   requete: 'agence immobiliere',      type: 'real_estate_agency' },
  assurance:       { libelle: 'Courtiers et assurances', requete: 'courtier assurance',     type: 'insurance_agency' },
  sport:           { libelle: 'Salles de sport',        requete: 'salle de sport',          type: 'gym' },
  autoecole:       { libelle: 'Auto-ecoles',            requete: 'auto ecole',              type: null },
  hotel:           { libelle: 'Hotels et chambres d\'hotes', requete: 'hotel chambre d\'hotes', type: null },
};

/** Resout une liste de segments demandes en ligne de commande. */
export function resoudreSegments(liste) {
  const cles = String(liste || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const inconnus = cles.filter((c) => !SEGMENTS[c]);
  if (inconnus.length) {
    throw new Error(
      `Segment inconnu : ${inconnus.join(', ')}.\nDisponibles : ${Object.keys(SEGMENTS).join(', ')}`,
    );
  }
  return cles.map((cle) => ({ cle, ...SEGMENTS[cle] }));
}
