import type { StyleId } from '@/lib/catalog';

// Bundled preview cards (client only; the server never needs them).
export const STYLE_IMAGES: Record<StyleId, number> = {
  modern: require('@/assets/images/rooms/living-modern.jpg'),
  minimalist: require('@/assets/images/rooms/living-minimalist.jpg'),
  scandinavian: require('@/assets/images/rooms/living-scandinavian.jpg'),
  luxury: require('@/assets/images/rooms/living-luxury.jpg'),
  industrial: require('@/assets/images/rooms/living-industrial.jpg'),
  bohemian: require('@/assets/images/rooms/living-bohemian.jpg'),
  japandi: require('@/assets/images/rooms/living-japandi.jpg'),
  coastal: require('@/assets/images/rooms/living-coastal.jpg'),
};
