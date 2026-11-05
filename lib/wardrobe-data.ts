export type ClothingCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Dresses'
  | 'Outerwear'
  | 'Shoes'
  | 'Bags'
  | 'Accessories'

export type WearStatus = 'Available' | 'In laundry' | 'Worn recently'
export type ClothingProvenance = 'seed' | 'user' | 'unknown'

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
  provenance: ClothingProvenance
}

export interface Outfit {
  id: string
  name: string
  description: string
  itemIds: string[]
  createdAt: string
  updatedAt: string
  favorite: boolean
}

export function resolveOutfitItems(outfit: Outfit, items: readonly ClothingItem[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]))
  const resolvedItems: ClothingItem[] = []
  const missingItemIds: string[] = []

  for (const itemId of outfit.itemIds) {
    const item = itemsById.get(itemId)
    if (item) {
      resolvedItems.push(item)
    } else {
      missingItemIds.push(itemId)
    }
  }

  return { items: resolvedItems, missingItemIds }
}

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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
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
    provenance: 'seed',
  },
]
