import { createApp } from "./app.js";
import { PostgresStore } from "./postgres-store.js";
import { S3CompatibleImageStorage } from "./image-storage.js";
import { CatalogSyncService, TaobaoCatalogSource } from "./catalog-sync.js";
import { MemoryStore } from "./store.js";

const port = Number(process.env.PORT ?? 4174);
const host = process.env.HOST ?? "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? (isProduction ? undefined : "Admin123!");
const store = process.env.DATABASE_URL ? new PostgresStore(process.env.DATABASE_URL) : undefined;
const activeStore = store ?? new MemoryStore();
const taobaoVariables = ["TAOBAO_APP_KEY", "TAOBAO_APP_SECRET", "TAOBAO_ADZONE_ID"] as const;
const syncIntervalMinutes = Math.max(15, Number(process.env.CATALOG_SYNC_INTERVAL_MINUTES ?? 60));
const catalogSync = taobaoVariables.every((key) => process.env[key]) ? new CatalogSyncService(activeStore, new TaobaoCatalogSource({
  appKey: process.env.TAOBAO_APP_KEY!,
  appSecret: process.env.TAOBAO_APP_SECRET!,
  adzoneId: process.env.TAOBAO_ADZONE_ID!
}), syncIntervalMinutes) : undefined;
const storageVariables = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_PUBLIC_BASE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
const imageStorage = storageVariables.every((key) => process.env[key]) ? new S3CompatibleImageStorage({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION!,
  bucket: process.env.S3_BUCKET!,
  publicBaseUrl: process.env.S3_PUBLIC_BASE_URL!,
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
}) : undefined;

const app = await createApp({
  logger: true,
  production: isProduction,
  store: activeStore,
  ...(imageStorage ? { imageStorage } : {}),
  ...(catalogSync ? { catalogSync } : {}),
  allowedOrigins: (process.env.APP_ORIGINS ?? "http://127.0.0.1:4173,http://localhost:4173").split(","),
  ...(bootstrapPassword ? { bootstrapAdmin: { username: process.env.ADMIN_BOOTSTRAP_USERNAME ?? "admin", password: bootstrapPassword } } : {})
});

await app.listen({ host, port });
catalogSync?.start();
