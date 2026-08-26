import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// 构造一个带知识库的 Myco 实例（temp 数据目录 + 默认知识库挂载）
async function makeMyco() {
  const { Myco } = await import('../lib/core/myco.js')
  const myco = new Myco({ dataDir: mkdtempSync(join(tmpdir(), 'myco-tel-')) })
  const kb = join(tmpdir(), 'myco-tel-kb-' + Date.now())
  myco.ensureDefaultKb(kb)
  myco.reindex()
  return { myco, kb }
}

test('collectTelemetry：仅匿名聚合，不含任何可识别信息', async () => {
  const { myco, kb } = await makeMyco()
  const c = myco.collectTelemetry()
  // 含匿名聚合字段
  assert.equal(c.product, 'myco-kb')
  assert.equal(typeof c.version, 'string')
  assert.equal(typeof c.counts.packages, 'number')
  assert.equal(typeof c.counts.documents, 'number')
  assert.ok(typeof c.instanceId === 'string' && c.instanceId.length > 10)
  // 不含可识别信息：包 id/名称/路径/tag 名称/文件名/契约均不应出现
  const text = JSON.stringify(c)
  assert.ok(!text.includes(kb), '不应包含知识库路径')
  assert.ok(!text.includes('myco-kb-local'), '不应包含包 id')
  assert.ok(!/packageId/.test(text), '不应包含 packageId')
  assert.ok(!/\"name\"/.test(text), '不应包含名称字段')
  assert.ok(!/\"path\"/.test(text), '不应包含路径字段')
  assert.ok(!/\"content\"/.test(text), '不应包含内容字段')
  assert.ok(!/\"contractId\"/.test(text), '不应包含契约字段')
  // tags 只应是数字计数，不应出现任何 tag 名称（字符串列表）
  assert.equal(typeof c.counts.tags, 'number')
  // instanceId 是随机 UUID（非 PII）
  assert.match(c.instanceId, /^[0-9a-f-]{36}$/)
})

test('getTelemetry：默认关（opt-in）；MYCO_TELEMETRY=0 强制关闭', async () => {
  const { myco } = await makeMyco()
  const t = myco.getTelemetry()
  assert.equal(t.enabled, false, '默认关（需用户勾选）')
  assert.equal(t.url, '')
  assert.equal(t.intervalHours, 24)
  const prev = process.env.MYCO_TELEMETRY
  process.env.MYCO_TELEMETRY = '0'
  assert.equal(myco.getTelemetry().enabled, false)
  if (prev === undefined) delete process.env.MYCO_TELEMETRY
  else process.env.MYCO_TELEMETRY = prev
})

test('sendTelemetry：默认关不发送；开启但无 url 不发送；配置 url 后 POST 且记录 lastSentAt', async () => {
  const { myco } = await makeMyco()
  // 默认关 → 不发送
  const rOff = await myco.sendTelemetry()
  assert.equal(rOff.ok, false)
  assert.match(rOff.reason, /未启用/)
  // 开启但无 url → 不发送
  myco.setTelemetry({ enabled: true })
  const rNo = await myco.sendTelemetry()
  assert.equal(rNo.ok, false)
  assert.match(rNo.reason, /url/)
  // 开启 + url + mock fetch
  myco.setTelemetry({ url: 'https://stats.example.com/ingest', intervalHours: 0 })
  let posted = null
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, opts) => {
    posted = { url, body: opts.body }
    return { ok: true, status: 200 }
  }
  try {
    const r = await myco.sendTelemetry()
    assert.equal(r.ok, true)
    assert.equal(r.status, 200)
    assert.equal(posted.url, 'https://stats.example.com/ingest')
    const payload = JSON.parse(posted.body)
    assert.ok(!JSON.stringify(payload).includes('packageId'))
    assert.ok(myco.getTelemetry().lastSentAt)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('telemetryTick：按间隔门控（上次刚发送则跳过, 超出间隔则发送）', async () => {
  const { myco } = await makeMyco()
  myco.setTelemetry({ enabled: true, url: 'https://stats.example.com/ingest', intervalHours: 24 })
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200 })
  try {
    await myco.sendTelemetry()          // 成功后 lastSentAt=now
    const soon = await myco.telemetryTick()
    assert.equal(soon.ok, false)
    assert.match(soon.reason, /间隔|未到/)
    myco.config.telemetry = { ...myco.config.telemetry, lastSentAt: '2000-01-01T00:00:00Z' }
    const again = await myco.telemetryTick()
    assert.equal(again.ok, true)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('telemetryPayload：provider=posthog 生成 PostHog 事件；缺 apiKey 报错', async () => {
  const { myco } = await makeMyco()
  // 默认 generic：返回原始聚合 JSON（含 schema）
  const gen = myco.telemetryPayload()
  assert.equal(gen.ok, true)
  assert.ok(gen.payload.schema)
  // 切到 posthog 但无 apiKey → 报错
  myco.setTelemetry({ provider: 'posthog' })
  const noKey = myco.telemetryPayload()
  assert.equal(noKey.ok, false)
  assert.match(noKey.reason, /apiKey/)
  // 有 apiKey → PostHog 单事件格式
  myco.setTelemetry({ apiKey: 'phc_test' })
  const eh = myco.telemetryPayload()
  assert.equal(eh.ok, true)
  assert.equal(eh.payload.api_key, 'phc_test')
  assert.equal(eh.payload.event, 'myco_kb_heartbeat')
  assert.match(eh.payload.distinct_id, /^[0-9a-f-]{36}$/)
  assert.ok(eh.payload.properties)
  assert.equal(typeof eh.payload.properties.counts_packages, 'number')
  const text = JSON.stringify(eh.payload)
  assert.ok(!text.includes('packageId'))
})

test('sendTelemetry：provider=posthog 时 POST PostHog 事件体', async () => {
  const { myco } = await makeMyco()
  myco.setTelemetry({ enabled: true, provider: 'posthog', apiKey: 'phc_test', url: 'https://us.i.posthog.com/i/v0/e/', intervalHours: 0 })
  let posted = null
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, opts) => { posted = { url, body: opts.body }; return { ok: true, status: 200 } }
  try {
    const r = await myco.sendTelemetry()
    assert.equal(r.ok, true)
    assert.equal(posted.url, 'https://us.i.posthog.com/i/v0/e/')
    const b = JSON.parse(posted.body)
    assert.equal(b.api_key, 'phc_test')
    assert.equal(b.event, 'myco_kb_heartbeat')
    assert.ok(b.properties.counts_packages !== undefined)
  } finally {
    globalThis.fetch = origFetch
  }
})
