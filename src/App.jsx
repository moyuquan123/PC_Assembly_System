import { useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import BuilderScreen from "./components/BuilderScreen";
import BuildModal from "./components/BuildModal";
import SavedScreen from "./components/SavedScreen";
import SetupScreen from "./components/SetupScreen";
import { categories, demoSelection } from "./data/parts";
import { calculateBuild, checkCompatibility } from "./lib/build";

const storageKey = "pc-assembly-demo-build-v1";

function readSavedBuild() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [form, setForm] = useState({
    budget: "8000",
    usage: "游戏",
    name: "我的游戏主机",
  });
  const [selection, setSelection] = useState({});
  const [activeCategoryId, setActiveCategoryId] = useState("cpu");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [savedBuild, setSavedBuild] = useState(() => readSavedBuild());

  const build = useMemo(() => calculateBuild(selection), [selection]);
  const issues = useMemo(() => checkCompatibility(selection), [selection]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const startNewBuild = () => {
    setSelection({});
    setActiveCategoryId("cpu");
    setScreen("builder");
  };

  const continueDemo = () => {
    setSelection(demoSelection);
    setActiveCategoryId("case");
    setScreen("builder");
  };

  const choosePart = (productId) => {
    setSelection((current) => ({
      ...current,
      [activeCategoryId]: productId,
    }));

    const currentIndex = categories.findIndex(
      (category) => category.id === activeCategoryId,
    );
    const nextIncomplete = categories.find(
      (category, index) => index > currentIndex && !selection[category.id],
    );
    if (nextIncomplete) setActiveCategoryId(nextIncomplete.id);
  };

  const saveBuild = () => {
    if (screen !== "builder") {
      if (savedBuild) {
        setForm(savedBuild.form);
        setSelection(savedBuild.selection);
        setActiveCategoryId(savedBuild.activeCategoryId ?? "cpu");
        setScreen("builder");
      } else {
        setScreen("setup");
      }
      return;
    }

    const snapshot = {
      form,
      selection,
      activeCategoryId,
      total: build.total,
      progress: build.progress,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    setSavedBuild(snapshot);
    showToast("配置已保存到当前浏览器");
  };

  const navigate = (target) => {
    if (target === "saved") setSavedBuild(readSavedBuild());
    setScreen(target);
  };

  const openSavedBuild = () => {
    if (!savedBuild) return;
    setForm(savedBuild.form);
    setSelection(savedBuild.selection);
    setActiveCategoryId(savedBuild.activeCategoryId ?? "cpu");
    setScreen("builder");
  };

  const copyBuild = async () => {
    const lines = [
      form.name,
      ...build.selectedParts.map((part) => `${part.name}  ¥${part.price}`),
      `总价：¥${build.total}`,
      `预计功耗：${build.estimatedPower}W`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast("配置单已复制");
    } catch {
      showToast("当前浏览器不支持自动复制");
    }
  };

  return (
    <div className="app-shell">
      <AppHeader screen={screen} onNavigate={navigate} onSave={saveBuild} />

      {screen === "setup" ? (
        <SetupScreen
          form={form}
          setForm={setForm}
          onStart={startNewBuild}
          onContinue={continueDemo}
        />
      ) : null}

      {screen === "builder" ? (
        <BuilderScreen
          form={form}
          selection={selection}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          onChoose={choosePart}
          build={build}
          issues={issues}
          onOpenSummary={() => setIsSummaryOpen(true)}
          onEditSetup={() => setScreen("setup")}
        />
      ) : null}

      {screen === "saved" ? (
        <SavedScreen savedBuild={savedBuild} onOpen={openSavedBuild} onStart={() => setScreen("setup")} />
      ) : null}

      <BuildModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        build={build}
        budget={Number(form.budget)}
        buildName={form.name}
        issues={issues}
        onCopy={copyBuild}
      />

      <div className={toast ? "toast visible" : "toast"} role="status">
        {toast}
      </div>
    </div>
  );
}
