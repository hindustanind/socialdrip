
import { OutfitCategory, PresetOutfit } from './types';

// Using picsum.photos for consistent, seeded placeholder images
const getImageUrl = (seed: string) => `https://picsum.photos/seed/${seed}/300/400`;

export const PRESET_OUTFITS: PresetOutfit[] = [
  // Party
  {
    id: 'preset-party-1',
    name: 'Midnight Glam',
    category: OutfitCategory.PARTY,
    image: getImageUrl('stylo-party-1'),
  },
  {
    id: 'preset-party-2',
    name: 'Sequined Star',
    category: OutfitCategory.PARTY,
    image: getImageUrl('stylo-party-2'),
  },
  // Casual
  {
    id: 'preset-casual-1',
    name: 'Urban Explorer',
    category: OutfitCategory.CASUAL,
    image: getImageUrl('stylo-casual-1'),
  },
  {
    id: 'preset-casual-2',
    name: 'Weekend Comfort',
    category: OutfitCategory.CASUAL,
    image: getImageUrl('stylo-casual-2'),
  },
  // Formal
  {
    id: 'preset-formal-1',
    name: 'Romantic Allure',
    category: OutfitCategory.FORMAL,
    image: getImageUrl('stylo-formal-1'),
  },
  {
    id: 'preset-formal-2',
    name: 'Chic Encounter',
    category: OutfitCategory.FORMAL,
    image: getImageUrl('stylo-formal-2'),
  },
  // Ethnic
  {
    id: 'preset-ethnic-1',
    name: 'Traditional Grace',
    category: OutfitCategory.ETHNIC,
    image: getImageUrl('stylo-ethnic-1'),
  },
  {
    id: 'preset-ethnic-2',
    name: 'Modern Fusion',
    category: OutfitCategory.ETHNIC,
    image: getImageUrl('stylo-ethnic-2'),
  },
];