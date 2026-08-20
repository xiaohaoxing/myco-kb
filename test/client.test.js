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

test('client bundle does not hard-require remote.myco at boot', async () => {
  const bundle = await loadClientBundle()
  assert.ok(bundle.inject.includes('slots'))
  assert.ok(bundle.inject.includes('remote'))
  assert.ok(!bundle.inject.includes('remote.myco'))
})
