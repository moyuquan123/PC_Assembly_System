import { useMemo, useState } from "react";
import { Check, Search, TriangleAlert } from "lucide-react";
import { getProductCompatibility } from "../lib/build";

function PartVisual({ categoryId }) {
  const labels = {
    cpu: "CPU",
    motherboard: "MB",
    gpu: "GPU",
    memory: "RAM",
    storage: "SSD",
    psu: "PSU",
    case: "CASE",
    cooler: "COOL",
  };

  return (
    <div className={`part-visual part-visual-${categoryId}`} aria-hidden="true">
      <span>{labels[categoryId]}</span>
      <i />
      <i />
      <i />
    </div>
  );
}

export default function ProductCatalog({
  category,
  products,
  selection,
  onChoose,
}) {
  const selectedId = selection[category.id];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingProducts = products.filter((product) =>
      `${product.brand} ${product.name}`.toLowerCase().includes(normalizedQuery),
    );

    if (filter === "主流") return matchingProducts.slice(0, 2);
    if (filter === "高性价比") {
      return [...matchingProducts].sort((a, b) => a.price - b.price).slice(0, 2);
    }
    return matchingProducts;
  }, [filter, products, query]);

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <h1 id="catalog-title">选择{category.shortLabel}</h1>
          <p>已根据当前配置标注兼容情况</p>
        </div>
        <span className="result-count">{visibleProducts.length} 个可选型号</span>
      </div>

      <div className="catalog-toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">搜索品牌或型号</span>
          <input
            placeholder="搜索品牌或型号"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="filter-tabs" aria-label="快捷筛选">
          {["全部", "主流", "高性价比"].map((option) => (
            <button
              className={filter === option ? "active" : ""}
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="product-list">
        {visibleProducts.map((product) => {
          const isSelected = selectedId === product.id;
          const compatibility = getProductCompatibility(
            category.id,
            product,
            selection,
          );
          const isError = compatibility?.level === "error";

          return (
            <article
              className={`product-row${isSelected ? " selected" : ""}${
                isError ? " incompatible" : ""
              }`}
              key={product.id}
            >
              <PartVisual categoryId={category.id} />
              <div className="product-info">
                <h2>{product.name}</h2>
                <div className="spec-list">
                  {product.specs.map((spec) => (
                    <span key={spec}>{spec}</span>
                  ))}
                </div>
                <div
                  className={`row-compatibility ${
                    compatibility?.level ?? "success"
                  }`}
                >
                  {compatibility ? (
                    <TriangleAlert size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{compatibility?.message ?? "与当前配置兼容"}</span>
                </div>
              </div>
              <div className="product-action">
                <strong>¥{product.price.toLocaleString("zh-CN")}</strong>
                <button
                  className={isSelected ? "select-button selected" : "select-button"}
                  type="button"
                  disabled={isError}
                  onClick={() => onChoose(product.id)}
                >
                  {isSelected ? (
                    <>
                      <Check size={17} /> 已选择
                    </>
                  ) : (
                    "选择"
                  )}
                </button>
              </div>
            </article>
          );
        })}
        {visibleProducts.length === 0 ? (
          <div className="empty-products">没有找到匹配的配件，请换个关键词。</div>
        ) : null}
      </div>

      <p className="catalog-note">以上价格为模拟参考价，仅用于界面和流程演示。</p>
    </section>
  );
}
