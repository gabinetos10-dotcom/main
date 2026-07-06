// Fleet catalogue used to seed the database on first run.
// Swap `image` paths for real photography when available.

export type FleetSeed = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  seats: number;
  power: string;
  transmission: string;
  acceleration: string;
  image: string;
  tagline: string;
  description: string;
  featured: boolean;
};

export const FLEET: FleetSeed[] = [
  {
    slug: "mercedes-amg-a45s",
    name: "AMG A45 S",
    brand: "Mercedes-AMG",
    category: "Compacte Sport",
    pricePerDay: 349,
    seats: 5,
    power: "421 ch",
    transmission: "Automatique",
    acceleration: "3.9s",
    image: "/cars/a45s.svg",
    tagline: "La compacte la plus radicale de sa génération.",
    description:
      "Quatre cylindres, 421 chevaux, transmission intégrale 4MATIC+. L'A45 S transforme chaque trajet dans Paris en expérience pure.",
    featured: true,
  },
  {
    slug: "bmw-m4-competition",
    name: "M4 Competition",
    brand: "BMW",
    category: "Coupé Sport",
    pricePerDay: 449,
    seats: 4,
    power: "510 ch",
    transmission: "Automatique",
    acceleration: "3.5s",
    image: "/cars/m4.svg",
    tagline: "Le coupé qui ne dort jamais.",
    description:
      "Six cylindres en ligne biturbo, châssis affûté, présence magnétique. La M4 Competition est taillée pour les nuits parisiennes.",
    featured: true,
  },
  {
    slug: "audi-rs3-sportback",
    name: "RS3 Sportback",
    brand: "Audi",
    category: "Compacte Sport",
    pricePerDay: 329,
    seats: 5,
    power: "400 ch",
    transmission: "Automatique",
    acceleration: "3.8s",
    image: "/cars/rs3.svg",
    tagline: "Cinq cylindres, zéro compromis.",
    description:
      "Le légendaire 5 cylindres Audi dans un format compact et quotidien. Quattro, launch control et une sonorité inimitable.",
    featured: false,
  },
  {
    slug: "porsche-911-carrera",
    name: "911 Carrera",
    brand: "Porsche",
    category: "Sportive",
    pricePerDay: 649,
    seats: 2,
    power: "450 ch",
    transmission: "PDK",
    acceleration: "3.7s",
    image: "/cars/911.svg",
    tagline: "L'icône. Simplement.",
    description:
      "La silhouette la plus reconnaissable de l'automobile. Flat-six atmosphérique de caractère, boîte PDK chirurgicale, équilibre parfait.",
    featured: true,
  },
  {
    slug: "lamborghini-urus",
    name: "Urus",
    brand: "Lamborghini",
    category: "Super SUV",
    pricePerDay: 899,
    seats: 5,
    power: "666 ch",
    transmission: "Automatique",
    acceleration: "3.6s",
    image: "/cars/urus.svg",
    tagline: "Le taureau des Champs-Élysées.",
    description:
      "V8 biturbo, 666 chevaux, une présence qui arrête le regard. L'Urus impose le respect de la Concorde à la Défense.",
    featured: true,
  },
  {
    slug: "range-rover-sport",
    name: "Range Rover Sport",
    brand: "Land Rover",
    category: "SUV Premium",
    pricePerDay: 499,
    seats: 5,
    power: "530 ch",
    transmission: "Automatique",
    acceleration: "4.5s",
    image: "/cars/range.svg",
    tagline: "L'élégance en hauteur.",
    description:
      "Le SUV de référence pour traverser Paris avec prestance. Confort absolu, insonorisation totale, allure souveraine.",
    featured: false,
  },
];
