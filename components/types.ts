export type Vehicle = {
  id: string;
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

export type BookedRange = { start: string; end: string };
