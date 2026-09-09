import type { AnalyticsEventInput, BuildInput, ConfigurationClass, PartsQuery, PublishedConfigurationInput, RecommendationInput, UserLogin, UserRegistration } from "@pc-assembly/contracts";
import type { BuildSummary, Category, CompatibilityResult, Part, RecommendedBuild } from "@pc-assembly/domain";

interface ApiEnvelope<T> { requestId: string; data: T; }
interface ApiErrorEnvelope { requestId: string; error: { code: string; message: string; details?: unknown } }

export class ApiClientError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly details?: unknown) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers
  });
  const payload = await response.json() as ApiEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok || "error" in payload) {
    const error = "error" in payload ? payload.error : { code: "HTTP_ERROR", message: "请求失败" };
    throw new ApiClientError(error.code, error.message, response.status, "details" in error ? error.details : undefined);
  }
  return payload.data;
}

export function getCategories(): Promise<Category[]> { return apiRequest("/api/v1/categories"); }

export function getParts(query: PartsQuery = {}): Promise<Part[]> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  const suffix = params.size > 0 ? `?${params}` : "";
  return apiRequest(`/api/v1/parts${suffix}`);
}

export interface SavedBuildResponse {
  id: string;
  name: string;
  budgetFen: number;
  usage: BuildInput["usage"];
  ruleVersion: string;
  createdAt: string;
  parts: Part[];
  checks: CompatibilityResult[];
  summary: BuildSummary;
  shareCode?: string;
  sharePath?: string;
}

export function createSharedBuild(input: BuildInput): Promise<SavedBuildResponse> {
  return apiRequest("/api/v1/builds", { method: "POST", body: JSON.stringify(input) });
}

export function getSharedBuild(shareCode: string): Promise<SavedBuildResponse> {
  return apiRequest(`/api/v1/builds/${encodeURIComponent(shareCode)}`);
}

export interface PublishedConfigurationResponse {
  id: string;
  authorName: string;
  name: string;
  configurationClass: ConfigurationClass;
  description: string;
  createdAt: string;
  selectedPartIds: PublishedConfigurationInput["selectedPartIds"];
  parts: Part[];
  checks: CompatibilityResult[];
  summary: BuildSummary;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface ConfigurationEngagement {
  configurationKey: string;
  recommendCount: number;
  notRecommendCount: number;
  commentCount: number;
  impressionCount: number;
  clickCount: number;
  clickRate: number;
  hybridScore: number;
  myVote: -1 | 0 | 1;
}

export interface ConfigurationComment {
  id: string;
  configurationKey: string;
  author: { id: string; displayName: string };
  content: string;
  createdAt: string;
}

export function getPublishedConfigurations(): Promise<PublishedConfigurationResponse[]> {
  return apiRequest("/api/v1/configurations");
}

export function publishConfiguration(input: PublishedConfigurationInput): Promise<PublishedConfigurationResponse> {
  return apiRequest("/api/v1/configurations", { method: "POST", body: JSON.stringify(input) });
}

export function registerUser(input: UserRegistration): Promise<PublicUser> {
  return apiRequest("/api/v1/users", { method: "POST", body: JSON.stringify(input) });
}
export function loginUser(input: UserLogin): Promise<PublicUser> {
  return apiRequest("/api/v1/user-sessions", { method: "POST", body: JSON.stringify(input) });
}
export function getCurrentUser(): Promise<PublicUser> { return apiRequest("/api/v1/users/me"); }
export function logoutUser(): Promise<{ loggedOut: boolean }> { return apiRequest("/api/v1/user-sessions/current", { method: "DELETE" }); }
export function getConfigurationEngagement(keys: string[]): Promise<ConfigurationEngagement[]> {
  return apiRequest(`/api/v1/configuration-engagement?keys=${encodeURIComponent(keys.join(","))}`);
}
export async function recordConfigurationImpressions(keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 20) {
    await apiRequest("/api/v1/configuration-impressions", { method: "POST", body: JSON.stringify({ keys: keys.slice(index, index + 20) }) });
  }
}
export function recordConfigurationClick(configurationKey: string): Promise<{ accepted: boolean }> {
  return apiRequest(`/api/v1/configurations/${encodeURIComponent(configurationKey)}/click`, { method: "POST" });
}
export function voteConfiguration(configurationKey: string, value: -1 | 0 | 1): Promise<ConfigurationEngagement> {
  return apiRequest(`/api/v1/configurations/${encodeURIComponent(configurationKey)}/vote`, { method: "POST", body: JSON.stringify({ value }) });
}
export function getConfigurationComments(configurationKey: string): Promise<ConfigurationComment[]> {
  return apiRequest(`/api/v1/configurations/${encodeURIComponent(configurationKey)}/comments`);
}
export function commentOnConfiguration(configurationKey: string, content: string): Promise<ConfigurationComment> {
  return apiRequest(`/api/v1/configurations/${encodeURIComponent(configurationKey)}/comments`, { method: "POST", body: JSON.stringify({ content }) });
}

export interface RecommendationsResponse {
  recommendationVersion: string;
  ruleVersion: string;
  recommendations: RecommendedBuild[];
}

export function getRecommendations(input: RecommendationInput): Promise<RecommendationsResponse> {
  return apiRequest("/api/v1/recommendations", { method: "POST", body: JSON.stringify(input) });
}

export function loginAdmin(username: string, password: string): Promise<{ username: string }> {
  return apiRequest("/api/v1/admin/sessions", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function getAdminParts(): Promise<Part[]> { return apiRequest("/api/v1/admin/parts"); }

export function updateAdminPart(id: string, patch: Partial<Part>): Promise<Part> {
  const body = { ...patch };
  delete body.updatedAt;
  delete body.id;
  return apiRequest(`/api/v1/admin/parts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function createAdminPart(part: Omit<Part, "updatedAt">): Promise<Part> {
  return apiRequest("/api/v1/admin/parts", { method: "POST", body: JSON.stringify(part) });
}

export async function uploadPartImage(file: File): Promise<string> {
  const extension = (file.name.split(".").pop()?.toLowerCase() || "") as "jpg" | "jpeg" | "png" | "webp";
  const target = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/api/v1/admin/uploads", {
    method: "POST",
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size, extension })
  });
  const uploaded = await fetch(target.uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
  if (!uploaded.ok) throw new ApiClientError("UPLOAD_FAILED", "图片上传失败。", uploaded.status);
  return target.publicUrl;
}

export function sendEvent(event: AnalyticsEventInput): void {
  void apiRequest("/api/v1/events", { method: "POST", body: JSON.stringify(event) }).catch(() => undefined);
}
