export type ClothingCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Dresses'
  | 'Outerwear'
  | 'Shoes'
  | 'Bags'
  | 'Accessories'

export type WearStatus = 'Available' | 'In laundry' | 'Worn recently'

export interface ClothingItem {
  id: string
  name: string
  category: ClothingCategory
  image: string
  imageAlt: string
  color: string
  brand: string
  seasons: string[]
  styles: string[]
  price: number
  status: WearStatus
  favorite: boolean
}

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

export const clothingCategories: ClothingCategory[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
]

export const closetTabCategories = ['All Items', ...clothingCategories] as const

export type ClosetTabCategory = (typeof closetTabCategories)[number]

export const clothingColors = ['White', 'Black', 'Beige', 'Blue', 'Cream', 'Brown', 'Silver'] as const

export const clothingSeasons = ['Spring', 'Summer', 'Fall', 'Winter', 'All season'] as const

export const clothingStyles = ['Casual', 'Minimal', 'Smart', 'Relaxed', 'Classic'] as const

export const wearStatuses: WearStatus[] = ['Available', 'In laundry', 'Worn recently']

export const closetItems: ClothingItem[] = [
  {
    id: 'white-oversized-shirt',
    name: 'White oversized shirt',
    category: 'Tops',
    image: '/images/closet/closet-white-oversized-shirt.jpg',
    imageAlt: 'White oversized poplin shirt folded on a studio background',
    color: 'White',
    brand: 'COS',
    seasons: ['Spring', 'Summer'],
    styles: ['Minimal', 'Relaxed'],
    price: 89,
    status: 'Available',
    favorite: true,
  },
  {
    id: 'black-basic-tee',
    name: 'Black basic T-shirt',
    category: 'Tops',
    image: '/images/closet/closet-black-basic-tee.jpg',
    imageAlt: 'Black cotton crew-neck T-shirt neatly folded',
    color: 'Black',
    brand: 'Uniqlo',
    seasons: ['All season'],
    styles: ['Casual', 'Minimal'],
    price: 19,
    status: 'Available',
    favorite: false,
  },
  {
    id: 'beige-linen-trousers',
    name: 'Beige linen trousers',
    category: 'Bottoms',
    image: '/images/closet/closet-beige-linen-trousers.jpg',
    imageAlt: 'Beige linen trousers folded on a studio background',
    color: 'Beige',
    brand: 'Mango',
    seasons: ['Spring', 'Summer'],
    styles: ['Relaxed', 'Casual'],
    price: 69,
    status: 'Available',
    favorite: true,
  },
  {
    id: 'blue-straight-jeans',
    name: 'Blue straight jeans',
    category: 'Bottoms',
    image: '/images/closet/closet-blue-straight-jeans.jpg',
    imageAlt: 'Medium-blue straight-leg jeans folded on a studio background',
    color: 'Blue',
    brand: 'Everlane',
    seasons: ['All season'],
    styles: ['Casual', 'Classic'],
    price: 88,
    status: 'Worn recently',
    favorite: false,
  },
  {
    id: 'black-tailored-trousers',
    name: 'Black tailored trousers',
    category: 'Bottoms',
    image: '/images/closet/closet-black-tailored-trousers.jpg',
    imageAlt: 'Black tailored wool trousers folded with a sharp crease',
    color: 'Black',
    brand: 'Arket',
    seasons: ['Fall', 'Winter'],
    styles: ['Smart', 'Minimal'],
    price: 120,
    status: 'Available',
    favorite: false,
  },
  {
    id: 'cream-knit-sweater',
    name: 'Cream knit sweater',
    category: 'Tops',
    image: '/images/closet/closet-cream-knit-sweater.jpg',
    imageAlt: 'Cream merino knit sweater folded on a studio background',
    color: 'Cream',
    brand: '& Other Stories',
    seasons: ['Fall', 'Winter'],
    styles: ['Classic', 'Relaxed'],
    price: 95,
    status: 'In laundry',
    favorite: true,
  },
  {
    id: 'white-sneakers',
    name: 'White sneakers',
    category: 'Shoes',
    image: '/images/closet/closet-white-sneakers.jpg',
    imageAlt: 'Pair of white leather court sneakers on a studio background',
    color: 'White',
    brand: 'Common Projects',
    seasons: ['All season'],
    styles: ['Minimal', 'Casual'],
    price: 245,
    status: 'Available',
    favorite: true,
  },
  {
    id: 'black-leather-loafers',
    name: 'Black leather loafers',
    category: 'Shoes',
    image: '/images/closet/closet-black-leather-loafers.jpg',
    imageAlt: 'Pair of polished black leather loafers on a studio background',
    color: 'Black',
    brand: 'Church’s',
    seasons: ['Fall', 'Winter', 'Spring'],
    styles: ['Smart', 'Classic'],
    price: 310,
    status: 'Available',
    favorite: false,
  },
  {
    id: 'brown-leather-bag',
    name: 'Brown leather bag',
    category: 'Bags',
    image: '/images/closet/closet-brown-leather-bag.jpg',
    imageAlt: 'Structured brown leather tote bag on a studio background',
    color: 'Brown',
    brand: 'Polène',
    seasons: ['All season'],
    styles: ['Classic', 'Smart'],
    price: 390,
    status: 'Available',
    favorite: true,
  },
  {
    id: 'black-shoulder-bag',
    name: 'Black shoulder bag',
    category: 'Bags',
    image: '/images/closet/closet-black-shoulder-bag.jpg',
    imageAlt: 'Sleek black leather shoulder bag on a studio background',
    color: 'Black',
    brand: 'A.P.C.',
    seasons: ['All season'],
    styles: ['Minimal', 'Smart'],
    price: 275,
    status: 'Worn recently',
    favorite: false,
  },
  {
    id: 'beige-trench-coat',
    name: 'Beige trench coat',
    category: 'Outerwear',
    image: '/images/closet/closet-beige-trench-coat.jpg',
    imageAlt: 'Classic beige trench coat folded on a studio background',
    color: 'Beige',
    brand: 'Burberry',
    seasons: ['Spring', 'Fall'],
    styles: ['Classic', 'Smart'],
    price: 890,
    status: 'Available',
    favorite: true,
  },
  {
    id: 'silver-minimalist-watch',
    name: 'Silver minimalist watch',
    category: 'Accessories',
    image: '/images/closet/closet-silver-watch.jpg',
    imageAlt: 'Silver minimalist analog wristwatch on a studio background',
    color: 'Silver',
    brand: 'Daniel Wellington',
    seasons: ['All season'],
    styles: ['Minimal', 'Classic'],
    price: 159,
    status: 'Available',
    favorite: false,
  },
]
