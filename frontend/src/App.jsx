import { useState, useEffect, useRef } from "react";
import { Search, Download, RotateCcw, Loader2, TrendingUp, Zap, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getSessionId() {
  let id = localStorage.getItem("session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("session_id", id); }
  return id;
}

const STEPS = [
  { label: "Searching real competitors...", icon: Zap },
  { label: "Analyzing pricing, ratings & weaknesses...", icon: TrendingUp },
  { label: "Generating strategic report...", icon: Search },
];

const STATS = [
  { value: "5", label: "Competitors analyzed" },
  { value: "60s", label: "Average report time" },
  { value: "AI Powered", label: "Smart Analysis" },
];

export default function App() {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("idle");
  const [step, setStep] = useState(0);
  const [report, setReport] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const proceedRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/usage/${getSessionId()}`)
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  async function handleAnalyze() {
    if (!product.trim() || !category.trim()) return;
    if (window.gtag) window.gtag("event", "analysis_started", { product, category });

    const proceed = async () => {
      setStatus("loading"); setStep(0); setUpgradeRequired(false);
      const t1 = setTimeout(() => setStep(1), 5000);
      const t2 = setTimeout(() => setStep(2), 12000);
      try {
        const res = await fetch(`${API}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, category, session_id: getSessionId() }),
        });
        clearTimeout(t1); clearTimeout(t2);
        if (res.status === 402) { setUpgradeRequired(true); setStatus("idle"); return; }
        const data = await res.json();
        setReport(data.report);
        setRemaining(data.remaining);
        setStatus("done");
        if (window.gtag) window.gtag("event", "analysis_completed", { product, category });
      } catch {
        clearTimeout(t1); clearTimeout(t2);
        setStatus("error");
        if (window.gtag) window.gtag("event", "analysis_failed", { product, category });
      }
    };

    if (remaining !== null && remaining <= 1 && remaining > 0) {
      proceedRef.current = proceed;
      setConfirmOpen(true);
      return;
    }

    await proceed();
  }

  function handleConfirmContinue() {
    setConfirmOpen(false);
    const fn = proceedRef.current;
    proceedRef.current = null;
    if (fn) fn();
  }

  function handleDownload() {
    const blob = new Blob([`# Competitor Analysis: ${product}\n\n${report}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `${product.replace(/\s+/g, "-")}-analysis.md` }).click();
    URL.revokeObjectURL(url);
    if (window.gtag) window.gtag("event", "report_downloaded", { product });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <header style={{ background: "linear-gradient(160deg, #0a0f1e 0%, #0f1f3d 50%, #0a0f1e 100%)", borderBottom: "1px solid rgba(99,179,237,0.1)", padding: "3.5rem 1rem 3rem" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.25)", borderRadius: 20, padding: "0.3rem 0.9rem", fontSize: "0.75rem", letterSpacing: "0.1em", color: "#63b3ed", marginBottom: "1.25rem", textTransform: "uppercase" }}>
            <TrendingUp size={12} /> AI Market Intelligence
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)", fontWeight: 900, margin: "0 0 0.75rem", letterSpacing: "-0.02em", lineHeight: 1.1, background: "linear-gradient(135deg, #ffffff 0%, #63b3ed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Competitor Analyzer
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 2rem", lineHeight: 1.6 }}>
            5 competitors · Strategic report in 60 seconds
          </p>
          <div className="flex justify-center gap-3 flex-wrap mt-1">
            {STATS.map(({ value, label }) => (
              <Card key={label} size="sm" className="bg-blue-500/5 border-blue-500/20 px-6 py-3 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all duration-200">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-blue-400 leading-none">{value}</div>
                  <div className="text-xs text-slate-500 mt-1.5 tracking-wider uppercase">{label}</div>
                </div>
              </Card>
            ))}
          </div>
          {remaining !== null && (
            <div style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem",
              background: remaining > 0 ? "rgba(99,179,237,0.1)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${remaining > 0 ? "rgba(99,179,237,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 20, padding: "0.35rem 1rem", fontSize: "0.82rem",
              color: remaining > 0 ? "#63b3ed" : "#f87171" }}>
              <ShieldCheck size={13} />
              {remaining > 0 ? `${remaining} free ${remaining === 1 ? "analysis" : "analyses"} remaining this month` : "Free limit reached — upgrade to continue"}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1rem 4rem" }}>

        {upgradeRequired && (
          <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: "0.2rem" }}>Free limit reached</div>
              <div style={{ fontSize: "0.85rem", color: "#d97706" }}>Upgrade to Pro — 50 analyses/month + priority processing</div>
            </div>
            <a href="https://buy.stripe.com/placeholder" target="_blank" rel="noreferrer"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontWeight: 700, padding: "0.6rem 1.5rem", borderRadius: 8, textDecoration: "none", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
              Upgrade — $19/mo →
            </a>
          </div>
        )}

        {status !== "done" && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", backdropFilter: "blur(8px)" }}>
            <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0" }}>Analyze your market</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Product Name</label>
                <Input placeholder="e.g. Wireless Earbuds" value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  disabled={status === "loading"}
                  className="h-12 text-base border-slate-600/50 bg-slate-800/30 placeholder:text-slate-400 focus-visible:border-blue-500/70 focus-visible:ring-blue-500/30" />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <Input placeholder="e.g. Consumer Electronics" value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={status === "loading"}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="h-12 text-base border-slate-600/50 bg-slate-800/30 placeholder:text-slate-400 focus-visible:border-blue-500/70 focus-visible:ring-blue-500/30" />
              </div>
              <Button onClick={handleAnalyze}
                disabled={status === "loading" || !product.trim() || !category.trim()}
                size="lg"
                className="!text-white !bg-linear-to-r !from-blue-500 !to-blue-700 hover:!from-blue-600 hover:!to-blue-800 shadow-lg shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/70 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 mt-2 w-full h-12 text-base font-bold">
                {status === "loading"
                  ? <><Loader2 className="animate-spin" /> Analyzing...</>
                  : <><Search /> Analyze Competitors</>}
              </Button>
            </div>

            {status === "loading" && (
              <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(37,99,235,0.08)", borderRadius: 12, border: "1px solid rgba(37,99,235,0.2)" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>ANALYZING YOUR MARKET</div>
                {STEPS.map(({ label, icon: Icon }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.875rem", opacity: i <= step ? 1 : 0.3, transition: "opacity 0.5s" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      background: i < step ? "rgba(34,197,94,0.2)" : i === step ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${i < step ? "rgba(34,197,94,0.4)" : i === step ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                      color: i < step ? "#4ade80" : i === step ? "#60a5fa" : "#475569" }}>
                      {i < step ? "✓" : i === step ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Icon size={15} />}
                    </div>
                    <span style={{ fontSize: "0.9rem", fontWeight: i === step ? 600 : 400, color: i === step ? "#e2e8f0" : "#64748b" }}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {status === "error" && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#f87171", fontSize: "0.9rem" }}>
                Analysis failed. Please check your API keys and try again.
              </div>
            )}
          </div>
        )}

        {status === "done" && (
          <div>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <button onClick={() => setStatus("idle")} style={btnSecondary}>
                <RotateCcw size={14} /> New Analysis
              </button>
              <button onClick={handleDownload} style={{ ...btnSecondary, borderColor: "rgba(99,179,237,0.4)", color: "#63b3ed" }}>
                <Download size={14} /> Download Report
              </button>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", fontSize: "0.92rem", lineHeight: 1.75 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                h2: (p) => <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#63b3ed", borderBottom: "1px solid rgba(99,179,237,0.2)", paddingBottom: "0.5rem", margin: "2rem 0 0.875rem" }} {...p} />,
                h3: (p) => <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#93c5fd", margin: "1.5rem 0 0.5rem" }} {...p} />,
                p: (p) => <p style={{ color: "#cbd5e1", margin: "0 0 0.875rem" }} {...p} />,
                li: (p) => <li style={{ color: "#cbd5e1", marginBottom: "0.5rem" }} {...p} />,
                strong: (p) => <strong style={{ color: "#e2e8f0", fontWeight: 600 }} {...p} />,
                table: (p) => (
                  <div style={{ overflowX: "auto", margin: "1.25rem 0", borderRadius: 10, border: "1px solid rgba(99,179,237,0.2)" }}>
                    <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }} {...p} />
                  </div>
                ),
                th: (p) => <th style={{ padding: "14px 22px", background: "rgba(37,99,235,0.3)", color: "#93c5fd", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", fontSize: "0.85rem", letterSpacing: "0.03em", borderBottom: "1px solid rgba(99,179,237,0.2)" }} {...p} />,
                td: (p) => <td style={{ padding: "14px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#cbd5e1", verticalAlign: "top", minWidth: 180, lineHeight: 1.7, whiteSpace: "normal" }} {...p} />,
              }}>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem 1rem", textAlign: "center" }}>
        <p style={{ color: "#334155", fontSize: "0.78rem", margin: 0 }}>
          Powered by DeepSeek AI + Tavily · Built for cross-border sellers
        </p>
      </footer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Only {remaining} free analysis left</DialogTitle>
            <DialogDescription>
              You have {remaining} free analysis left.
              Upgrade to Pro ($19/mo) for 50/month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmContinue}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0f1e; }
        input::placeholder { color: #475569; }
        select option { background: #1e293b; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,179,237,0.2); border-radius: 3px; }
      `}</style>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.4rem", letterSpacing: "0.03em" };
const inputStyle = { width: "100%", padding: "0.75rem 1rem", fontSize: "1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#e2e8f0", outline: "none" };
const btnSecondary = { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem", fontSize: "0.875rem", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", color: "#94a3b8" };
