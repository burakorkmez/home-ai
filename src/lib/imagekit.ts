// Server only: Expo API routes and the `generate` Neon Function. Files are private; the DB stores
// ImageKit file paths, and every URL handed to the app is signed and expires in 1 hour.
import ImageKit from '@imagekit/nodejs';

export const imagekit = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

export const userFolder = (userId: string) => `/users/${userId}`;

// Each array item is one chained step (`:`-separated); keys within an item share a step (`,`-separated).
export const signedUrl = (path: string, transformation?: ImageKit.Transformation[]) =>
  imagekit.helper.buildSrc({
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
    src: path,
    transformation,
    signed: true,
    expiresIn: 3600,
  });

// Upload assets/images/icon.png (or the real logo) to this path in the ImageKit media library.
const LOGO_PATH = '/brand/logo.png';

/** 1080px-wide share card: caption bottom-left, logo top-left, original photo as a picture-in-picture top-right. */
export const shareCardUrl = (resultPath: string, originalPath: string, caption: string) =>
  signedUrl(resultPath, [
    { width: 1080 }, // fixed base width so the pixel sizes below are predictable
    { overlay: { type: 'image', input: originalPath, position: { focus: 'top_right' }, transformation: [{ width: 320, border: '6_FFFFFF', radius: 24 }] } },
    { overlay: { type: 'image', input: LOGO_PATH, position: { focus: 'top_left' }, transformation: [{ width: 140 }] } },
    // The SDK picks the encoding: `·` and spaces force base64 (`ie-`), and paths get `/` → `@@`. bg alpha 60 ≈ 60% opaque.
    { overlay: { type: 'text', text: caption, position: { focus: 'bottom_left' }, transformation: [{ fontSize: 44, fontColor: 'FFFFFF', background: '00000060', padding: '24_36' }] } },
  ]);

export async function deleteUserFiles(userId: string) {
  await imagekit.folders.delete({ folderPath: userFolder(userId) }).catch((e) => {
    if (!(e instanceof ImageKit.NotFoundError)) throw e; // never uploaded anything
  });
}
