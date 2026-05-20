// ─── UID ────────────────────────────────────────────────────
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

// ─── DATE ────────────────────────────────────────────────────
export const fmtDate = (s) => {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtMonth = (s) => new Date(s + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
export const addDays = (s, n) => {
  const d = new Date(s); d.setDate(d.getDate() + parseInt(n))
  return d.toISOString().split('T')[0]
}
export const daysUntil = (s) => {
  const d = new Date(s), n = new Date()
  d.setHours(0,0,0,0); n.setHours(0,0,0,0)
  return Math.round((d - n) / 86400000)
}
export const todayStr = () => new Date().toISOString().split('T')[0]

// ─── FORMAT ──────────────────────────────────────────────────
export const fmtRp = (v) => {
  if (!v && v !== 0) return '—'
  if (v >= 1_000_000) return 'Rp' + (v / 1_000_000).toFixed(1) + 'jt'
  if (v >= 1_000) return 'Rp' + (v / 1_000).toFixed(0) + 'rb'
  return 'Rp' + parseInt(v).toLocaleString('id-ID')
}
export const fmtRpFull = (v) => !v ? '—' : 'Rp' + parseInt(v).toLocaleString('id-ID')

// ─── PERCENT DIFF ─────────────────────────────────────────────
export const pctDiff = (b, a) => {
  if (!b || !a || b === 0) return null
  return ((a - b) / b * 100).toFixed(1)
}
export const pctStr = (b, a) => {
  const p = pctDiff(b, a); if (p === null) return ''
  return (parseFloat(p) > 0 ? '+' : '') + p + '%'
}
export const pctColor = (b, a) => {
  const p = pctDiff(b, a); if (p === null) return 'text-ink-3'
  return parseFloat(p) > 0 ? 'text-jade' : 'text-rose'
}

// ─── DUE STATUS ───────────────────────────────────────────────
export const dueStatus = (reviewDate, done) => {
  if (done) return { label: '✓ Selesai', cls: 'bg-paper-2 text-ink-3' }
  const d = daysUntil(reviewDate)
  if (d < 0)  return { label: `Terlambat ${Math.abs(d)}h`, cls: 'bg-rose-bg text-rose-txt' }
  if (d <= 3) return { label: `${d} hari lagi`, cls: 'bg-gold-bg text-gold-txt' }
  return { label: `${d} hari lagi`, cls: 'bg-jade-bg text-jade-txt' }
}

// ─── ANALYTICS ────────────────────────────────────────────────
export const computeStats = (DB) => {
  const done    = DB.filter(c => c.done)
  const naik    = done.filter(c => c.result === 'naik')
  const turun   = done.filter(c => c.result === 'turun')
  const netral  = done.filter(c => c.result === 'netral')
  const pending = DB.filter(c => !c.done)
  const rate    = done.length ? Math.round(naik.length / done.length * 100) : 0
  const overdue = pending.filter(c => daysUntil(c.reviewDate) < 0)

  let revGain = 0
  done.forEach(c => {
    if (c.result === 'naik' && c.m0?.rev && c.m1?.rev)
      revGain += c.m1.rev - c.m0.rev
  })

  // streak
  let streak = 0
  const sorted = [...DB].filter(c => c.done).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  for (const c of sorted) { if (c.result === 'naik') streak++; else break }

  const byType = {}
  done.forEach(c => {
    if (!byType[c.jenis]) byType[c.jenis] = { n: 0, t: 0, d: 0 }
    byType[c.jenis].t++
    if (c.result === 'naik') byType[c.jenis].n++
    else if (c.result === 'turun') byType[c.jenis].d++
  })

  const byToko = {}
  DB.forEach(c => {
    if (!byToko[c.toko]) byToko[c.toko] = { n: 0, t: 0, done: 0 }
    byToko[c.toko].t++
    if (c.done) { byToko[c.toko].done++; if (c.result === 'naik') byToko[c.toko].n++ }
  })

  return { done, naik, turun, netral, pending, rate, overdue, revGain, streak, byType, byToko, total: DB.length }
}

// ─── RECOMMENDATIONS ─────────────────────────────────────────
export const genRecs = (DB) => {
  const { done, byType, pending, overdue } = computeStats(DB)
  const recs = []

  const typeEntries = Object.entries(byType).filter(([, s]) => s.t >= 2)
  const best = typeEntries.sort((a, b) => (b[1].n / b[1].t) - (a[1].n / a[1].t))[0]
  if (best && best[1].n / best[1].t >= 0.6)
    recs.push({ type: 'success', icon: '🏆', title: `Lanjutkan: ${best[0]}`, desc: `Win rate ${Math.round(best[1].n / best[1].t * 100)}% — strategi ini paling efektif. Terapkan ke produk lain.` })

  if (overdue.length)
    recs.push({ type: 'urgent', icon: '⚠️', title: `${overdue.length} review overdue`, desc: `Segera isi hasil evaluasi agar insight lebih akurat dan keputusan lebih cepat.` })

  const worst = typeEntries.sort((a, b) => (a[1].n / a[1].t) - (b[1].n / b[1].t))[0]
  if (worst && worst[1].n / worst[1].t <= 0.3)
    recs.push({ type: 'warning', icon: '🔄', title: `Evaluasi ulang: ${worst[0]}`, desc: `Win rate hanya ${Math.round(worst[1].n / worst[1].t * 100)}%. Pertimbangkan ganti pendekatan atau timing.` })

  if (DB.length < 5)
    recs.push({ type: 'info', icon: '📝', title: `Catat lebih banyak perubahan`, desc: `Target minimal 10 catatan untuk mulai melihat pola yang bermakna dari data.` })

  if (done.length >= 5 && !recs.find(r => r.type === 'success'))
    recs.push({ type: 'info', icon: '💡', title: `Data sudah cukup untuk AI Analysis`, desc: `Gunakan fitur Analisa AI untuk mendapatkan rekomendasi mendalam dari Claude AI.` })

  return recs
}

// ─── CSV EXPORT ───────────────────────────────────────────────
export const exportCSV = (DB) => {
  const headers = ['Tanggal','Toko','Produk','Jenis','Sebelum','Sesudah','Tujuan',
    'Terjual Before','Terjual After','Pengunjung Before','Pengunjung After',
    'Pendapatan Before','Pendapatan After','Konversi Before','Konversi After',
    'ROAS Before','ROAS After','Hasil','Catatan Evaluasi','Review Date']
  const rows = DB.map(c => [
    c.tanggal, c.toko, c.produk, c.jenis,
    `"${(c.before||'').replace(/"/g,'""')}"`,
    `"${(c.after||'').replace(/"/g,'""')}"`,
    `"${(c.reason||'').replace(/"/g,'""')}"`,
    c.m0?.sold||'', c.m1?.sold||'',
    c.m0?.views||'', c.m1?.views||'',
    c.m0?.rev||'', c.m1?.rev||'',
    c.m0?.cvr||'', c.m1?.cvr||'',
    c.m0?.roas||'', c.m1?.roas||'',
    c.result||'pending',
    `"${(c.resultNotes||'').replace(/"/g,'""')}"`,
    c.reviewDate
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lalovely-tracker-${todayStr()}.csv`
  a.click()
}

// ─── JENIS OPTIONS ────────────────────────────────────────────
export const JENIS_OPTIONS = [
  '📝 Judul Produk', '📄 Deskripsi Produk', '📸 Foto Produk', '🎬 Video Produk',
  '💰 Harga', '🎨 Variasi / Warna Baru', '📦 Bundling Produk', '✨ Produk Baru',
  '📢 Iklan — Budget', '📊 Iklan — Setting ROAS', '🔍 Iklan — Kata Kunci',
  '⚡ Flash Sale', '🏷 Voucher / Promo', '📋 Stok', '· Lainnya'
]
export const jenisLabel = (j) => j?.replace(/^[^\s]+ /, '') || j || '—'
