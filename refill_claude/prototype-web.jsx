import { useState, useRef } from "react";
import { Plus, X, ChevronLeft, Clock, Trash2, Camera, Pencil, Undo2 } from "lucide-react";

/* ================================================================== */
/*  TEMA                                                               */
/* ================================================================== */
const C = {
  bg: "#E7ECE7", surface: "#FCFBF7", ink: "#1E3A33", inkSoft: "#67756F",
  line: "#DBE2DC", accent: "#C2702A", accentSoft: "#F1E3D2", green: "#3F7D54",
  pen: "#27408B",
};
const display = "'Bricolage Grotesque', system-ui, sans-serif";
const mono = "'Space Mono', ui-monospace, monospace";
const uid = () => Math.random().toString(36).slice(2, 9);

/* ================================================================== */
/*  ÖRNEK KAĞIT (jenerik — marka yok)                                  */
/* ================================================================== */
const RLABELS = ["Ayı", "Geyik", "Şahin", "Tilki", "Somon", "Habitat", "Jeton"];
const ROWY = [150, 230, 310, 390, 470, 550, 630];
const rowsSvg = ROWY.map((y, i) => `
  <text x='60' y='${y + 8}' font-family='sans-serif' font-size='30' fill='#1E3A33'>${RLABELS[i]}</text>
  <rect x='420' y='${y - 28}' width='120' height='56' rx='8' fill='none' stroke='#C9C7BE' stroke-width='2'/>
  <line x1='60' y1='${y + 44}' x2='540' y2='${y + 44}' stroke='#ECEAE0' stroke-width='1'/>`).join("");
const SAMPLE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 820'>
  <rect width='600' height='820' fill='#FCFBF7'/>
  <rect x='16' y='16' width='568' height='788' rx='18' fill='none' stroke='#DCD9CC' stroke-width='2'/>
  <text x='60' y='66' font-family='sans-serif' font-size='38' font-weight='700' fill='#1E3A33'>Skor kağıdı</text>
  <text x='60' y='122' font-family='sans-serif' font-size='26' fill='#1E3A33'>Oyuncu</text>
  <line x1='230' y1='128' x2='540' y2='128' stroke='#C9C7BE' stroke-width='2'/>
  ${rowsSvg}
  <text x='60' y='738' font-family='sans-serif' font-size='32' font-weight='700' fill='#1E3A33'>TOPLAM</text>
  <rect x='420' y='700' width='120' height='60' rx='8' fill='#F1E3D2' stroke='#C2702A' stroke-width='2'/>
</svg>`;
const SAMPLE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_SVG)}`;

const SAMPLE_ROWS = [
  { id: "r0", y: 112 / 820, label: "Oyuncu" },
  ...ROWY.map((y, i) => ({ id: "r" + (i + 1), y: y / 820, label: RLABELS[i] })),
];

// Sahte el yazısı için kısa karalama üretici
const squiggle = (cx, cy, w = 0.07) => {
  const a = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; a.push({ x: cx - w / 2 + w * t, y: cy + 0.014 * Math.sin(t * Math.PI * 3) }); }
  return a;
};

const INITIAL_LAYOUTS = [
  { id: "demo", name: "Orman skor kağıdı", image: SAMPLE_URL, rows: SAMPLE_ROWS },
];
const INITIAL_SESSIONS = [
  {
    id: "s1", layoutId: "demo", name: "İlk oyun", ts: Date.now() - 86400000,
    values: { r0: "Ahmet", r1: "10", r2: "13", r3: "8" },
    strokes: [
      { rowId: "r0", pts: squiggle(0.45, 0.137, 0.12) },
      { rowId: "r1", pts: squiggle(0.8, 0.183) },
      { rowId: "r2", pts: squiggle(0.8, 0.28) },
      { rowId: "r3", pts: squiggle(0.8, 0.378) },
    ],
  },
];

