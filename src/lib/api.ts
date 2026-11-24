// FAKE backend. Same shapes as the planned API routes (/api/upload-auth + ImageKit upload,
// /api/generate, /api/designs, /api/designs/[id]) but backed by bundled images and an
// in-memory list. Swap the bodies for real fetch calls later; screens won't change.
import { STYLES, type RoomTypeId, type StyleId } from '@/lib/catalog';

export const DAILY_LIMIT = 5;
const FAIL_RATE = 0.15; // fake OpenAI failures so the Retry UI can be seen. Set 0 to disable.

export type ImageRef = string | number; // signed URL in the real app; bundled asset here
export type Design = {
  id: string;
  roomType: RoomTypeId;
  style: StyleId;
  createdAt: string;
  originalUrl: ImageRef;
  resultUrl: ImageRef;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const BEDROOM: Partial<Record<StyleId, number>> = {
  japandi: require('@/assets/images/rooms/bedroom-japandi.jpg'),
  luxury: require('@/assets/images/rooms/bedroom-luxury.jpg'),
  scandinavian: require('@/assets/images/rooms/bedroom-scandinavian.jpg'),
};
export const SAMPLE_LIVING = require('@/assets/images/rooms/living-before.jpg');
const SAMPLE_BEDROOM = require('@/assets/images/rooms/bedroom-before.jpg');

const fakeResult = (roomType: RoomTypeId, style: StyleId): ImageRef =>
  (roomType === 'bedroom' && BEDROOM[style]) || STYLES.find((s) => s.id === style)!.image;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const seed = (): Design[] => [
  { id: 'd5', roomType: 'living-room', style: 'japandi', createdAt: hoursAgo(1), originalUrl: SAMPLE_LIVING, resultUrl: fakeResult('living-room', 'japandi') },
  { id: 'd4', roomType: 'bedroom', style: 'luxury', createdAt: hoursAgo(2), originalUrl: SAMPLE_BEDROOM, resultUrl: fakeResult('bedroom', 'luxury') },
  { id: 'd3', roomType: 'living-room', style: 'industrial', createdAt: hoursAgo(26), originalUrl: SAMPLE_LIVING, resultUrl: fakeResult('living-room', 'industrial') },
  { id: 'd2', roomType: 'bedroom', style: 'scandinavian', createdAt: hoursAgo(50), originalUrl: SAMPLE_BEDROOM, resultUrl: fakeResult('bedroom', 'scandinavian') },
  { id: 'd1', roomType: 'living-room', style: 'coastal', createdAt: hoursAgo(75), originalUrl: SAMPLE_LIVING, resultUrl: fakeResult('living-room', 'coastal') },
];

let designs = seed();
export const resetFakeData = () => {
  designs = [];
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const usedToday = () => {
  const startOfUtcDay = new Date().setUTCHours(0, 0, 0, 0);
  return designs.filter((d) => Date.parse(d.createdAt) >= startOfUtcDay).length;
};
const remaining = () => Math.max(0, DAILY_LIMIT - usedToday());

/** GET /api/designs */
export async function listDesigns() {
  await wait(500);
  return { designs: [...designs], remaining: remaining(), limit: DAILY_LIMIT };
}

/** GET /api/designs/[id] */
export async function getDesign(id: string) {
  await wait(300);
  const d = designs.find((x) => x.id === id);
  if (!d) throw new ApiError(404, 'Design not found');
  return d;
}

/** GET /api/upload-auth, then a direct private upload to ImageKit */
export async function uploadPhoto(uri: string) {
  await wait(1500);
  return { path: uri };
}

/** POST /api/generate */
export async function generateDesign(input: { originalPath: string; roomType: RoomTypeId; style: StyleId }) {
  await wait(6000);
  if (remaining() === 0) throw new ApiError(429, "You've used all 5 designs for today. Come back tomorrow.");
  if (Math.random() < FAIL_RATE) throw new ApiError(502, "We couldn't redesign this photo. Your daily quota wasn't used, so feel free to try again.");
  const d: Design = {
    id: `d${Date.now()}`,
    roomType: input.roomType,
    style: input.style,
    createdAt: new Date().toISOString(),
    originalUrl: input.originalPath,
    resultUrl: fakeResult(input.roomType, input.style),
  };
  designs.unshift(d);
  return d;
}
