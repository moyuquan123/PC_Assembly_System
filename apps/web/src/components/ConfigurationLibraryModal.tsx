import { CheckCircle2, MessageCircle, ThumbsDown, ThumbsUp, TriangleAlert, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { categories } from "@pc-assembly/domain";
import type { ConfigurationEngagement, PublicUser } from "../lib/api";
import { commentOnConfiguration, getConfigurationComments, voteConfiguration } from "../lib/api";
import type { MarketConfiguration } from "../lib/configuration-library";
import { formatYuan } from "../lib/format";

export default function ConfigurationLibraryModal({ configuration, engagement, user, onClose, onApply, onRequireAccount, onEngagementChange }: {
  configuration: MarketConfiguration | null;
  engagement: ConfigurationEngagement | undefined;
  user: PublicUser | undefined;
  onClose: () => void;
  onApply: (configuration: MarketConfiguration) => void;
  onRequireAccount: () => void;
  onEngagementChange: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const key = configuration?.engagementKey ?? "";
  const commentsQuery = useQuery({ queryKey: ["configuration-comments", key], queryFn: () => getConfigurationComments(key), enabled: Boolean(key), retry: false });
  if (!configuration) return null;
  const hasWarning = configuration.checks.some((check) => check.level === "warning");

  const vote = async (value: -1 | 1) => {
    if (!user) { onRequireAccount(); return; }
    setError("");
    try {
      await voteConfiguration(key, engagement?.myVote === value ? 0 : value);
      await onEngagementChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "投票失败，请稍后重试。");
    }
  };
  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) { onRequireAccount(); return; }
    if (!comment.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await commentOnConfiguration(key, comment);
      setComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["configuration-comments", key] }),
        onEngagementChange()
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "评论失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="modal-backdrop community-detail-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="build-modal library-modal community-detail-modal" role="dialog" aria-modal="true" aria-labelledby="library-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><h2 id="library-modal-title">{configuration.name}</h2><span>{configuration.source === "official" ? "官方方案" : `用户投稿 · ${configuration.authorName}`}{configuration.createdAt ? ` · ${formatDate(configuration.createdAt)}` : ""}</span></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
      <div className="community-detail-overview"><div><strong>{formatYuan(configuration.summary.totalFen)}</strong><span>总价（参考）</span></div><div className={hasWarning ? "warning" : "success"}>{hasWarning ? <TriangleAlert size={23} /> : <CheckCircle2 size={23} />}<strong>{hasWarning ? "需要确认" : "兼容性良好"}</strong><span>兼容性状态</span></div><div><strong>{(engagement?.hybridScore ?? 20).toFixed(1)}</strong><span>综合评分</span></div></div>
      <div className="community-detail-columns">
        <section className="community-parts" aria-labelledby="community-parts-title"><h3 id="community-parts-title">配置清单（8 件）</h3><div className="modal-build-list">{categories.map((category) => { const part = configuration.summary.parts.find((item) => item.category === category.code)!; return <div className="modal-build-row" key={category.code}><span>{category.name}</span><strong>{part.name}</strong><em>{formatYuan(part.priceFen)}</em></div>; })}</div></section>
        <section className="community-panel" aria-labelledby="community-panel-title">
          <h3 id="community-panel-title">社区互动</h3>
          <div className="community-metrics"><div><strong>{engagement?.recommendCount ?? 0}</strong><span>推荐</span></div><div><strong>{engagement?.commentCount ?? 0}</strong><span>评论</span></div><div><strong>{formatPercent(engagement?.clickRate ?? 0)}</strong><span>点击率</span></div></div>
          <div className="vote-actions"><button className={engagement?.myVote === 1 ? "selected recommend" : "recommend"} type="button" onClick={() => vote(1)}><ThumbsUp size={18} />推荐</button><button className={engagement?.myVote === -1 ? "selected oppose" : "oppose"} type="button" onClick={() => vote(-1)}><ThumbsDown size={18} />不推荐</button></div>
          <form className="comment-form" onSubmit={submitComment}><label><span>评论</span><textarea aria-label="发表评论" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={user ? "说说这套配置的优点或需要改进的地方…" : "登录后参与评论"} /></label><div><small>{comment.length} / 500</small><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "发表中…" : "发表评论"}</button></div></form>
          {error ? <p className="community-error" role="alert">{error}</p> : null}
          <div className="comment-list">{commentsQuery.isLoading ? <p className="comment-empty">正在加载评论…</p> : (commentsQuery.data ?? []).length > 0 ? commentsQuery.data!.map((item) => <article className="comment-item" key={item.id}><span className="comment-avatar" aria-hidden="true">{item.author.displayName.slice(0, 1)}</span><div><header><strong>{item.author.displayName}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></header><p>{item.content}</p></div></article>) : <div className="comment-empty"><MessageCircle size={20} /><span>还没有评论，来分享第一条看法吧。</span></div>}</div>
        </section>
      </div>
      <div className="community-modal-actions"><button className="secondary-button" type="button" onClick={onClose}>关闭</button><button className="primary-button" type="button" onClick={() => onApply(configuration)}>采用这套配置</button></div>
    </section>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)).replaceAll("/", "-"); }
function formatPercent(value: number) { return `${(value * 100).toFixed(1)}%`; }
