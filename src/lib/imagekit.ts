// Server only: Expo API routes and the `generate` Neon Function. Files are private; the DB stores
// ImageKit file paths, and every URL handed to the app is signed and expires in 1 hour.
import ImageKit from '@imagekit/nodejs';

export const imagekit = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

export const userFolder = (userId: string) => `/users/${userId}`;

export const signedUrl = (path: string, width?: number) =>
  imagekit.helper.buildSrc({
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
    src: path,
    transformation: width ? [{ width }] : undefined,
    signed: true,
    expiresIn: 3600,
  });

export async function deleteUserFiles(userId: string) {
  await imagekit.folders.delete({ folderPath: userFolder(userId) }).catch((e) => {
    if (!(e instanceof ImageKit.NotFoundError)) throw e; // never uploaded anything
  });
}
