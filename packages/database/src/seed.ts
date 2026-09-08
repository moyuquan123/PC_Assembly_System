import { categories, seedParts } from "@pc-assembly/domain";
import { eq } from "drizzle-orm";
import { createDatabase } from "./client.js";
import { caseSpecs, coolerSpecs, cpuSpecs, gpuSpecs, memorySpecs, motherboardSpecs, partCategories, parts, psuSpecs, storageSpecs } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const { client, db } = createDatabase(databaseUrl);

for (const category of categories) {
  await db.insert(partCategories).values({ code: category.code, name: category.name, sortOrder: category.sortOrder })
    .onConflictDoUpdate({ target: partCategories.code, set: { name: category.name, sortOrder: category.sortOrder } });
}
const categoryRows = await db.select().from(partCategories);
const categoryIds = new Map(categoryRows.map((category) => [category.code, category.id]));

for (const part of seedParts) {
  const categoryId = categoryIds.get(part.category);
  if (!categoryId) throw new Error(`Missing category ${part.category}`);
  await db.transaction(async (tx) => {
    await tx.insert(parts).values({
      id: part.id, categoryId, brand: part.brand, model: part.model, name: part.name,
      priceFen: part.priceFen, imageKey: part.imageUrl, status: part.status, displaySpecs: part.displaySpecs,
      updatedAt: new Date(part.updatedAt)
    }).onConflictDoUpdate({ target: parts.id, set: {
      categoryId, brand: part.brand, model: part.model, name: part.name, priceFen: part.priceFen,
      imageKey: part.imageUrl, status: part.status, displaySpecs: part.displaySpecs, updatedAt: new Date(part.updatedAt)
    } });

    await tx.delete(cpuSpecs).where(eq(cpuSpecs.partId, part.id));
    await tx.delete(motherboardSpecs).where(eq(motherboardSpecs.partId, part.id));
    await tx.delete(memorySpecs).where(eq(memorySpecs.partId, part.id));
    await tx.delete(gpuSpecs).where(eq(gpuSpecs.partId, part.id));
    await tx.delete(caseSpecs).where(eq(caseSpecs.partId, part.id));
    await tx.delete(coolerSpecs).where(eq(coolerSpecs.partId, part.id));
    await tx.delete(psuSpecs).where(eq(psuSpecs.partId, part.id));
    await tx.delete(storageSpecs).where(eq(storageSpecs.partId, part.id));

    const specs = part.specs;
    if (specs.kind === "cpu") await tx.insert(cpuSpecs).values({ partId: part.id, socket: specs.socket, chipsetFamilies: specs.chipsetFamilies, tdpW: specs.tdpW, maxPowerW: specs.maxPowerW, generation: specs.generation });
    else if (specs.kind === "motherboard") await tx.insert(motherboardSpecs).values({ partId: part.id, socket: specs.socket, chipset: specs.chipset, memoryType: specs.memoryType, formFactor: specs.formFactor, biosReviewGenerations: specs.biosReviewGenerations, powerW: specs.powerW });
    else if (specs.kind === "memory") await tx.insert(memorySpecs).values({ partId: part.id, memoryType: specs.memoryType, capacityMb: specs.capacityMb, moduleCount: specs.moduleCount, powerW: specs.powerW });
    else if (specs.kind === "gpu") await tx.insert(gpuSpecs).values({ partId: part.id, lengthMm: specs.lengthMm, powerW: specs.powerW });
    else if (specs.kind === "case") await tx.insert(caseSpecs).values({ partId: part.id, supportedFormFactors: specs.supportedFormFactors, maxGpuLengthMm: specs.maxGpuLengthMm, maxCoolerHeightMm: specs.maxCoolerHeightMm });
    else if (specs.kind === "cooler") await tx.insert(coolerSpecs).values({ partId: part.id, heightMm: specs.heightMm, supportedSockets: specs.supportedSockets, powerW: specs.powerW });
    else if (specs.kind === "psu") await tx.insert(psuSpecs).values({ partId: part.id, ratedPowerW: specs.ratedPowerW, efficiency: specs.efficiency, modular: specs.modular });
    else await tx.insert(storageSpecs).values({ partId: part.id, interface: specs.interface, capacityGb: specs.capacityGb, powerW: specs.powerW });
  });
}

await client.end();
console.log(`Seeded ${seedParts.length} parts.`);
