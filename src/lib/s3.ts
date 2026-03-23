import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LIMITS } from "./constants";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

/**
 * Generate a presigned PUT URL for uploading an object to S3.
 * Expires in 1 hour.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: LIMITS.PRESIGNED_URL_EXPIRY_SECONDS,
  });

  return url;
}

/**
 * Generate a presigned GET URL for downloading an object from S3.
 * Expires in 1 hour.
 */
export async function generatePresignedDownloadUrl(
  key: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: LIMITS.PRESIGNED_URL_EXPIRY_SECONDS,
  });

  return url;
}

/**
 * Delete an object from S3.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a deterministic S3 key for a user's recording.
 * Format: recordings/{userId}/{timestamp}_{filename}
 */
export function getS3Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `recordings/${userId}/${timestamp}_${sanitized}`;
}

/**
 * Get the full S3 URL for a given key.
 */
export function getS3Url(key: string): string {
  const region = process.env.AWS_REGION || "ap-south-1";
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

export { s3Client, BUCKET };
