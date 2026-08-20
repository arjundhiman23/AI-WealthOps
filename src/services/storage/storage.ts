import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Document storage — BRD FR-011.
 *
 * S3 is the production target and is used whenever credentials are present.
 * When they are not, uploads degrade to metadata-only records rather than
 * throwing, because a sales demo must never break because an AWS key is
 * missing. `isConfigured` is surfaced in the admin view so the state is
 * visible rather than silent.
 */

export type StorageStatus = {
  backend: "s3" | "metadata-only";
  configured: boolean;
  bucket: string | null;
  region: string | null;
  note: string;
};

const bucket = process.env.S3_BUCKET ?? null;
const region = process.env.AWS_REGION ?? "ap-south-1";
const hasCreds = Boolean(
  bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
);

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function storageStatus(): StorageStatus {
  return {
    backend: hasCreds ? "s3" : "metadata-only",
    configured: hasCreds,
    bucket,
    region: hasCreds ? region : null,
    note: hasCreds
      ? "Uploaded documents are stored in S3 and served through short-lived presigned URLs."
      : "No S3 credentials configured. Document records are tracked but file contents are not persisted — set S3_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to enable storage.",
  };
}

export const isStorageConfigured = () => hasCreds;

/** Returns the storage key, or null when running metadata-only. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!hasCreds) return null;
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }),
  );
  return key;
}

/** Short-lived download link. Null when the object was never stored. */
export async function presignGet(key: string | null, expiresIn = 300): Promise<string | null> {
  if (!hasCreds || !key) return null;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket!, Key: key }), { expiresIn });
}

export async function deleteObject(key: string | null): Promise<void> {
  if (!hasCreds || !key) return;
  await s3().send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
}

export function buildKey(clientId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  return `demo/clients/${clientId}/${Date.now()}-${safe}`;
}
