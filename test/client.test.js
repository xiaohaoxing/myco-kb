import { test } from 'node:test'
import assert from 'node:assert/strict'

async function loadClientBundle() {
  const captured = {}
  globalThis.window = {
    __ModuleLoader__: {
      load(value) {
        captured.value = value
      },
    },
  }
  try {
    await import('../lib/client.js?test=' + Date.now())
  } finally {
    delete globalThis.window
  }
  assert.ok(captured.value, 'client bundle should register itself')
  const module = { exports: {} }
  const exports = captured.value.factory((name) => {
    if (name === 'react') {
      return {
        createElement: () => null,
        useEffect: () => {},
        useState: (initial) => [initial, () => {}],
        Component: class Component {
          constructor(props) { this.props = props }
        },
      }
    }
    throw new Error(`unexpected require: ${name}`)
  })
  return exports ?? module.exports
}

test('button 工具函数的 children 用参数 label（防 text/label 类未定义引用回归）', async () => {
  const fs = await import('node:fs')
  const code = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const btnStart = code.indexOf('function button')
  const nextFn = code.indexOf('function ', btnStart + 10)
  const btn = code.slice(btnStart, nextFn === -1 ? btnStart + 600 : nextFn)
  assert.ok(btn.includes('}, label)'), `button children 应为 label 参数，实际片段: ${btn.slice(-60)}`)
  assert.ok(!btn.includes('}, text)'), 'button children 不应引用未定义变量 text')
})

test('client bundle does not hard-require remote.myco at boot', async () => {
  const bundle = await loadClientBundle()
  assert.ok(bundle.inject.includes('slots'))
  assert.ok(bundle.inject.includes('remote'))
  assert.ok(!bundle.inject.includes('remote.myco'))
})
