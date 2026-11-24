import type { ImageSourcePropType } from 'react-native';

export type RoomTypeId = (typeof ROOM_TYPES)[number]['id'];
export type StyleId = (typeof STYLES)[number]['id'];

export const ROOM_TYPES = [
  { id: 'living-room', name: 'Living room', icon: { ios: 'sofa', android: 'chair' } },
  { id: 'bedroom', name: 'Bedroom', icon: { ios: 'bed.double', android: 'bedroom_parent' } },
  { id: 'kitchen', name: 'Kitchen', icon: { ios: 'refrigerator', android: 'kitchen' } },
  { id: 'bathroom', name: 'Bathroom', icon: { ios: 'bathtub', android: 'bathtub' } },
  { id: 'dining-room', name: 'Dining room', icon: { ios: 'fork.knife', android: 'table_restaurant' } },
  { id: 'home-office', name: 'Home office', icon: { ios: 'desktopcomputer', android: 'desk' } },
] as const;

export const STYLES = [
  { id: 'modern', name: 'Modern', image: require('@/assets/images/rooms/living-modern.jpg'), prompt: 'warm neutral palette, sleek low-profile furniture, travertine and natural wood, large abstract art, sculptural lighting' },
  { id: 'minimalist', name: 'Minimalist', image: require('@/assets/images/rooms/living-minimalist.jpg'), prompt: 'very few pieces, white and soft grey palette, clean lines, uncluttered surfaces, calm bright light' },
  { id: 'scandinavian', name: 'Scandinavian', image: require('@/assets/images/rooms/living-scandinavian.jpg'), prompt: 'light oak and birch, white walls, wool textiles, knitted throws, plants, cozy hygge feel' },
  { id: 'luxury', name: 'Luxury', image: require('@/assets/images/rooms/living-luxury.jpg'), prompt: 'velvet upholstery, marble, brass accents, wall panelling, herringbone floor, statement chandelier, warm ambient light' },
  { id: 'industrial', name: 'Industrial', image: require('@/assets/images/rooms/living-industrial.jpg'), prompt: 'exposed brick, leather, black steel, reclaimed wood, Edison bulb lighting, concrete tones' },
  { id: 'bohemian', name: 'Bohemian', image: require('@/assets/images/rooms/living-bohemian.jpg'), prompt: 'terracotta and rust tones, layered patterned rugs, rattan, macrame, many plants, golden light' },
  { id: 'japandi', name: 'Japandi', image: require('@/assets/images/rooms/living-japandi.jpg'), prompt: 'low linen furniture, dark walnut, paper lantern, limewash walls, ceramics, muted earthy palette, serene' },
  { id: 'coastal', name: 'Coastal', image: require('@/assets/images/rooms/living-coastal.jpg'), prompt: 'white slipcovered furniture, soft blue and sand palette, jute, whitewashed wood, airy linen, bright daylight' },
] as const satisfies readonly { id: string; name: string; image: ImageSourcePropType; prompt: string }[];

export const roomName = (id: string) => ROOM_TYPES.find((r) => r.id === id)?.name ?? id;
export const styleName = (id: string) => STYLES.find((s) => s.id === id)?.name ?? id;
export const isRoomType = (id: string): id is RoomTypeId => ROOM_TYPES.some((r) => r.id === id);
export const isStyle = (id: string): id is StyleId => STYLES.some((s) => s.id === id);

export function buildPrompt(roomType: RoomTypeId, style: StyleId) {
  const s = STYLES.find((x) => x.id === style)!;
  return `Redesign this ${roomName(roomType).toLowerCase()} as a professional interior design photo in a ${s.name} style: ${s.prompt}. Keep the exact same camera angle, room shape, walls, windows, doors and ceiling. Remove clutter. Photorealistic, no people, no text.`;
}
