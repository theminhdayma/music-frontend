import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function getPresignedUploadUrl(bucketName: string, key: string, expiresInSeconds = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
  return url;
}

export async function getPresignedDownloadUrl(bucketName: string, key: string, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
  return url;
}
