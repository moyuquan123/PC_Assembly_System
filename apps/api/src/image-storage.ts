import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadRequest {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  extension: "jpg" | "jpeg" | "png" | "webp";
}
export interface UploadTarget { key: string; uploadUrl: string; publicUrl: string; expiresInSeconds: number; }
export interface ImageStorage { createUpload(request: UploadRequest): Promise<UploadTarget>; }

export class S3CompatibleImageStorage implements ImageStorage {
  private readonly client: S3Client;
  constructor(private readonly config: { endpoint: string; region: string; bucket: string; publicBaseUrl: string; accessKeyId: string; secretAccessKey: string }) {
    this.client = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: false, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }
  async createUpload(request: UploadRequest): Promise<UploadTarget> {
    const key = `parts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${request.extension}`;
    const command = new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: request.contentType, ContentLength: request.sizeBytes });
    const expiresInSeconds = 300;
    return { key, uploadUrl: await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds }), publicUrl: `${this.config.publicBaseUrl.replace(/\/$/, "")}/${key}`, expiresInSeconds };
  }
}
