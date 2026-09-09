import { createHmac } from "node:crypto";
import type { Part } from "@pc-assembly/domain";
import type { CatalogCandidateInput, CatalogFreshness, MarketOfferInput, Store } from "./store.js";

export interface CatalogSourceResult { offers: MarketOfferInput[]; candidates: CatalogCandidateInput[]; }
export interface CatalogSource {
  readonly code: string;
  readonly name: string;
  fetch(parts: Part[]): Promise<CatalogSourceResult>;
}

export class CatalogSyncService {
  private timer: ReturnType<typeof setInterval> | undefined;
  private syncing = false;

  constructor(private readonly store: Store, private readonly source: CatalogSource, private readonly intervalMinutes = 60) {}

  async runOnce(): Promise<CatalogFreshness> {
    if (this.syncing) return this.store.getCatalogFreshness();
    this.syncing = true;
    const nextSyncAt = new Date(Date.now() + this.intervalMinutes * 60_000);
    await this.store.markCatalogSyncStarted(this.source.code, this.source.name, nextSyncAt);
    try {
      const parts = (await this.store.listParts({}, true)).filter((part) => part.status === "active" && (part.category === "cpu" || part.category === "gpu"));
      const result = await this.source.fetch(parts);
      return await this.store.completeCatalogSync(this.source.code, this.source.name, result.offers, result.candidates, nextSyncAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "市场数据同步失败。";
      await this.store.failCatalogSync(this.source.code, this.source.name, message, nextSyncAt);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  start(): void {
    if (this.timer) return;
    void this.runOnce().catch(() => undefined);
    this.timer = setInterval(() => { void this.runOnce().catch(() => undefined); }, this.intervalMinutes * 60_000);
    this.timer.unref?.();
  }

  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
}

interface TaobaoSourceOptions { appKey: string; appSecret: string; adzoneId: string; endpoint?: string; fetchImpl?: typeof fetch; }

export class TaobaoCatalogSource implements CatalogSource {
  readonly code = "taobao";
  readonly name = "淘宝开放平台";
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: TaobaoSourceOptions) {
    this.endpoint = options.endpoint ?? "https://eco.taobao.com/router/rest";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetch(parts: Part[]): Promise<CatalogSourceResult> {
    const offers: MarketOfferInput[] = [];
    for (const part of parts) {
      const items = await this.search(`${part.brand} ${part.model}`, 8);
      const matched = items.filter((item) => isPlausibleMatch(part, item.title)).toSorted((a, b) => a.priceFen - b.priceFen)[0];
      if (matched) offers.push({ ...matched, partId: part.id });
    }
    const candidates = (await Promise.all([
      this.search("CPU 处理器", 20).then((items) => items.map((item) => toCandidate("cpu", item))),
      this.search("独立显卡", 20).then((items) => items.map((item) => toCandidate("gpu", item)))
    ])).flat().filter((candidate) => !parts.some((part) => isPlausibleMatch(part, candidate.title)));
    return { offers: dedupeBy(offers, (item) => item.externalId), candidates: dedupeBy(candidates, (item) => item.externalId).slice(0, 40) };
  }

  private async search(query: string, pageSize: number): Promise<Array<Omit<MarketOfferInput, "partId">>> {
    const params: Record<string, string> = {
      method: "taobao.tbk.dg.material.optional",
      app_key: this.options.appKey,
      sign_method: "hmac",
      timestamp: formatTimestamp(new Date()),
      format: "json",
      v: "2.0",
      adzone_id: this.options.adzoneId,
      q: query,
      page_size: String(pageSize),
      platform: "1"
    };
    params.sign = signTaobao(params, this.options.appSecret);
    const response = await this.fetchImpl(this.endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(params), signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`淘宝开放平台返回 HTTP ${response.status}`);
    const payload = await response.json() as any;
    if (payload.error_response) throw new Error(`淘宝开放平台：${payload.error_response.sub_msg ?? payload.error_response.msg ?? "请求失败"}`);
    const rows = payload.tbk_dg_material_optional_response?.result_list?.map_data ?? [];
    return rows.flatMap((row: any) => {
      const externalId = String(row.item_id ?? row.item_id_str ?? "");
      const title = stripMarkup(String(row.title ?? row.short_title ?? ""));
      const priceFen = Math.round(Number(row.zk_final_price ?? row.reserve_price ?? 0) * 100);
      if (!externalId || !title || !Number.isFinite(priceFen) || priceFen < 20_000 || isAccessoryNoise(title)) return [];
      return [{ externalId, title, sellerName: String(row.shop_title ?? row.nick ?? ""), priceFen, productUrl: String(row.url ?? row.click_url ?? `https://item.taobao.com/item.htm?id=${encodeURIComponent(externalId)}`), imageUrl: normalizeImageUrl(String(row.pict_url ?? "")) }];
    });
  }
}

export function signTaobao(params: Record<string, string>, secret: string): string {
  const content = Object.keys(params).filter((key) => key !== "sign").toSorted().map((key) => `${key}${params[key]}`).join("");
  return createHmac("md5", secret).update(content, "utf8").digest("hex").toUpperCase();
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalize(value: string): string { return value.toLocaleLowerCase("zh-CN").replace(/<[^>]+>/g, "").replace(/[^a-z0-9\u4e00-\u9fff]/g, ""); }
function stripMarkup(value: string): string { return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(); }
function normalizeImageUrl(value: string): string { return value.startsWith("//") ? `https:${value}` : value; }
function isAccessoryNoise(title: string): boolean { return /(支架|散热器|风扇|贴纸|空盒|包装盒|保护套|显卡坞|延长线|转接线|笔记本|整机|主机)/i.test(title); }
function isPlausibleMatch(part: Part, title: string): boolean {
  if (isAccessoryNoise(title)) return false;
  const normalizedTitle = normalize(title);
  const tokens = part.model.match(/[a-z]+\d+[a-z0-9-]*|\d{4,5}[a-z]{0,3}/gi)?.map(normalize).filter((token) => token.length >= 4) ?? [];
  return tokens.length > 0 && tokens.every((token) => normalizedTitle.includes(token));
}
function toCandidate(categoryCode: "cpu" | "gpu", item: Omit<MarketOfferInput, "partId">): CatalogCandidateInput {
  const brands = ["AMD", "Intel", "英特尔", "华硕", "微星", "技嘉", "七彩虹", "索泰", "蓝宝石", "影驰", "铭瑄"];
  const brand = brands.find((value) => normalize(item.title).includes(normalize(value))) ?? "";
  return { externalId: item.externalId, categoryCode, title: item.title, brand, model: item.title.slice(0, 160), priceFen: item.priceFen, productUrl: item.productUrl, imageUrl: item.imageUrl };
}
function dedupeBy<T>(items: T[], key: (item: T) => string): T[] { return [...new Map(items.map((item) => [key(item), item])).values()]; }
