'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  uid, fmtDate, fmtMonth, addDays, daysUntil, todayStr,
  fmtRp, fmtRpFull, pctStr, pctColor, dueStatus,
  computeStats, genRecs, exportCSV, JENIS_OPTIONS, jenisLabel
} from '@/lib/utils'

// ─── LOCAL STORAGE HOOK ─────────────────────────────────────────────────────
function useLS(key, init) {
  const [state, setState] = useState(init)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try { const d = localStorage.getItem(key); if (d) setState(JSON.parse(d)) } catch {}
    setReady(true)
  }, [key])
  const set = useCallback((val) => {
    setState(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])
  return [state, set, ready]
}

// ─── TOAST ──────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800)
  }, [])
  return { toasts, show }
}
function Toasts({ toasts }) {
  const icons = { success: '✓', error: '⚠', info: 'ℹ' }
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="flex items-center gap-2 bg-ink text-white px-4 py-2.5 rounded-full text-sm font-medium shadow-lg animate-fade-up">
          <span>{icons[t.type] || '✓'}</span>{t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg animate-scale-in">
        <h2 className="font-serif text-xl text-ink mb-1">{title}</h2>
        {subtitle && <p className="text-xs text-ink-2 mb-5">{subtitle}</p>}
        {children}
        {footer && <div className="flex gap-2 justify-end mt-6 pt-5 border-t border-paper-3">{footer}</div>}
      </div>
    </div>
  )
}

// ─── BADGES ─────────────────────────────────────────────────────────────────
const TokoBadge = ({ t }) => t === 'Toko Lama'
  ? <span className="badge badge-cobalt">🏪 {t}</span>
  : <span className="badge badge-plum">🆕 {t}</span>

const ResBadge = ({ r }) => {
  if (!r) return null
  const m = { naik: ['badge-jade','↑ Naik'], turun: ['badge-rose','↓ Turun'], netral: ['badge-gray','→ Netral'] }
  return <span className={`badge ${m[r]?.[0]}`}>{m[r]?.[1]}</span>
}

const DuePill = ({ reviewDate, done }) => {
  const { label, cls } = dueStatus(reviewDate, done)
  return <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>
}

// ─── SVG CHARTS ─────────────────────────────────────────────────────────────
function DonutChart({ data, size = 120 }) {
  const R = 42, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * R
  const total = data.reduce((s, d) => s + d.v, 0)
  let offset = 0
  const arcs = total > 0 ? data.map(d => {
    const len = (d.v / total) * circ
    const arc = <circle key={d.label} cx={cx} cy={cy} r={R} fill="none" stroke={d.color} strokeWidth="12"
      strokeDasharray={`${len.toFixed(2)} ${circ.toFixed(2)}`} strokeDashoffset={(-offset).toFixed(2)} />
    offset += len; return arc
  }) : null
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e8e5de" strokeWidth="12" />
      {arcs}
    </svg>
  )
}

function BarChart({ data, height = 160 }) {
  const max = Math.max(...data.map(d => d.v), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bold text-ink-2">{d.v}</span>
          <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${(d.v / max) * (height - 30)}px`, background: d.color }} />
          <span className="text-[9px] text-ink-3 text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ value, max, color = '#2d8a6e', label, showPct = true }) {
  const pct = max > 0 ? Math.min(Math.round(value / max * 100), 100) : 0
  return (
    <div>
      {label && <div className="flex justify-between text-xs mb-1"><span className="text-ink-2 truncate mr-2">{label}</span>{showPct && <span className="font-bold shrink-0" style={{ color }}>{pct}%</span>}</div>}
      <div className="h-2 rounded-full bg-paper-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color = 'text-ink', sub }) {
  return (
    <div className="card relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150 cursor-default">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-semibold leading-none mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
      {sub && <div className="text-[11px] font-bold text-rose mt-1">{sub}</div>}
      <div className="absolute right-[-6px] bottom-[-8px] text-5xl opacity-[.05] pointer-events-none select-none">{icon}</div>
    </div>
  )
}

// ─── METRIC MINI ─────────────────────────────────────────────────────────────
function MetricMini({ label, before, after, format }) {
  const fmt = format || (v => v)
  const diff = pctStr(before, after)
  const cls = pctColor(before, after)
  return (
    <div className="bg-paper rounded-lg p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{after != null ? fmt(after) : before != null ? fmt(before) : '—'}</div>
      {diff && <div className={`text-[11px] font-bold mt-0.5 ${cls}`}>{diff}</div>}
    </div>
  )
}

// ─── CHANGE CARD ─────────────────────────────────────────────────────────────
function ChangeCard({ c, onReview, onDelete }) {
  const [open, setOpen] = useState(false)
  const priBadge = c.prio === 'tinggi' ? <span className="badge badge-rose">🔴 Prioritas</span> : null
  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-card transition-all duration-150 hover:shadow-lg hover:-translate-y-px ${open ? 'border-paper-3' : 'border-paper-3/80'}`}>
      <button className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-paper transition-colors text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <TokoBadge t={c.toko} />
          <span className="badge badge-gray">{jenisLabel(c.jenis)}</span>
          {c.done && <ResBadge r={c.result} />}
          {priBadge}
        </div>
        <div className="flex-1 text-sm font-semibold text-ink truncate px-2">{c.produk}</div>
        <div className="flex items-center gap-2 shrink-0">
          <DuePill reviewDate={c.reviewDate} done={c.done} />
          <span className="text-xs text-ink-3">{fmtDate(c.tanggal)}</span>
          <span className={`text-ink-3 text-lg transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>›</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-paper-3 animate-slide-down">
          {c.reason && <p className="text-xs text-ink-2 py-3 leading-relaxed"><strong className="text-ink">Tujuan:</strong> {c.reason}</p>}

          {/* Before / After */}
          <div className="grid grid-cols-[1fr_20px_1fr] gap-2 my-4 items-start">
            <div className="bg-paper rounded-lg p-3 border-l-[3px] border-rose">
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1">Sebelum</div>
              <div className="text-sm leading-relaxed">{c.before}</div>
            </div>
            <div className="flex items-center justify-center text-ink-3 mt-5">→</div>
            <div className="bg-paper rounded-lg p-3 border-l-[3px] border-jade">
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1">Sesudah</div>
              <div className="text-sm leading-relaxed">{c.after}</div>
            </div>
          </div>

          {/* Baseline metrics */}
          {(c.m0?.sold || c.m0?.views || c.m0?.rev || c.m0?.roas) && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <MetricMini label="Terjual" before={c.m0.sold} />
              <MetricMini label="Pengunjung" before={c.m0.views} />
              <MetricMini label="Pendapatan" before={c.m0.rev} format={fmtRp} />
              <MetricMini label="ROAS" before={c.m0.roas} format={v => v + '×'} />
            </div>
          )}

          {/* Result */}
          {c.done && c.m1 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-2">Hasil Evaluasi · {fmtDate(c.reviewDate)}</div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <MetricMini label="Terjual" before={c.m0?.sold} after={c.m1?.sold} />
                <MetricMini label="Pengunjung" before={c.m0?.views} after={c.m1?.views} />
                <MetricMini label="Pendapatan" before={c.m0?.rev} after={c.m1?.rev} format={fmtRp} />
                <MetricMini label="Konversi" before={c.m0?.cvr} after={c.m1?.cvr} format={v => v + '%'} />
              </div>
              {c.result && (
                <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-3 ${c.result === 'naik' ? 'bg-jade-bg' : c.result === 'turun' ? 'bg-rose-bg' : 'bg-paper-2'}`}>
                  <span className="text-xl">{c.result === 'naik' ? '🎉' : c.result === 'turun' ? '📉' : '😐'}</span>
                  <span className={`text-sm font-semibold ${c.result === 'naik' ? 'text-jade-txt' : c.result === 'turun' ? 'text-rose-txt' : 'text-ink-2'}`}>
                    {c.result === 'naik' ? 'Perubahan BERHASIL meningkatkan performa!' : c.result === 'turun' ? 'Perubahan tidak efektif — perlu evaluasi ulang' : 'Tidak ada perubahan signifikan'}
                  </span>
                </div>
              )}
              {c.resultNotes && <p className="text-xs text-ink-2 italic mb-3">"{c.resultNotes}"</p>}
            </>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            {!c.done
              ? <button className="btn btn-primary btn-sm" onClick={() => onReview(c.id)}>✏ Isi Evaluasi</button>
              : <button className="btn btn-jade btn-sm" disabled>✓ Dievaluasi</button>
            }
            <button className="btn btn-sm text-rose-txt hover:bg-rose-bg" onClick={() => onDelete(c.id)}>🗑 Hapus</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── REVIEW MODAL CONTENT ────────────────────────────────────────────────────
