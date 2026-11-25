// Shared by the app and the API routes, so keep it free of React Native imports.
export const DAILY_LIMIT = 5;

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
  { id: 'modern', name: 'Modern', prompt: 'warm neutral palette, sleek low-profile furniture, travertine and natural wood, large abstract art, sculptural lighting' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'very few pieces, white and soft grey palette, clean lines, uncluttered surfaces, calm bright light' },
  { id: 'scandinavian', name: 'Scandinavian', prompt: 'light oak and birch, white walls, wool textiles, knitted throws, plants, cozy hygge feel' },
  { id: 'luxury', name: 'Luxury', prompt: 'velvet upholstery, marble, brass accents, wall panelling, herringbone floor, statement chandelier, warm ambient light' },
  { id: 'industrial', name: 'Industrial', prompt: 'exposed brick, leather, black steel, reclaimed wood, Edison bulb lighting, concrete tones' },
  { id: 'bohemian', name: 'Bohemian', prompt: 'terracotta and rust tones, layered patterned rugs, rattan, macrame, many plants, golden light' },
  { id: 'japandi', name: 'Japandi', prompt: 'low linen furniture, dark walnut, paper lantern, limewash walls, ceramics, muted earthy palette, serene' },
  { id: 'coastal', name: 'Coastal', prompt: 'white slipcovered furniture, soft blue and sand palette, jute, whitewashed wood, airy linen, bright daylight' },
] as const satisfies readonly { id: string; name: string; prompt: string }[];

export const roomName = (id: string) => ROOM_TYPES.find((r) => r.id === id)?.name ?? id;
export const styleName = (id: string) => STYLES.find((s) => s.id === id)?.name ?? id;
export const isRoomType = (id: unknown): id is RoomTypeId => ROOM_TYPES.some((r) => r.id === id);
export const isStyle = (id: unknown): id is StyleId => STYLES.some((s) => s.id === id);

/**
 * An upload the app made into this user's own originals folder (see /api/upload-auth).
 * The file name must be plain (no slashes, %-escapes or dot segments), so URL normalization can't move it.
 */
export const isOwnOriginal = (path: unknown, userId: string): path is string => {
  const prefix = `/users/${userId}/originals/`;
  return typeof path === 'string' && path.startsWith(prefix) && /^[\w-]+\.\w+$/.test(path.slice(prefix.length));
};

export function buildPrompt(roomType: RoomTypeId, style: StyleId) {
  const s = STYLES.find((x) => x.id === style)!;
  return `Redesign this ${roomName(roomType).toLowerCase()} as a professional interior design photo in a ${s.name} style: ${s.prompt}. Keep the exact same camera angle, room shape, walls, windows, doors and ceiling. Remove clutter. Photorealistic, no people, no text.`;
}
