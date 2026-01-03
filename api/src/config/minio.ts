import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'fidelio!',
  region: process.env.MINIO_REGION || 'us-west-1',
});

export const BUCKETS = {
  SESSION_MEDIA: process.env.BUCKET_SESSION_MEDIA || 'session-media',
  AVATARS: process.env.BUCKET_AVATARS || 'avatars',
  BOARD_PHOTOS: process.env.BUCKET_BOARD_PHOTOS || 'board-photos',
};

export const ensureBucketsExist = async () => {
  try {
    for (const bucket of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        console.warn(`Bucket ${bucket} does not exist. It should be created via Helm chart.`);
      } else {
        console.log(`Bucket ${bucket} is available`);
      }
    }
  } catch (error) {
    console.error('Error checking MinIO buckets:', error);
    throw error;
  }
};

export const uploadFile = async (
  bucket: string,
  objectName: string,
  stream: Buffer | NodeJS.ReadableStream | any,
  size: number,
  metadata: Record<string, string>
): Promise<string> => {
  try {
    await minioClient.putObject(bucket, objectName, stream, size, metadata);
    return `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucket}/${objectName}`;
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw error;
  }
};

export const deleteFile = async (bucket: string, objectName: string): Promise<void> => {
  try {
    await minioClient.removeObject(bucket, objectName);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    throw error;
  }
};

export const getFileUrl = (bucket: string, objectName: string): string => {
  // Use external URL for browser access (via nginx proxy or NodePort)
  const externalUrl = process.env.MINIO_EXTERNAL_URL || '/minio';
  return `${externalUrl}/${bucket}/${objectName}`;
};
