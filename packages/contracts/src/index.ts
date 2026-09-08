import { z } from "zod";

export const categoryCodeSchema = z.enum([
  "cpu", "motherboard", "gpu", "memory", "storage", "psu", "case", "cooler"
]);
export const usageSchema = z.enum(["游戏", "办公", "内容创作"]);

const cpuSpecsSchema = z.object({
  kind: z.literal("cpu"), socket: z.string().min(1), chipsetFamilies: z.array(z.string()),
  tdpW: z.number().int().nonnegative(), maxPowerW: z.number().int().positive(), generation: z.string().min(1)
});
const motherboardSpecsSchema = z.object({
  kind: z.literal("motherboard"), socket: z.string().min(1), chipset: z.string().min(1),
  memoryType: z.enum(["DDR4", "DDR5"]), formFactor: z.enum(["ATX", "M-ATX", "ITX"]),
  biosReviewGenerations: z.array(z.string()), powerW: z.number().int().nonnegative()
});
const memorySpecsSchema = z.object({
  kind: z.literal("memory"), memoryType: z.enum(["DDR4", "DDR5"]),
  capacityMb: z.number().int().positive(), moduleCount: z.number().int().positive(), powerW: z.number().int().nonnegative()
});
const gpuSpecsSchema = z.object({ kind: z.literal("gpu"), lengthMm: z.number().int().positive(), powerW: z.number().int().positive() });
const storageSpecsSchema = z.object({ kind: z.literal("storage"), interface: z.string().min(1), capacityGb: z.number().int().positive(), powerW: z.number().int().nonnegative() });
const psuSpecsSchema = z.object({ kind: z.literal("psu"), ratedPowerW: z.number().int().positive(), efficiency: z.string().min(1), modular: z.string().min(1) });
const caseSpecsSchema = z.object({
  kind: z.literal("case"), supportedFormFactors: z.array(z.enum(["ATX", "M-ATX", "ITX"])).min(1),
  maxGpuLengthMm: z.number().int().positive(), maxCoolerHeightMm: z.number().int().positive()
});
const coolerSpecsSchema = z.object({
  kind: z.literal("cooler"), heightMm: z.number().int().positive(), supportedSockets: z.array(z.string()).min(1), powerW: z.number().int().nonnegative()
});

export const partSpecsSchema = z.discriminatedUnion("kind", [
  cpuSpecsSchema, motherboardSpecsSchema, memorySpecsSchema, gpuSpecsSchema,
  storageSpecsSchema, psuSpecsSchema, caseSpecsSchema, coolerSpecsSchema
]);

const partObjectSchema = z.object({
  id: z.string().min(3).max(100),
  category: categoryCodeSchema,
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(160),
  name: z.string().min(1).max(240),
  priceFen: z.number().int().nonnegative(),
  imageUrl: z.string().max(2048),
  status: z.enum(["active", "inactive"]),
  updatedAt: z.string().datetime(),
  displaySpecs: z.array(z.string().max(120)).max(12),
  specs: partSpecsSchema
});

function validatePartKind(part: { category?: string; specs?: { kind?: string } }, context: z.core.$RefinementCtx) {
  if (part.specs && part.category !== part.specs.kind) {
    context.addIssue({ code: "custom", path: ["specs", "kind"], message: "规格类型必须与配件分类一致" });
  }
}

export const partSchema = partObjectSchema.superRefine(validatePartKind);

export const partsQuerySchema = z.object({
  category: categoryCodeSchema.optional(),
  brand: z.string().trim().max(100).optional(),
  keyword: z.string().trim().max(100).optional(),
  minPriceFen: z.coerce.number().int().nonnegative().optional(),
  maxPriceFen: z.coerce.number().int().nonnegative().optional()
});

export const selectedPartIdsSchema = z.object({
  cpu: z.string().optional(), motherboard: z.string().optional(), gpu: z.string().optional(),
  memory: z.string().optional(), storage: z.string().optional(), psu: z.string().optional(),
  case: z.string().optional(), cooler: z.string().optional()
});

export const buildInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  budgetFen: z.number().int().min(200_000).max(10_000_000),
  usage: usageSchema,
  selectedPartIds: selectedPartIdsSchema
});

export const compatibilityCheckSchema = z.object({ selectedPartIds: selectedPartIdsSchema });
export const shareCodeParamsSchema = z.object({ shareCode: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/) });
export const partIdParamsSchema = z.object({ id: z.string().min(3).max(100) });

export const adminLoginSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200)
});

export const adminPartCreateSchema = partObjectSchema.omit({ updatedAt: true }).superRefine(validatePartKind);
export const adminPartPatchSchema = partObjectSchema.omit({ id: true, updatedAt: true }).partial().refine((value) => Object.keys(value).length > 0, "至少提供一个修改字段");
export const imageUploadRequestSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  extension: z.enum(["jpg", "jpeg", "png", "webp"])
});

export const analyticsEventSchema = z.object({
  eventName: z.enum(["build_started", "part_selected", "compatibility_triggered", "part_changed_after_warning", "build_completed", "build_saved_local", "build_shared"]),
  anonymousId: z.string().uuid(),
  buildId: z.string().uuid().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({})
});

export type PartsQuery = z.infer<typeof partsQuerySchema>;
export type BuildInput = z.infer<typeof buildInputSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type AdminPartCreate = z.infer<typeof adminPartCreateSchema>;
export type AdminPartPatch = z.infer<typeof adminPartPatchSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
