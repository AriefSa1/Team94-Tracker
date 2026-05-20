export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY belum dikonfigurasi di Vercel Environment Variables.' }, { status: 500 })
  }

  const data = await req.json()

  const byType = {}
  data.done.forEach(c => {
    if (!byType[c.jenis]) byType[c.jenis] = { n: 0, t: 0 }
    byType[c.jenis].t++
    if (c.result === 'naik') byType[c.jenis].n++
  })

  const prompt = `Kamu adalah konsultan e-commerce berpengalaman, spesialis optimasi Shopee untuk seller fashion wanita Indonesia.

Analisa data tracking perubahan toko berikut dari brand "La Lovely" yang menjual setelan pakaian wanita:

RINGKASAN DATA:
- Total perubahan tercatat: ${data.total}
- Sudah dievaluasi: ${data.done.length}
- Win rate: ${data.rate}%
- Perubahan menunggu review: ${data.pending}

EFEKTIVITAS PER JENIS PERUBAHAN:
${Object.entries(byType).map(([t, s]) => `- ${t}: ${s.n}/${s.t} berhasil (${Math.round(s.n / s.t * 100)}%)`).join('\n')}

PERUBAHAN YANG BERHASIL (NAIK):
${data.done.filter(c => c.result === 'naik').slice(0, 6).map(c => `- [${c.toko}] ${c.jenis}: "${c.before}" → "${c.after}" | ${c.produk}${c.resultNotes ? ` | Catatan: ${c.resultNotes}` : ''}`).join('\n')}

PERUBAHAN YANG TIDAK EFEKTIF (TURUN):
${data.done.filter(c => c.result === 'turun').slice(0, 6).map(c => `- [${c.toko}] ${c.jenis}: "${c.before}" → "${c.after}" | ${c.produk}${c.resultNotes ? ` | Catatan: ${c.resultNotes}` : ''}`).join('\n')}

Berikan analisa mendalam dalam Bahasa Indonesia. Return HANYA JSON valid tanpa markdown:
{
  "summary": "ringkasan eksekutif 2-3 kalimat",
  "healthScore": 0-100,
  "healthLabel": "label singkat (Sangat Baik/Baik/Cukup/Perlu Perhatian)",
  "patterns": [{"title":"...","desc":"..."}],
  "working": [{"title":"...","desc":"...","action":"langkah konkret"}],
  "notWorking": [{"title":"...","desc":"...","fix":"solusi spesifik"}],
  "actions": [{"no":1,"action":"...","reason":"...","deadline":"segera/minggu ini/bulan ini"}],
  "trend": "naik/stabil/turun",
  "trendDesc": "..."
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const result = await res.json()
    const text = result.content?.[0]?.text || ''

    // parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response format')
    const parsed = JSON.parse(jsonMatch[0])

    return Response.json({ ok: true, data: parsed })
  } catch (err) {
    return Response.json({ error: 'Gagal menganalisa data: ' + err.message }, { status: 500 })
  }
}
