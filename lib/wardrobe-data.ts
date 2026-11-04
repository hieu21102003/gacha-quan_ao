export type ClothingCategory = 'Tops' | 'Bottoms' | 'Shoes' | 'Outerwear' | 'Accessories'

export interface OutfitPiece {
  name: string
  category: ClothingCategory
  color: string
}

export interface Outfit {
  id: string
  name: string
  image: string
  imageAlt: string
  tags: string[]
  note: string
  pieces: OutfitPiece[]
}

export interface WornOutfit {
  id: string
  name: string
  image: string
  imageAlt: string
  wornOn: string
  occasion: string
}

export const user = {
  firstName: 'Hieu',
  fullName: 'Hieu Nguyen',
  email: 'hieu@virtualwardrobe.app',
  avatar: '/images/avatar-hieu.png',
}

export const weather = {
  temperature: 28,
  condition: 'Partly Cloudy',
  location: 'Hanoi, Vietnam',
  suggestion: 'A light outfit would be perfect today.',
  high: 31,
  low: 24,
}

export const suggestedOutfits: Outfit[] = [
  {
    id: 'effortless-casual',
    name: 'Effortless Casual',
    image: '/images/outfit-effortless-casual.png',
    imageAlt:
      'Flat lay of a white oversized shirt, beige trousers, white sneakers and a gold watch',
    tags: ['Casual', 'Comfortable', 'Warm Weather'],
    note: 'Breathable layers in soft neutrals. Roll the sleeves for a relaxed afternoon look.',
    pieces: [
      { name: 'Oversized Poplin Shirt', category: 'Tops', color: 'White' },
      { name: 'Pleated Wide-Leg Trousers', category: 'Bottoms', color: 'Beige' },
      { name: 'Leather Court Sneakers', category: 'Shoes', color: 'White' },
      { name: 'Minimal Gold Watch', category: 'Accessories', color: 'Gold' },
    ],
  },
  {
    id: 'linen-weekend',
    name: 'Linen Weekend',
    image: '/images/outfit-linen-weekend.png',
    imageAlt: 'Flat lay of a sage linen shirt, cream shorts, tan sandals and a straw tote',
    tags: ['Relaxed', 'Breathable', 'Weekend'],
    note: 'Light linen keeps you cool through the humid afternoon heat.',
    pieces: [
      { name: 'Linen Camp Shirt', category: 'Tops', color: 'Sage' },
      { name: 'Drawstring Linen Shorts', category: 'Bottoms', color: 'Cream' },
      { name: 'Leather Slide Sandals', category: 'Shoes', color: 'Tan' },
      { name: 'Woven Straw Tote', category: 'Accessories', color: 'Natural' },
    ],
  },
  {
    id: 'city-minimal',
    name: 'City Minimal',
    image: '/images/outfit-city-minimal.png',
    imageAlt: 'Flat lay of a black t-shirt, stone grey trousers, black loafers and sunglasses',
    tags: ['Smart Casual', 'Clean', 'Day to Night'],
    note: 'A sharp monochrome base that transitions easily from café to dinner.',
    pieces: [
      { name: 'Fitted Crew Tee', category: 'Tops', color: 'Black' },
      { name: 'Tailored Straight Trousers', category: 'Bottoms', color: 'Stone' },
      { name: 'Leather Penny Loafers', category: 'Shoes', color: 'Black' },
      { name: 'Acetate Sunglasses', category: 'Accessories', color: 'Black' },
    ],
  },
]

export const recentlyWorn: WornOutfit[] = [
  {
    id: 'office-neutral',
    name: 'Office Neutral',
    image: '/images/recent-office-neutral.png',
    imageAlt: 'Camel blazer, cream knit polo, brown trousers and suede loafers',
    wornOn: '2026-11-03',
    occasion: 'Work',
  },
  {
    id: 'sunday-stroll',
    name: 'Sunday Stroll',
    image: '/images/recent-sunday-stroll.png',
    imageAlt: 'Striped breton top, olive chinos, white sneakers and a canvas cap',
    wornOn: '2026-11-01',
    occasion: 'Weekend',
  },
  {
    id: 'denim-day',
    name: 'Denim Day',
    image: '/images/recent-denim-day.png',
    imageAlt: 'Light denim jacket, white tank top, straight jeans and canvas sneakers',
    wornOn: '2026-10-30',
    occasion: 'Casual',
  },
  {
    id: 'evening-dinner',
    name: 'Evening Dinner',
    image: '/images/recent-evening-dinner.png',
    imageAlt: 'Charcoal knit sweater, black wide-leg trousers, chelsea boots and a silver ring',
    wornOn: '2026-10-27',
    occasion: 'Dinner',
  },
]

export const wardrobeStats = {
  totalItems: 42,
  savedOutfits: 12,
  mostWornCategory: 'Tops' as ClothingCategory,
}

export const clothingCategories: ClothingCategory[] = [
  'Tops',
  'Bottoms',
  'Shoes',
  'Outerwear',
  'Accessories',
]