function ReviewForm({ c, onSave }) {
  const [form, setForm] = useState({ sold:'', views:'', rev:'', cvr:'', roas:'', ulasan:'', result:'naik', notes:'' })
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div>
      <p className="text-xs text-ink-2 mb-4 leading-relaxed">Isi metrik aktual setelah <strong>{c.reviewDays} hari</strong>. Ambil dari Seller Centre (periode 7 hari yang sama).</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="field"><label>Terjual sesudah</label><input type="number" placeholder={c.m0?.sold || 0} value={form.sold} onChange={s('sold')} min="0" /></div>
        <div className="field"><label>Pengunjung sesudah</label><input type="number" placeholder={c.m0?.views || 0} value={form.views} onChange={s('views')} min="0" /></div>
        <div className="field"><label>Pendapatan (Rp)</label><input type="number" placeholder={c.m0?.rev || 0} value={form.rev} onChange={s('rev')} min="0" /></div>
        <div className="field"><label>Konversi (%)</label><input type="number" placeholder={c.m0?.cvr || 0} value={form.cvr} onChange={s('cvr')} step="0.1" min="0" /></div>
        <div className="field"><label>ROAS Iklan</label><input type="number" placeholder={c.m0?.roas || 0} value={form.roas} onChange={s('roas')} step="0.1" min="0" /></div>
        <div className="field"><label>Jumlah Ulasan</label><input type="number" placeholder={c.m0?.ulasan || 0} value={form.ulasan} onChange={s('ulasan')} min="0" /></div>
      </div>
      <div className="field">
        <label>Hasil Keseluruhan</label>
        <select value={form.result} onChange={s('result')}>
          <option value="naik">🎉 Naik — perubahan berhasil!</option>
          <option value="turun">📉 Turun — tidak efektif</option>
          <option value="netral">😐 Netral — tidak signifikan</option>
        </select>
      </div>
      <div className="field">
        <label>Pembelajaran & Catatan</label>
        <textarea placeholder="Apa yang dipelajari? Faktor apa yang mempengaruhi hasilnya?" value={form.notes} onChange={s('notes')} />
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-primary" onClick={() => onSave({ ...form, sold:+form.sold||null, views:+form.views||null, rev:+form.rev||null, cvr:+form.cvr||null, roas:+form.roas||null, ulasan:+form.ulasan||null })}>Simpan Hasil</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function Dashboard({ DB, onReview, goTo }) {
  const s = computeStats(DB)
  const recs = genRecs(DB)

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <h1 className="font-serif text-3xl text-ink mb-1">Dashboard</h1>
        <p className="text-sm text-ink-2">Ringkasan semua perubahan & hasil evaluasi tokomu.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard icon="📋" value={s.total} label="Total Perubahan" color="text-cobalt" />
        <StatCard icon="🎯" value={`${s.rate}%`} label="Win Rate" color={s.rate >= 50 ? 'text-jade' : 'text-rose'} />
        <StatCard icon="↑" value={s.naik.length} label="Berhasil Naik" color="text-jade" />
        <StatCard icon="⏳" value={s.pending.length} label="Menunggu Review" color={s.pending.length > 0 ? 'text-gold' : 'text-ink'} sub={s.overdue.length ? `${s.overdue.length} overdue!` : null} />
        <StatCard icon="💰" value={s.revGain > 0 ? fmtRp(s.revGain) : '—'} label="Estimasi Gain" color="text-jade" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pending */}
        <div className="card">
          <div className="card-title">🕐 Menunggu Review</div>
          {s.pending.length === 0
            ? <div className="text-center py-5 text-ink-3 text-sm">🎉 Semua sudah dievaluasi!</div>
            : <>
                {s.pending.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-paper-3 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{c.produk}</div>
                      <div className="text-xs text-ink-2">{jenisLabel(c.jenis)} · {c.toko}</div>
                    </div>
                    <DuePill reviewDate={c.reviewDate} done={false} />
                    <button className="btn btn-primary btn-xs" onClick={() => onReview(c.id)}>Isi</button>
                  </div>
                ))}
                {s.pending.length > 4 && <div className="text-xs text-ink-2 mt-2">+{s.pending.length - 4} lainnya...</div>}
              </>
          }
        </div>

        {/* Win rate bars */}
        <div className="card">
          <div className="card-title">📈 Win Rate per Jenis</div>
          {Object.keys(s.byType).length === 0
            ? <div className="text-sm text-ink-3">Belum ada data evaluasi.</div>
            : Object.entries(s.byType).sort((a, b) => (b[1].n / b[1].t) - (a[1].n / a[1].t)).slice(0, 7).map(([type, st]) => {
                const p = Math.round(st.n / st.t * 100)
                const col = p >= 60 ? '#2d8a6e' : p >= 40 ? '#c17d2a' : '#e85d4a'
                return <ProgressBar key={type} value={st.n} max={st.t} color={col} label={jenisLabel(type)} />
              }).reduce((acc, el, i) => [...acc, i > 0 ? <div key={`sp-${i}`} className="mb-2" /> : null, el], [])
          }
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommendations */}
        <div className="card">
          <div className="card-title">✦ Rekomendasi</div>
          {recs.length === 0
            ? <div className="text-sm text-ink-3">Evaluasi lebih banyak perubahan untuk mendapat rekomendasi.</div>
            : recs.slice(0, 3).map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-ink text-white mb-2 last:mb-0">
                  <span className="text-lg shrink-0">{r.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-[#f0c070] mb-0.5">{r.title}</div>
                    <div className="text-xs text-white/70 leading-relaxed">{r.desc}</div>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-title">🕐 Aktivitas Terbaru</div>
          {DB.length === 0
            ? <div className="text-sm text-ink-3">Belum ada catatan.</div>
            : DB.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-paper-3 last:border-0">
                  <span className="text-xl">{c.done ? (c.result === 'naik' ? '🎉' : c.result === 'turun' ? '📉' : '😐') : '⏳'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.produk}</div>
                    <div className="text-xs text-ink-2">{jenisLabel(c.jenis)} · {fmtDate(c.tanggal)}</div>
                  </div>
                  <ResBadge r={c.result} />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: LOG CHANGE
// ════════════════════════════════════════════════════════════════════════════
function LogChange({ onSave }) {
  const init = { toko:'Toko Lama', tanggal:todayStr(), produk:'', jenis:'', before:'', after:'', reason:'', notes:'', prio:'normal', target:'14',
    sold:'', views:'', rev:'', cvr:'', rating:'', ulasan:'', ads:'', roas:'' }
  const [form, setForm] = useState(init)
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.produk || !form.jenis || !form.before || !form.after) return alert('Lengkapi: nama produk, jenis, sebelum & sesudah')
    onSave({
      id: uid(), toko: form.toko, tanggal: form.tanggal, produk: form.produk, jenis: form.jenis,
      before: form.before, after: form.after, reason: form.reason, notes: form.notes, prio: form.prio,
      reviewDate: addDays(form.tanggal, form.target), reviewDays: parseInt(form.target),
      m0: { sold:+form.sold||null, views:+form.views||null, rev:+form.rev||null, cvr:+form.cvr||null,
        rating:+form.rating||null, ulasan:+form.ulasan||null, ads:+form.ads||null, roas:+form.roas||null },
      m1: null, result: null, resultNotes: '', done: false
    })
    setForm(init)
  }

  return (
    <div className="animate-fade-up max-w-5xl">
      <div className="mb-7"><h1 className="font-serif text-3xl mb-1">Catat Perubahan</h1><p className="text-sm text-ink-2">Isi data <strong>sebelum</strong> melakukan perubahan sebagai baseline evaluasi nanti.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="card mb-4">
            <div className="card-title">📋 Identitas Perubahan</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="field"><label>Toko</label>
                <select value={form.toko} onChange={s('toko')}><option>Toko Lama</option><option>Toko Baru</option></select></div>
              <div className="field"><label>Tanggal</label><input type="date" value={form.tanggal} onChange={s('tanggal')} /></div>
            </div>
            <div className="field"><label>Nama Produk / Area</label><input type="text" placeholder="Contoh: DEVIA OUTFIT ONESET 3in1" value={form.produk} onChange={s('produk')} /></div>
            <div className="field"><label>Jenis Perubahan</label>
              <select value={form.jenis} onChange={s('jenis')}>
                <option value="">— Pilih jenis —</option>
                {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label>Kondisi Sebelum</label><textarea placeholder="Tulis kondisi awal..." value={form.before} onChange={s('before')} /></div>
              <div className="field"><label>Kondisi Sesudah</label><textarea placeholder="Tulis perubahan yang dilakukan..." value={form.after} onChange={s('after')} /></div>
            </div>
            <div className="field"><label>Tujuan & Hipotesis</label><textarea placeholder="Kenapa perubahan ini dilakukan? Apa yang diharapkan?" style={{ minHeight: 56 }} value={form.reason} onChange={s('reason')} /></div>
          </div>
        </div>

        <div>
          <div className="card mb-4">
            <div className="card-title">📊 Metrik Baseline (Sebelum)</div>
            <p className="text-xs text-ink-2 mb-3">Ambil dari Seller Centre Shopee — periode 7 hari terakhir.</p>
            <div className="grid grid-cols-2 gap-3">
              {[['sold','Terjual (7 hari)','0'],['views','Pengunjung / Impresi','0'],['rev','Pendapatan (Rp)','0'],['cvr','Konversi (%)','0.0'],['rating','Rating Produk','4.8'],['ulasan','Jumlah Ulasan','0'],['ads','Budget Iklan/hari (Rp)','0'],['roas','ROAS Iklan','0.0']].map(([k,lbl,ph]) => (
                <div className="field" key={k}><label>{lbl}</label><input type="number" placeholder={ph} value={form[k]} onChange={s(k)} min="0" step={k==='cvr'||k==='rating'||k==='roas'?'0.1':'1'} /></div>
              ))}
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-title">⚙ Setting Evaluasi</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label>Target Review</label>
                <select value={form.target} onChange={s('target')}><option value="7">7 hari</option><option value="14">14 hari</option><option value="21">21 hari</option><option value="30">30 hari</option></select></div>
              <div className="field"><label>Prioritas</label>
                <select value={form.prio} onChange={s('prio')}><option value="normal">Normal</option><option value="tinggi">🔴 Tinggi</option><option value="rendah">Rendah</option></select></div>
            </div>
            <div className="field"><label>Catatan Tambahan</label><textarea placeholder="Kondisi pasar, kompetitor, dll..." style={{ minHeight: 52 }} value={form.notes} onChange={s('notes')} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setForm(init)}>Bersihkan</button>
            <button className="btn btn-primary" onClick={submit}>💾 Simpan Perubahan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: ALL CHANGES
// ════════════════════════════════════════════════════════════════════════════
function AllChanges({ DB, onReview, onDelete }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const filters = [['all','Semua'],['Toko Lama','Toko Lama'],['Toko Baru','Toko Baru'],['pending','Perlu Review'],['done','Selesai']]
  const sorted = DB
    .filter(c => { if (filter==='Toko Lama') return c.toko==='Toko Lama'; if (filter==='Toko Baru') return c.toko==='Toko Baru'; if (filter==='pending') return !c.done; if (filter==='done') return c.done; return true })
    .filter(c => !q || c.produk.toLowerCase().includes(q.toLowerCase()) || jenisLabel(c.jenis).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort==='oldest' ? a.tanggal.localeCompare(b.tanggal) : sort==='due' ? a.reviewDate.localeCompare(b.reviewDate) : b.tanggal.localeCompare(a.tanggal))

  return (
    <div className="animate-fade-up">
      <div className="mb-6"><h1 className="font-serif text-3xl mb-1">Semua Catatan</h1><p className="text-sm text-ink-2">Klik kartu untuk detail dan isi hasil evaluasi.</p></div>
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">🔍</span>
          <input type="text" className="pl-8" placeholder="Cari produk atau jenis..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {filters.map(([val, lbl]) => (
          <button key={val} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-[1.5px] transition-all duration-150 ${filter===val ? 'bg-ink text-white border-ink' : 'border-paper-3 text-ink-2 bg-white hover:border-ink hover:text-ink'}`} onClick={() => setFilter(val)}>{lbl}</button>
        ))}
        <select className="w-auto min-w-[140px]" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Terbaru dulu</option>
          <option value="oldest">Terlama dulu</option>
          <option value="due">Segera direview</option>
        </select>
      </div>
      {sorted.length === 0
        ? <div className="text-center py-16 text-ink-3"><div className="text-4xl mb-3 opacity-50">📭</div><h3 className="font-serif text-xl mb-2">Tidak ada catatan</h3><p className="text-sm">Belum ada perubahan yang sesuai filter ini.</p></div>
        : <div className="flex flex-col gap-2.5">{sorted.map(c => <ChangeCard key={c.id} c={c} onReview={onReview} onDelete={onDelete} />)}</div>
      }
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: REVIEW
// ════════════════════════════════════════════════════════════════════════════
function ReviewPage({ DB, onReview }) {
  const pending = DB.filter(c => !c.done).sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))
  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="mb-6"><h1 className="font-serif text-3xl mb-1">Perlu Direview</h1><p className="text-sm text-ink-2">Isi hasil aktual setelah 7–14 hari sejak perubahan dilakukan.</p></div>
      {pending.length === 0
        ? <div className="text-center py-16 text-ink-3"><div className="text-4xl mb-3">🎉</div><h3 className="font-serif text-xl mb-2">Semua sudah dievaluasi!</h3><p className="text-sm">Tidak ada perubahan yang menunggu review saat ini.</p></div>
        : pending.map(c => {
            const d = daysUntil(c.reviewDate), urg = d <= 0
            return (
              <div key={c.id} className={`card mb-4 ${urg ? 'border-l-[3px] border-l-rose rounded-l-none' : ''}`}>
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div className="flex gap-2 flex-wrap"><TokoBadge t={c.toko} /><span className="badge badge-gray">{jenisLabel(c.jenis)}</span></div>
                  <DuePill reviewDate={c.reviewDate} done={false} />
                </div>
                <div className="font-semibold text-sm mb-1">{c.produk}</div>
                <div className="text-xs text-ink-2 mb-3">Diubah: {fmtDate(c.tanggal)} · Target review: {fmtDate(c.reviewDate)}</div>
                <div className="grid grid-cols-[1fr_20px_1fr] gap-2 items-start mb-3">
                  <div className="bg-paper rounded-lg p-2.5 border-l-[3px] border-rose"><div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1">Sebelum</div><div className="text-sm">{c.before}</div></div>
                  <div className="flex items-center justify-center text-ink-3 mt-5">→</div>
                  <div className="bg-paper rounded-lg p-2.5 border-l-[3px] border-jade"><div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1">Sesudah</div><div className="text-sm">{c.after}</div></div>
                </div>
                {c.reason && <p className="text-xs text-ink-2 italic mb-3">Tujuan: {c.reason}</p>}
                <button className="btn btn-primary btn-sm" onClick={() => onReview(c.id)}>✏ Isi Hasil Evaluasi Sekarang</button>
              </div>
            )
          })
      }
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
function Analytics({ DB }) {
  const s = computeStats(DB)
  if (!s.done.length) return (
    <div className="text-center py-20 animate-fade-up"><div className="text-4xl mb-3 opacity-50">📊</div><h3 className="font-serif text-xl mb-2">Belum ada data analitik</h3><p className="text-sm text-ink-2">Selesaikan minimal 1 evaluasi untuk mulai melihat grafik dan insight.</p></div>
  )

  const donutData = [
    { v: s.naik.length, color: '#2d8a6e', label: 'Naik' },
    { v: s.turun.length, color: '#e85d4a', label: 'Turun' },
    { v: s.netral.length, color: '#e8e5de', label: 'Netral' },
  ]

  const monthlyData = (() => {
    const m = {}
    DB.filter(c => c.done).forEach(c => {
      const mo = c.tanggal.slice(0, 7)
      if (!m[mo]) m[mo] = { n: 0, t: 0 }
      m[mo].t++; if (c.result === 'naik') m[mo].n++
    })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([mo, d]) => ({
      label: new Date(mo + '-01').toLocaleDateString('id-ID', { month: 'short' }),
      v: d.n, total: d.t,
      color: d.t ? (d.n / d.t >= 0.6 ? '#2d8a6e' : d.n / d.t >= 0.4 ? '#c17d2a' : '#e85d4a') : '#e8e5de'
    }))
  })()

  return (
    <div className="animate-fade-up">
      <div className="mb-6"><h1 className="font-serif text-3xl mb-1">Insight & Grafik</h1><p className="text-sm text-ink-2">Pola dan analitik dari semua evaluasi yang sudah selesai.</p></div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon="🎯" value={`${s.rate}%`} label="Win Rate" color={s.rate >= 50 ? 'text-jade' : 'text-rose'} />
        <StatCard icon="🏆" value={s.naik.length} label="Berhasil Naik" color="text-jade" />
        <StatCard icon="🔥" value={s.streak} label="Streak Naik" color={s.streak >= 3 ? 'text-rose' : 'text-ink'} />
        <StatCard icon="💰" value={s.revGain > 0 ? fmtRp(s.revGain) : '—'} label="Estimasi Gain" color="text-jade" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Donut */}
        <div className="card">
          <div className="card-title">Distribusi Hasil</div>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <DonutChart data={donutData} size={110} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-serif text-xl text-ink">{s.rate}%</div>
                <div className="text-[9px] text-ink-3 uppercase tracking-widest">Win Rate</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {donutData.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-ink-2">{d.label}</span>
                  <span className="font-bold text-ink ml-auto pl-3">{d.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="card">
          <div className="card-title">Trend per Bulan (Naik)</div>
          {monthlyData.length ? <BarChart data={monthlyData} height={150} /> : <div className="text-sm text-ink-3">Belum cukup data.</div>}
        </div>

        {/* By Toko */}
        <div className="card">
          <div className="card-title">Performa per Toko</div>
          {Object.entries(s.byToko).map(([toko, st]) => {
            const p = st.done ? Math.round(st.n / st.done * 100) : 0
            const col = p >= 60 ? '#2d8a6e' : p >= 40 ? '#c17d2a' : '#e85d4a'
            return (
              <div key={toko} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-semibold">{toko}</div>
                  <div className="text-xl font-bold" style={{ color: col }}>{p}%</div>
                </div>
                <ProgressBar value={st.n} max={st.done || 1} color={col} showPct={false} />
                <div className="flex gap-2 mt-2">
                  <span className="badge badge-jade">↑ {st.n}</span>
                  <span className="badge badge-rose">↓ {st.done - st.n}</span>
                  <span className="badge badge-gray">Total {st.t}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Type effectiveness */}
      <div className="card mb-4">
        <div className="card-title">Efektivitas per Jenis Perubahan</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {Object.entries(s.byType).sort((a, b) => (b[1].n / b[1].t) - (a[1].n / a[1].t)).map(([type, st]) => {
            const p = Math.round(st.n / st.t * 100)
            const col = p >= 60 ? '#2d8a6e' : p >= 40 ? '#c17d2a' : '#e85d4a'
            return (
              <div key={type} className="flex items-center gap-3">
                <div className="text-xs text-ink-2 w-36 shrink-0 truncate">{jenisLabel(type)}</div>
                <div className="flex-1 h-6 bg-paper-2 rounded-md overflow-hidden relative">
                  <div className="absolute inset-0 rounded-md opacity-25 transition-all" style={{ width: `${p}%`, background: col }} />
                  <div className="absolute inset-0 flex items-center pl-2.5">
                    <span className="text-xs font-bold" style={{ color: col }}>{p}% berhasil</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <span className="badge badge-jade text-[10px]">↑{st.n}</span>
                  <span className="badge badge-rose text-[10px]">↓{st.d}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best */}
        <div className="card">
          <div className="card-title">🏆 Perubahan Paling Efektif</div>
          {s.naik.length === 0
            ? <div className="text-sm text-ink-3">Belum ada.</div>
            : s.naik.slice(0, 5).map(c => (
                <div key={c.id} className="flex gap-2.5 py-2.5 border-b border-paper-3 last:border-0">
                  <span className="badge badge-jade shrink-0 self-start">↑</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{c.produk}</div>
                    <div className="text-xs text-ink-2">{jenisLabel(c.jenis)} · {c.toko}</div>
                    {c.resultNotes && <div className="text-xs text-ink-3 italic mt-0.5">"{c.resultNotes}"</div>}
                  </div>
                </div>
              ))
          }
        </div>

        {/* Worst */}
        <div className="card">
          <div className="card-title">📉 Perlu Diperbaiki</div>
          {s.turun.length === 0
            ? <div className="text-sm text-jade">Belum ada yang turun! 🎉</div>
            : s.turun.slice(0, 5).map(c => (
                <div key={c.id} className="flex gap-2.5 py-2.5 border-b border-paper-3 last:border-0">
                  <span className="badge badge-rose shrink-0 self-start">↓</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{c.produk}</div>
                    <div className="text-xs text-ink-2">{jenisLabel(c.jenis)} · {c.toko}</div>
                    {c.resultNotes && <div className="text-xs text-ink-3 italic mt-0.5">"{c.resultNotes}"</div>}
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: AI ANALYSIS
// ════════════════════════════════════════════════════════════════════════════
function AIAnalysis({ DB }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const s = computeStats(DB)

  const analyze = async () => {
    if (s.done.length < 3) { setErr('Minimal 3 evaluasi selesai diperlukan untuk analisa AI.'); return }
    setLoading(true); setErr(''); setResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: DB.length, done: s.done, pending: s.pending.length, rate: s.rate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.data)
    } catch (e) { setErr(e.message || 'Gagal terhubung ke AI.') }
    finally { setLoading(false) }
  }

  const healthColor = result ? (result.healthScore >= 70 ? '#2d8a6e' : result.healthScore >= 50 ? '#c17d2a' : '#e85d4a') : '#e8e5de'

  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl mb-1">Analisa AI</h1>
        <p className="text-sm text-ink-2">Gunakan Claude AI untuk menganalisa pola perubahan dan mendapatkan rekomendasi mendalam.</p>
      </div>

      {/* Setup info */}
      <div className="card mb-5 border-l-[3px] border-cobalt rounded-l-none">
        <div className="card-title">ℹ Setup Diperlukan</div>
        <p className="text-sm text-ink-2 leading-relaxed mb-2">Fitur ini membutuhkan Anthropic API Key yang dikonfigurasi sebagai <strong>Environment Variable</strong> di Vercel.</p>
        <div className="bg-ink text-white rounded-lg p-3 text-xs font-mono mb-2">ANTHROPIC_API_KEY = sk-ant-api03-...</div>
        <p className="text-xs text-ink-3">Cara: Vercel Dashboard → Project → Settings → Environment Variables → tambahkan <code>ANTHROPIC_API_KEY</code></p>
      </div>

      {/* Current summary */}
      <div className="card mb-5">
        <div className="card-title">📊 Data yang Akan Dianalisa</div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-paper rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cobalt">{DB.length}</div><div className="text-xs text-ink-2">Total Perubahan</div></div>
          <div className="bg-paper rounded-lg p-3 text-center"><div className="text-2xl font-bold text-jade">{s.rate}%</div><div className="text-xs text-ink-2">Win Rate</div></div>
          <div className="bg-paper rounded-lg p-3 text-center"><div className="text-2xl font-bold text-gold">{s.pending.length}</div><div className="text-xs text-ink-2">Menunggu Review</div></div>
        </div>
      </div>

      {!result && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-serif text-xl mb-2">Siap untuk dianalisa</h3>
          <p className="text-sm text-ink-2 mb-6 max-w-sm mx-auto">Claude akan menganalisa semua pola perubahan dan memberikan rekomendasi spesifik untuk tokomu.</p>
          {err && <div className="text-sm text-rose-txt bg-rose-bg rounded-lg p-3 mb-4">{err}</div>}
          <button className="btn btn-primary" onClick={analyze} disabled={loading}>
            {loading ? <><span className="animate-spin inline-block">⟳</span> Menganalisa...</> : '🤖 Mulai Analisa AI'}
          </button>
        </div>
      )}

      {result && (
        <div className="animate-fade-up">
          {/* Health Score */}
          <div className="rounded-xl p-5 mb-4" style={{ background: 'linear-gradient(135deg, #1a1814 0%, #2a2820 100%)' }}>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={healthColor} strokeWidth="8" strokeDasharray={`${(result.healthScore / 100) * 188.5} 188.5`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-serif text-xl text-white">{result.healthScore}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,.4)' }}>Skor Kesehatan Toko</div>
                <div className="font-serif text-2xl mb-1" style={{ color: '#f0c070' }}>{result.healthLabel}</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,.7)' }}>{result.healthDesc}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card mb-4">
            <div className="card-title">📝 Ringkasan Eksekutif</div>
            <p className="text-sm leading-relaxed">{result.summary}</p>
            {result.trendDesc && <p className="text-xs text-ink-2 mt-2 italic">{result.trendDesc}</p>}
          </div>

          {/* Working & Not Working */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <div className="card-title">✅ Yang Bekerja Baik</div>
              {result.working?.map((w, i) => (
                <div key={i} className="mb-3 last:mb-0 p-3 bg-jade-bg rounded-lg">
                  <div className="text-sm font-semibold text-jade-txt mb-1">{w.title}</div>
                  <div className="text-xs text-ink-2 mb-1 leading-relaxed">{w.desc}</div>
                  {w.action && <div className="text-xs font-semibold text-jade-txt">→ {w.action}</div>}
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">❌ Yang Perlu Diperbaiki</div>
              {result.notWorking?.map((w, i) => (
                <div key={i} className="mb-3 last:mb-0 p-3 bg-rose-bg rounded-lg">
                  <div className="text-sm font-semibold text-rose-txt mb-1">{w.title}</div>
                  <div className="text-xs text-ink-2 mb-1 leading-relaxed">{w.desc}</div>
                  {w.fix && <div className="text-xs font-semibold text-rose-txt">→ {w.fix}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Action Plan */}
          <div className="card mb-4">
            <div className="card-title">🎯 Action Plan Prioritas</div>
            {result.actions?.map((a, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-paper-3 last:border-0">
                <div className="w-7 h-7 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">{a.no}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-0.5">{a.action}</div>
                  <div className="text-xs text-ink-2">{a.reason}</div>
                </div>
                {a.deadline && <span className={`badge shrink-0 self-start ${a.deadline === 'segera' ? 'badge-rose' : 'badge-gold'}`}>{a.deadline}</span>}
              </div>
            ))}
          </div>

          {/* Patterns */}
          {result.patterns?.length > 0 && (
            <div className="card mb-4">
              <div className="card-title">🔍 Pola yang Teridentifikasi</div>
              <ul className="space-y-2">{result.patterns.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm"><span className="text-jade shrink-0">◆</span><div><strong>{p.title}</strong>: {p.desc}</div></li>
              ))}</ul>
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={analyze}>↺ Analisa Ulang</button>
            <button className="btn" onClick={() => setResult(null)}>Tutup Hasil</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: ROI CALCULATOR
// ════════════════════════════════════════════════════════════════════════════
function ROICalc({ DB }) {
  const [margin, setMargin] = useState(35)
  const [hpp, setHpp] = useState('')
  const s = computeStats(DB)

  const results = s.naik.filter(c => c.m0?.rev && c.m1?.rev).map(c => ({
    ...c, gain: c.m1.rev - c.m0.rev, profitGain: (c.m1.rev - c.m0.rev) * (margin / 100)
  }))
  const totalGain = results.reduce((a, c) => a + c.gain, 0)
  const totalProfit = results.reduce((a, c) => a + c.profitGain, 0)

  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="mb-6"><h1 className="font-serif text-3xl mb-1">Kalkulator ROI</h1><p className="text-sm text-ink-2">Hitung dampak nyata dari setiap perubahan terhadap profit bersih tokomu.</p></div>

      <div className="card mb-5">
        <div className="card-title">⚙ Setting Margin</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label>Margin Bersih (%)</label>
            <input type="number" value={margin} onChange={e => setMargin(+e.target.value)} min="1" max="100" placeholder="35" />
            <div className="text-xs text-ink-3 mt-1">Margin setelah HPP, ongkir, biaya platform</div>
          </div>
          <div>
            <div className="bg-paper rounded-lg p-4 text-center">
              <div className="text-xs text-ink-2 mb-1">Estimasi Total Profit Gain</div>
              <div className="font-serif text-3xl text-jade">{totalProfit > 0 ? fmtRpFull(Math.round(totalProfit)) : '—'}</div>
              <div className="text-xs text-ink-3 mt-1">dari {results.length} perubahan yang berhasil</div>
            </div>
          </div>
        </div>
      </div>

      {results.length === 0
        ? <div className="text-center py-12 text-ink-3"><div className="text-4xl mb-3 opacity-50">🧮</div><p className="text-sm">Belum ada perubahan yang berhasil dengan data pendapatan lengkap.</p></div>
        : <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card text-center"><div className="text-xs text-ink-2 mb-1">Total Gain Omzet</div><div className="font-serif text-2xl text-jade">{fmtRp(totalGain)}</div></div>
              <div className="card text-center"><div className="text-xs text-ink-2 mb-1">Total Profit Gain</div><div className="font-serif text-2xl text-jade">{fmtRp(totalProfit)}</div></div>
              <div className="card text-center"><div className="text-xs text-ink-2 mb-1">Rata-rata per Perubahan</div><div className="font-serif text-2xl text-ink">{results.length ? fmtRp(totalProfit / results.length) : '—'}</div></div>
            </div>

            <div className="card">
              <div className="card-title">Breakdown per Perubahan Berhasil</div>
              {results.sort((a, b) => b.profitGain - a.profitGain).map(c => (
                <div key={c.id} className="py-3 border-b border-paper-3 last:border-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-sm font-semibold">{c.produk}</div>
                      <div className="text-xs text-ink-2">{jenisLabel(c.jenis)} · {fmtDate(c.tanggal)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-jade">+{fmtRp(c.profitGain)}</div>
                      <div className="text-xs text-ink-3">profit gain</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-ink-2">
                    <span>Omzet: {fmtRp(c.m0?.rev)} → {fmtRp(c.m1?.rev)}</span>
                    <span className="text-jade font-semibold">+{fmtRp(c.gain)} gain</span>
                  </div>
                </div>
              ))}
            </div>
          </>
      }
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: GOALS
// ════════════════════════════════════════════════════════════════════════════
function Goals({ goals, setGoals, DB }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ toko: 'Toko Lama', metric: 'sold', target: '', period: 'weekly', label: '' })
  const s = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const METRICS = [['sold','Terjual'],['views','Pengunjung / Impresi'],['rev','Pendapatan (Rp)'],['cvr','Konversi (%)'],['roas','ROAS Iklan'],['rate','Win Rate (%)']]

  const addGoal = () => {
    if (!form.target) return
    setGoals(g => [...g, { id: uid(), ...form, target: +form.target, createdAt: todayStr() }])
    setForm({ toko: 'Toko Lama', metric: 'sold', target: '', period: 'weekly', label: '' })
    setShowForm(false)
  }

  const getProgress = (goal) => {
    const relevant = DB.filter(c => c.toko === goal.toko && c.done && c.m1)
    if (!relevant.length) return null
    if (goal.metric === 'rate') {
      const s = computeStats(DB.filter(c => c.toko === goal.toko))
      return s.rate
    }
    const latest = relevant.sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]
    return latest?.m1?.[goal.metric] || null
  }

  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="font-serif text-3xl mb-1">Target & Progress</h1><p className="text-sm text-ink-2">Set target metrik dan pantau pencapaianmu.</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(o => !o)}>+ Tambah Target</button>
      </div>

      {showForm && (
        <div className="card mb-5 animate-slide-down">
          <div className="card-title">Target Baru</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label>Toko</label><select value={form.toko} onChange={s('toko')}><option>Toko Lama</option><option>Toko Baru</option></select></div>
            <div className="field"><label>Metrik</label><select value={form.metric} onChange={s('metric')}>{METRICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="field"><label>Target Nilai</label><input type="number" placeholder="Contoh: 50" value={form.target} onChange={s('target')} min="0" /></div>
            <div className="field"><label>Periode</label><select value={form.period} onChange={s('period')}><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option></select></div>
            <div className="field col-span-2"><label>Label (opsional)</label><input type="text" placeholder="Contoh: Target penjualan Ramadan" value={form.label} onChange={s('label')} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button className="btn btn-sm" onClick={() => setShowForm(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={addGoal}>Simpan Target</button>
          </div>
        </div>
      )}

      {goals.length === 0
        ? <div className="text-center py-12 text-ink-3"><div className="text-4xl mb-3 opacity-50">🎯</div><h3 className="font-serif text-xl mb-2">Belum ada target</h3><p className="text-sm">Tambahkan target metrik untuk memantau progress tokomu.</p></div>
        : goals.map(g => {
            const current = getProgress(g)
            const pct = current != null ? Math.min(Math.round((current / g.target) * 100), 100) : null
            const metricLabel = METRICS.find(([v]) => v === g.metric)?.[1] || g.metric
            const col = pct != null ? (pct >= 100 ? '#2d8a6e' : pct >= 60 ? '#c17d2a' : '#e85d4a') : '#e8e5de'
            return (
              <div key={g.id} className="card mb-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-sm">{g.label || `${metricLabel} — ${g.toko}`}</div>
                    <div className="text-xs text-ink-2">{g.toko} · {metricLabel} · {g.period === 'weekly' ? 'Mingguan' : 'Bulanan'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-xl" style={{ color: col }}>{pct != null ? `${pct}%` : '—'}</div>
                    {pct >= 100 && <div className="text-xs text-jade font-bold">🎉 Tercapai!</div>}
                  </div>
                </div>
                <ProgressBar value={current || 0} max={g.target} color={col} showPct={false} />
                <div className="flex justify-between text-xs text-ink-3 mt-1">
                  <span>Saat ini: <strong>{current != null ? (g.metric === 'rev' ? fmtRp(current) : current) : '—'}</strong></span>
                  <span>Target: <strong>{g.metric === 'rev' ? fmtRp(g.target) : g.target}</strong></span>
                </div>
                <button className="btn btn-xs text-rose-txt mt-3" onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))}>Hapus target</button>
              </div>
            )
          })
      }
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE: TIMELINE
// ════════════════════════════════════════════════════════════════════════════
function Timeline({ DB, onReview }) {
  if (!DB.length) return (
    <div className="text-center py-20 animate-fade-up"><div className="text-4xl mb-3 opacity-50">⏱</div><h3 className="font-serif text-xl mb-2">Timeline masih kosong</h3><p className="text-sm text-ink-2">Mulai catat perubahan pertama.</p></div>
  )
  const sorted = [...DB].sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  const groups = {}
  sorted.forEach(c => { const m = c.tanggal.slice(0, 7); if (!groups[m]) groups[m] = []; groups[m].push(c) })
  const dotC = { naik: '#2d8a6e', turun: '#e85d4a', netral: '#9c9a94' }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-6"><h1 className="font-serif text-3xl mb-1">Timeline</h1><p className="text-sm text-ink-2">Kronologi lengkap semua perubahan.</p></div>
      <div className="relative pl-6">
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-paper-3" />
        {Object.entries(groups).map(([mo, items]) => (
          <div key={mo} className="relative mb-6">
            <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-ink border-2 border-white" />
            <div className="text-xs font-bold uppercase tracking-widest text-ink-3 mb-3 ml-1">{fmtMonth(mo)}</div>
            {items.map(c => (
              <div key={c.id} className="bg-white border border-paper-3 rounded-xl p-3.5 mb-2.5 shadow-card">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.done ? (dotC[c.result] || '#9c9a94') : '#c17d2a' }} />
                  <TokoBadge t={c.toko} />
                  <span className="badge badge-gray text-[10px]">{jenisLabel(c.jenis)}</span>
                  {c.done ? <ResBadge r={c.result} /> : <DuePill reviewDate={c.reviewDate} done={false} />}
                  <span className="text-xs text-ink-3 ml-auto">{fmtDate(c.tanggal)}</span>
                </div>
                <div className="text-sm font-semibold mb-1">{c.produk}</div>
                <div className="text-xs text-ink-2">{c.before} → {c.after}</div>
                {!c.done && <button className="btn btn-primary btn-xs mt-2" onClick={() => onReview(c.id)}>Isi Evaluasi</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════════════════
function Sidebar({ page, setPage, pendingCount, onExportJSON, onExportCSV, onImport }) {
  const fileRef = useRef()
  const nav = [
    { id: 'dash', ico: '◎', label: 'Dashboard' },
    { id: 'log', ico: '＋', label: 'Catat Perubahan' },
    { id: 'list', ico: '≡', label: 'Semua Catatan' },
    { id: 'review', ico: '◷', label: 'Perlu Direview', badge: pendingCount },
  ]
  const navAna = [
    { id: 'analytics', ico: '↗', label: 'Insight & Grafik' },
    { id: 'ai', ico: '🤖', label: 'Analisa AI' },
    { id: 'roi', ico: '💰', label: 'Kalkulator ROI' },
    { id: 'goals', ico: '🎯', label: 'Target & Progress' },
    { id: 'timeline', ico: '⏱', label: 'Timeline' },
  ]
  const NavItem = ({ item }) => (
    <button onClick={() => setPage(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 text-left ${page === item.id ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white/90'}`}>
      <span className="w-4 text-center text-sm shrink-0">{item.ico}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose text-white rounded-full min-w-[18px] text-center">{item.badge}</span>}
    </button>
  )
  return (
    <aside className="w-[220px] shrink-0 flex flex-col fixed left-0 top-0 bottom-0 z-50" style={{ background: '#1a1814' }}>
      <div className="px-5 py-7 border-b border-white/8">
        <div className="font-serif text-xl text-white leading-tight">La <span style={{ color: '#f0c070' }}>Lovely</span></div>
        <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>Change Tracker</div>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto sidebar-nav">
        <div className="text-[10px] tracking-widest uppercase px-3 py-2 mb-1" style={{ color: 'rgba(255,255,255,.28)' }}>Menu</div>
        {nav.map(item => <NavItem key={item.id} item={item} />)}
        <div className="text-[10px] tracking-widest uppercase px-3 py-2 mb-1 mt-3" style={{ color: 'rgba(255,255,255,.28)' }}>Analitik</div>
        {navAna.map(item => <NavItem key={item.id} item={item} />)}
      </nav>
      <div className="px-3 py-3 border-t border-white/8 space-y-1.5">
        <button onClick={onExportJSON} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/10 text-white/55 hover:bg-white/7 hover:text-white transition-all duration-150">⬇ Export JSON</button>
        <button onClick={onExportCSV} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/10 text-white/55 hover:bg-white/7 hover:text-white transition-all duration-150">📊 Export CSV</button>
        <button onClick={() => fileRef.current?.click()} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/10 text-white/55 hover:bg-white/7 hover:text-white transition-all duration-150">⬆ Import JSON</button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onImport} />
      </div>
    </aside>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE NAV
// ════════════════════════════════════════════════════════════════════════════
function MobileNav({ page, setPage, pendingCount }) {
  const tabs = [['dash','◎','Beranda'],['log','＋','Catat'],['list','≡','Catatan'],['review','◷','Review'],['analytics','↗','Insight']]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-paper-3 z-50">
      <div className="flex">
        {tabs.map(([id, ico, lbl]) => (
          <button key={id} onClick={() => setPage(id)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${page === id ? 'text-ink' : 'text-ink-3'}`}>
            <span className="text-lg relative">
              {ico}
              {id === 'review' && pendingCount > 0 && <span className="absolute -top-1 -right-2 text-[9px] bg-rose text-white rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
            </span>
            {lbl}
          </button>
        ))}
      </div>
    </nav>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT TRACKER
// ════════════════════════════════════════════════════════════════════════════
export default function Tracker() {
  const [DB, setDB, ready] = useLS('lalovely_v4', [])
  const [goals, setGoals] = useLS('lalovely_goals', [])
  const [page, setPage] = useState('dash')
  const [reviewModal, setReviewModal] = useState(null)
  const { toasts, show: toast } = useToast()

  const pendingCount = DB.filter(c => !c.done).length

  const addChange = useCallback((c) => {
    setDB(prev => [c, ...prev])
    toast('Perubahan berhasil disimpan 🎉')
    setTimeout(() => setPage('list'), 700)
  }, [setDB, toast])

  const submitReview = useCallback((id, form) => {
    setDB(prev => prev.map(c => c.id === id ? { ...c, m1: form, result: form.result, resultNotes: form.notes, done: true } : c))
    setReviewModal(null)
    toast(form.result === 'naik' ? '🎉 Berhasil! Perubahan efektif' : form.result === 'turun' ? '📉 Dicatat — coba strategi baru' : 'Hasil evaluasi tersimpan')
  }, [setDB, toast])

  const deleteChange = useCallback((id) => {
    if (!confirm('Hapus catatan ini?')) return
    setDB(prev => prev.filter(c => c.id !== id))
    toast('Dihapus', 'info')
  }, [setDB, toast])

  const openReview = useCallback((id) => setReviewModal(id), [])

  const exportJSON = () => {
    if (!DB.length) { toast('Tidak ada data', 'error'); return }
    const blob = new Blob([JSON.stringify({ version: 4, exported: new Date().toISOString(), data: DB }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lalovely-${todayStr()}.json`; a.click()
    toast('Data berhasil diexport')
  }

  const doExportCSV = () => {
    if (!DB.length) { toast('Tidak ada data', 'error'); return }
    exportCSV(DB); toast('CSV berhasil diexport 📊')
  }

  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const incoming = parsed.data || parsed
        if (!Array.isArray(incoming)) throw new Error()
        const ids = new Set(DB.map(c => c.id))
        const added = incoming.filter(c => !ids.has(c.id))
        setDB(prev => [...prev, ...added])
        toast(`✓ ${added.length} data baru diimport`)
      } catch { toast('File tidak valid', 'error') }
    }
    r.readAsText(file); e.target.value = ''
  }

  const reviewTarget = reviewModal ? DB.find(c => c.id === reviewModal) : null

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center"><div className="font-serif text-2xl text-ink mb-2">La Lovely</div><div className="text-sm text-ink-3">Memuat data...</div></div>
    </div>
  )

  const pageProps = { DB, onReview: openReview, onDelete: deleteChange }
  const pages = {
    dash: <Dashboard {...pageProps} goTo={setPage} />,
    log: <LogChange onSave={addChange} />,
    list: <AllChanges {...pageProps} />,
    review: <ReviewPage {...pageProps} />,
    analytics: <Analytics DB={DB} />,
    ai: <AIAnalysis DB={DB} />,
    roi: <ROICalc DB={DB} />,
    goals: <Goals goals={goals} setGoals={setGoals} DB={DB} />,
    timeline: <Timeline DB={DB} onReview={openReview} />,
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} setPage={setPage} pendingCount={pendingCount} onExportJSON={exportJSON} onExportCSV={doExportCSV} onImport={importJSON} />
      <main className="ml-0 md:ml-[220px] flex-1 min-w-0">
        <div className="p-5 md:p-8 pb-24 md:pb-16">{pages[page]}</div>
      </main>
      <MobileNav page={page} setPage={setPage} pendingCount={pendingCount} />

      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)}
        title={`Evaluasi: ${reviewTarget?.produk || ''}`}
        subtitle={reviewTarget ? `${jenisLabel(reviewTarget.jenis)} · ${reviewTarget.toko} · Diubah ${fmtDate(reviewTarget.tanggal)}` : ''}>
        {reviewTarget && <ReviewForm c={reviewTarget} onSave={(form) => submitReview(reviewTarget.id, form)} />}
      </Modal>

      <Toasts toasts={toasts} />
    </div>
  )
}
