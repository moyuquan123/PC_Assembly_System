import { ArrowRight, ClipboardList } from "lucide-react";

export default function SavedScreen({ savedBuild, onOpen, onStart }) {
  return (
    <main className="saved-screen">
      <div className="saved-heading">
        <h1>我的配置</h1>
        <p>保存在当前浏览器中的装机方案。</p>
      </div>

      {savedBuild ? (
        <article className="saved-build">
          <div className="saved-icon">
            <ClipboardList size={26} />
          </div>
          <div>
            <h2>{savedBuild.form.name}</h2>
            <p>
              {savedBuild.progress} 个配件 · {savedBuild.form.usage} · 预算 ¥
              {Number(savedBuild.form.budget).toLocaleString("zh-CN")}
            </p>
          </div>
          <strong>¥{savedBuild.total.toLocaleString("zh-CN")}</strong>
          <button type="button" onClick={onOpen}>
            打开配置 <ArrowRight size={17} />
          </button>
        </article>
      ) : (
        <section className="saved-empty">
          <ClipboardList size={38} />
          <h2>还没有保存的配置</h2>
          <p>完成一次配件选择后，点击“保存配置”即可在这里查看。</p>
          <button className="primary-button" type="button" onClick={onStart}>
            创建新配置
          </button>
        </section>
      )}
    </main>
  );
}
