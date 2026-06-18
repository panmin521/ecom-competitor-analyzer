import { useState, useEffect } from "react";
import { Search, Download, RotateCcw, Loader2, TrendingUp, Zap, Globe, ShieldCheck, BarChart2, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getSessionId() {
  let id = localStorage.getItem("session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("session_id", id); }
  return id;
}

const STEPS = [
  { label: "Searching real competitors on Amazon...", icon: Globe },
  { label: "Analyzing pricing, ratings & weaknesses...", icon: BarChart2 },
  { label: "Generating strategic report...", icon: Zap },
];

const STATS = [
  { value: "5", label: "Competitors analyzed" },
  { value: "60s", label: "Average report time" },
  { value: "100%", label: "Real Amazon data" },
];

const COLORS = ["#e8533e", "#f5a623", "#50c8a8", "#4e9af1", "#a78bfa", "#94a3b8"];

function MarketTab() {
  const [product, setProduct] = useState("");
  const [site, setSite] = useState("US");
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);

  async function handleSearch() {
    if (!product.trim()) return;
    setStatus("loading");
    try {
      const r = await fetch(`${API}/market-report?product=${encodeURIComponent(product)}&site=${site}`);
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
      setStatus("done");
    } catch (e) {
      setStatus("error");
    }
  }

  const cat = data?.category || {};
  const top10 = (data?.top100 || []).slice(0, 10);

  const brandMap = {};
  (data?.top100 || []).forEach(p => {
    const b = p["品牌"] || "Other";
    brandMap[b] = (brandMap[b] || 0) + (Number(p["月销量"]) || 0);
  });
  const brands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalBrandSales = brands.reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      {/* Search bar */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0" }}>Amazon Market Intelligence</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input placeholder="e.g. handheld fan" value={product}
            onChange={e => setProduct(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ ...inputStyle, flex: "1 1 200px" }} />
          <select value={site} onChange={e => setSite(e.target.value)}
            style={{ padding: "0.75rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#e2e8f0", fontSize: "1rem" }}>
            {["US", "GB", "DE", "FR", "CA", "JP"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleSearch} disabled={status === "loading" || !product.trim()}
            style={{ padding: "0.75rem 1.5rem", fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {status === "loading"
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading...</>
              : <><BarChart2 size={16} /> Get Data</>}
          </button>
        </div>
        {status === "error" && <div style={{ marginTop: "0.875rem", color: "#f87171", fontSize: "0.875rem" }}>Failed — check API key or try a different keyword.</div>}
      </div>

      {status === "done" && data && (
        <>
          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: cat["类目名称"] || "Category", value: Number(cat["Top100产品月销量"] || 0).toLocaleString(), sub: "Top100 月销量" },
              { label: "AVG PRICE", value: "$" + (cat["平均价格"] || "—"), sub: site + " 平均价格" },
              { label: "HOT SEASON", value: cat["旺季"] || "—", sub: "最佳销售月份" },
              { label: "CN SELLERS", value: cat["中国卖家占比"] || "—", sub: "中国卖家占比" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>{label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e8533e", lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.3rem" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Brand bars */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "1rem", fontSize: "0.95rem" }}>🏆 品牌分布（月销量）</div>
            {brands.map(([brand, sales], i) => {
              const pct = Math.round((sales / totalBrandSales) * 100);
              return (
                <div key={brand} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i], flexShrink: 0 }} />
                  <div style={{ width: 110, fontSize: "0.82rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{brand}</div>
                  <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: COLORS[i], borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", width: 36, textAlign: "right", flexShrink: 0 }}>{pct}%</div>
                </div>
              );
            })}
          </div>

          {/* TOP10 table */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.5rem", overflowX: "auto" }}>
            <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "1rem", fontSize: "0.95rem" }}>🔥 TOP10 产品</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  {["#", "品牌", "价格", "月销量", "月销额", "评论数", "星级", "毛利率"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10.map((p, i) => (
                  <tr key={p["ASIN"]}>
                    <td style={tdStyle}><span style={{ color: "#e8533e", fontWeight: 700 }}>{i + 1}</span></td>
                    <td style={tdStyle}>{p["品牌"]}</td>
                    <td style={tdStyle}>${p["价格"]}</td>
                    <td style={{ ...tdStyle, color: "#4ade80", fontWeight: 600 }}>{Number(p["月销量"]).toLocaleString()}</td>
                    <td style={tdStyle}>${Number(p["月销额"]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td style={tdStyle}>{Number(p["评论数"]).toLocaleString()}</td>
                    <td style={{ ...tdStyle, color: "#fbbf24" }}>{p["星级"]}★</td>
                    <td style={tdStyle}>{p["毛利率"]}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("competitor");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("idle");
  const [step, setStep] = useState(0);
  const [report, setReport] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    fetch(`${API}/usage/${getSessionId()}`)
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  async function handleAnalyze() {
    if (!product.trim() || !category.trim()) return;
    if (window.gtag) window.gtag("event", "analysis_started", { product, category });
    if (remaining !== null && remaining <= 1 && remaining > 0) {
      const go = window.confirm(`You have ${remaining} free analysis left.\nUpgrade to Pro ($19/mo) for 50/month.\n\nContinue?`);
      if (!go) return;
    }
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
            Real Amazon data · 5 competitors · Strategic report in 60 seconds
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            {STATS.map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#63b3ed", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.3rem", letterSpacing: "0.05em" }}>{label.toUpperCase()}</div>
              </div>
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

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "4px" }}>
          {[
            { id: "competitor", icon: Search, label: "Competitor Analysis" },
            { id: "market", icon: Database, label: "Market Data" },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                padding: "0.6rem 1rem", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: "0.875rem", fontWeight: 600, transition: "all 0.15s",
                background: tab === id ? "rgba(37,99,235,0.6)" : "transparent",
                color: tab === id ? "#e2e8f0" : "#64748b" }}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {tab === "market" && <MarketTab />}

        {tab === "competitor" && (
          <>
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
                    <input placeholder="e.g. Wireless Earbuds" value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      disabled={status === "loading"} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <input placeholder="e.g. Consumer Electronics" value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={status === "loading"}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} style={inputStyle} />
                  </div>
                  <button onClick={handleAnalyze}
                    disabled={status === "loading" || !product.trim() || !category.trim()}
                    style={{ marginTop: "0.5rem", padding: "0.9rem", fontSize: "1rem", fontWeight: 700,
                      background: status === "loading" || !product.trim() || !category.trim() ? "rgba(99,179,237,0.3)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#fff", border: "none", borderRadius: 10, cursor: status === "loading" ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                      boxShadow: "0 4px 15px rgba(37,99,235,0.4)", transition: "opacity 0.2s" }}>
                    {status === "loading"
                      ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Analyzing...</>
                      : <><Search size={18} /> Analyze Competitors</>}
                  </button>
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
          </>
        )}
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem 1rem", textAlign: "center" }}>
        <p style={{ color: "#334155", fontSize: "0.78rem", margin: 0 }}>
          Powered by DeepSeek AI + Tavily · Sorftime Amazon Data · Built for cross-border sellers
        </p>
      </footer>

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
const tdStyle = { padding: "8px 12px", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.05)" };