const fmt = (ts) => new Date(ts).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ================================================================== */
/*  INK KATMANI — strokeları foto üstüne çizer                         */
/* ================================================================== */
function InkLayer({ strokes, current, highlightY }) {
  const pts = (s) => s.map((p) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {highlightY != null && (
        <rect x="0" y={(highlightY - 0.045) * 100} width="100" height="9" fill={C.accent} opacity="0.12" />
      )}
      {strokes.map((s, i) => (
        <polyline key={i} points={pts(s.pts)} fill="none" stroke={C.pen} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {current && current.length > 1 && (
        <polyline points={pts(current)} fill="none" stroke={C.pen} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/* ================================================================== */
/*  ORTAK PARÇALAR                                                     */
/* ================================================================== */
const Shell = ({ children }) => (
  <div style={{ background: C.bg, minHeight: 560, fontFamily: "system-ui, sans-serif" }}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Space+Mono:wght@400;700&display=swap');`}</style>
    <div style={{ maxWidth: 430, margin: "0 auto", position: "relative" }}>{children}</div>
  </div>
);
const TopBar = ({ title, onBack, action }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 14px 8px" }}>
    {onBack && (
      <button onClick={onBack} style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.line}`, color: C.ink }} aria-label="geri"><ChevronLeft size={20} /></button>
    )}
    <div style={{ flex: 1, fontFamily: display, fontWeight: 700, fontSize: 18, color: C.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
    {action}
  </div>
);
const PrimaryBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 18px", borderRadius: 12, background: C.ink, color: C.surface, fontWeight: 600, fontSize: 15 }}>{children}</button>
);

/* ================================================================== */
/*  ANA UYGULAMA                                                       */
/* ================================================================== */
export default function FotoSkorKalem() {
  const [layouts, setLayouts] = useState(INITIAL_LAYOUTS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [view, setView] = useState({ name: "home" });
  const fileRef = useRef(null);
  const liveRef = useRef(null);          // o an çizilen stroke noktaları
  const [liveStroke, setLiveStroke] = useState(null); // canlı çizim render'ı

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setView({ name: "setup", draft: { id: null, name: "", image: r.result, rows: [] } });
    r.readAsDataURL(f); e.target.value = "";
  };

  /* ---------- HOME ---------- */
  if (view.name === "home") {
    return (
      <Shell>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        <div style={{ padding: "22px 18px 4px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: C.accent, textTransform: "uppercase" }}>Foto skor · kalem</div>
          <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 26, color: C.ink, margin: "2px 0 0" }}>Kağıtlarım</h1>
        </div>
        <div style={{ padding: "12px 14px 16px" }}>
          {layouts.map((l) => {
            const count = sessions.filter((s) => s.layoutId === l.id).length;
            return (
              <div key={l.id} style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, marginBottom: 12 }}>
                <button onClick={() => setView({ name: "setup", draft: { ...l, rows: [...l.rows] } })} style={{ width: 60, height: 78, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.line}`, flexShrink: 0, background: "#fff" }}>
                  <img src={l.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </button>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: C.ink }}>{l.name || "İsimsiz kağıt"}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: mono }}>{l.rows.length} satır · {count} oyun</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { const n = count + 1; setView({ name: "play", layoutId: l.id, gameName: `Oyun ${n}`, strokes: [], values: {}, highlight: null }); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, background: C.ink, color: C.surface, fontSize: 13, fontWeight: 600 }}><Pencil size={13} /> Yeni oyun</button>
                    <button onClick={() => setView({ name: "history", layoutId: l.id })}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, background: "transparent", color: C.inkSoft, fontSize: 13, fontWeight: 600, border: `1px solid ${C.line}` }}><Clock size={13} /> Geçmiş</button>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "16px", borderRadius: 16, border: `2px dashed ${C.line}`, background: "transparent", color: C.ink, fontWeight: 600, fontSize: 15 }}>
            <Camera size={18} /> Yeni kağıt ekle
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------- SETUP (satırları işaretle) ---------- */
  if (view.name === "setup") {
    const d = view.draft;
    const ref2 = { current: null };
    const setDraft = (patch) => setView({ ...view, draft: { ...d, ...patch } });
    const save = () => {
      if (d.id) setLayouts((ls) => ls.map((l) => (l.id === d.id ? { ...d, name: d.name || "İsimsiz kağıt" } : l)));
      else setLayouts((ls) => [...ls, { ...d, id: uid(), name: d.name || "İsimsiz kağıt" }]);
      setView({ name: "home" });
    };
    const addRow = (e) => {
      const host = e.currentTarget.getBoundingClientRect();
      const y = Math.min(1, Math.max(0, (e.clientY - host.top) / host.height));
      setDraft({ rows: [...d.rows, { id: uid(), y, label: "" }].sort((a, b) => a.y - b.y) });
    };
    return (
      <Shell>
        <TopBar title="Satırları işaretle" onBack={() => setView({ name: "home" })} action={<PrimaryBtn onClick={save}>Kaydet</PrimaryBtn>} />
        <div style={{ padding: "0 14px 8px", fontSize: 13, color: C.inkSoft }}>
          Her puan satırının hizasına <b style={{ color: C.ink }}>dokun</b> — yazılanlar o satıra bağlanır. İstersen satıra isim ver.
        </div>
        <div style={{ padding: "0 14px" }}>
          <input value={d.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="Kağıda bir isim ver"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 11, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 15, outline: "none", marginBottom: 12 }} />
          <div ref={(el) => (ref2.current = el)} onClick={addRow} style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, cursor: "crosshair", background: C.surface }}>
            <img src={d.image} alt="" style={{ display: "block", width: "100%" }} />
            {d.rows.map((r) => (
              <div key={r.id} style={{ position: "absolute", left: 0, right: 0, top: `${r.y * 100}%`, transform: "translateY(-50%)", height: 0, borderTop: `2px dashed ${C.accent}` }} />
            ))}
          </div>
          {d.rows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {d.rows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, width: 22 }}>{i + 1}.</span>
                  <input value={r.label} onChange={(e) => setDraft({ rows: d.rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)) })} placeholder={`Satır ${i + 1} (opsiyonel isim)`}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 14, outline: "none" }} />
                  <button onClick={() => setDraft({ rows: d.rows.filter((x) => x.id !== r.id) })} style={{ display: "grid", placeItems: "center", width: 30, height: 30, color: C.inkSoft }} aria-label="sil"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 20 }} />
        </div>
      </Shell>
    );
  }

  /* ---------- PLAY (kalemle yaz) ---------- */
  if (view.name === "play") {
    const layout = layouts.find((l) => l.id === view.layoutId);
    const { strokes, values, gameName, highlight } = view;
    const set = (patch) => setView({ ...view, ...patch });

    const ptFrom = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };
    const nearestRow = (cy) => {
      let best = null, bd = Infinity;
      for (const r of layout.rows) { const dd = Math.abs(r.y - cy); if (dd < bd) { bd = dd; best = r.id; } }
      return best;
    };

    const onPointerDown = (e) => {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
      liveRef.current = [ptFrom(e)];
      setLiveStroke([...liveRef.current]);
    };
    const onPointerMove = (e) => {
      if (!liveRef.current) return;
      liveRef.current.push(ptFrom(e));
      setLiveStroke([...liveRef.current]);
    };
    const finish = (e) => {
      const p = liveRef.current;
      if (!p) return;
      liveRef.current = null;
      setLiveStroke(null);
      if (p.length > 1) {
        const cy = p.reduce((s, q) => s + q.y, 0) / p.length;
        const rowId = nearestRow(cy);
        setView((v) => ({ ...v, strokes: [...v.strokes, { rowId, pts: p }], highlight: rowId }));
      }
    };

    const undo = () => set({ strokes: strokes.slice(0, -1) });
    const rowHasInk = (id) => strokes.some((s) => s.rowId === id);
    const save = () => {
      const n = sessions.filter((s) => s.layoutId === layout.id).length + 1;
      setSessions((ss) => [...ss, { id: uid(), layoutId: layout.id, name: (gameName || "").trim() || `Oyun ${n}`, ts: Date.now(), strokes, values }]);
      setView({ name: "history", layoutId: layout.id });
    };

    return (
      <Shell>
        <TopBar title={layout.name} onBack={() => setView({ name: "home" })}
          action={<button onClick={undo} disabled={!strokes.length} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.line}`, color: strokes.length ? C.ink : C.inkSoft, fontSize: 13, fontWeight: 600 }}><Undo2 size={15} /> Geri al</button>} />
        <div style={{ padding: "0 14px 16px" }}>
          <input value={gameName} onChange={(e) => set({ gameName: e.target.value })} placeholder="Oyun adı (ör. Cuma akşamı)"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 11, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 15, outline: "none", marginBottom: 12 }} />

          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Pencil size={13} /> Kağıdın üzerine parmağınla/kalemle yaz
          </div>
          <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}
            style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, background: C.surface, touchAction: "none", cursor: "crosshair" }}>
            <img src={layout.image} alt="" style={{ display: "block", width: "100%" }} draggable={false} />
            <InkLayer strokes={strokes} current={liveStroke} highlightY={highlight != null ? (layout.rows.find((r) => r.id === highlight)?.y) : null} />
          </div>

          {/* Tanınan değerler paneli */}
          <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}`, fontFamily: display, fontWeight: 700, fontSize: 14, color: C.ink, display: "flex", justifyContent: "space-between" }}>
              <span>Tanınan değerler</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, fontWeight: 400 }}>yazınca otomatik gelir · düzeltilebilir</span>
            </div>
            <div style={{ padding: "4px 14px 10px" }}>
              {layout.rows.map((r, i) => {
                const inked = rowHasInk(r.id);
                const empty = !values[r.id];
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ flex: 1, fontSize: 14, color: C.ink, minWidth: 0 }}>{r.label || `Satır ${i + 1}`}</span>
                    {inked && empty && <span style={{ fontSize: 11, color: C.accent, fontFamily: mono }}>✏ yazıldı</span>}
                    <input value={values[r.id] || ""} onChange={(e) => set({ values: { ...values, [r.id]: e.target.value } })}
                      onFocus={() => set({ highlight: r.id })} placeholder="–"
                      style={{ width: 84, textAlign: "center", padding: "8px 8px", borderRadius: 9, fontFamily: mono, fontSize: 15,
                        border: `2px solid ${inked && empty ? C.accent : C.line}`, background: inked && empty ? C.accentSoft : "transparent", color: C.ink, outline: "none" }} />
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={save} style={{ width: "100%", marginTop: 14, padding: "15px 18px", borderRadius: 14, background: C.ink, color: "#fff", fontWeight: 700, fontSize: 16, boxShadow: "0 8px 24px rgba(30,58,51,0.28)" }}>Oyunu kaydet</button>
        </div>
      </Shell>
    );
  }

  /* ---------- HISTORY ---------- */
  if (view.name === "history") {
    const layout = layouts.find((l) => l.id === view.layoutId);
    const list = sessions.filter((s) => s.layoutId === layout.id).sort((a, b) => b.ts - a.ts);
    return (
      <Shell>
        <TopBar title={`${layout.name} · Geçmiş`} onBack={() => setView({ name: "home" })}
          action={<PrimaryBtn onClick={() => { const n = list.length + 1; setView({ name: "play", layoutId: layout.id, gameName: `Oyun ${n}`, strokes: [], values: {}, highlight: null }); }}><Plus size={16} /> Oyun</PrimaryBtn>} />
        <div style={{ padding: "8px 14px 20px" }}>
          {list.length === 0 && <div style={{ textAlign: "center", color: C.inkSoft, padding: "48px 20px", fontSize: 14 }}>Henüz oyun yok. Üstteki <b style={{ color: C.ink }}>Oyun</b> ile ilkini yaz.</div>}
          {list.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
              <button onClick={() => setView({ name: "session", sessionId: s.id })} style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 15, color: C.ink }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: mono }}>{fmt(s.ts)} · {s.strokes.length} kalem izi</div>
              </button>
              <button onClick={() => setSessions((ss) => ss.filter((x) => x.id !== s.id))} style={{ display: "grid", placeItems: "center", width: 32, height: 32, color: C.inkSoft }} aria-label="sil"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  /* ---------- SESSION (salt-okunur) ---------- */
  if (view.name === "session") {
    const s = sessions.find((x) => x.id === view.sessionId);
    const layout = layouts.find((l) => l.id === s.layoutId);
    return (
      <Shell>
        <TopBar title={s.name} onBack={() => setView({ name: "history", layoutId: layout.id })} />
        <div style={{ padding: "0 14px 24px" }}>
          <div style={{ padding: "0 2px 10px", fontSize: 12, color: C.inkSoft, fontFamily: mono }}>{fmt(s.ts)}</div>
          <div style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, background: C.surface }}>
            <img src={layout.image} alt="" style={{ display: "block", width: "100%" }} />
            <InkLayer strokes={s.strokes} current={null} highlightY={null} />
          </div>
          <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}`, fontFamily: display, fontWeight: 700, fontSize: 14, color: C.ink }}>Kaydedilen veri</div>
            <div style={{ padding: "4px 14px 10px" }}>
              {layout.rows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ fontSize: 14, color: C.ink }}>{r.label || `Satır ${i + 1}`}</span>
                  <span style={{ fontFamily: mono, fontSize: 15, color: s.values[r.id] ? C.ink : C.inkSoft }}>{s.values[r.id] || "–"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}
