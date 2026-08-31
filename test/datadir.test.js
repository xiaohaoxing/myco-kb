import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveDataDir } from '../lib/core/datadir.js'

function withEnv(vars, fn) {
  const saved = {}
  for (const k of ['MYCO_DATA', 'DSH_SHELL']) {
    saved[k] = process.env[k]
  }
  for (const k of ['MYCO_DATA', 'DSH_SHELL']) delete process.env[k]
  Object.assign(process.env, vars)
  try {
    return fn()
  } finally {
    for (const k of ['MYCO_DATA', 'DSH_SHELL']) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
}

test('resolveDataDir：显式 dataDir 优先于 env 与默认', () => {
  assert.equal(resolveDataDir('/explicit/.myco'), '/explicit/.myco')
})

test('resolveDataDir：MYCO_DATA 覆盖默认（含 DSH_SHELL 场景）', () => {
  withEnv({ MYCO_DATA: '/env/myco' }, () => {
    assert.equal(resolveDataDir(undefined), '/env/myco')
  })
  withEnv({ MYCO_DATA: '/env/myco', DSH_SHELL: '1' }, () => {
    assert.equal(resolveDataDir(undefined), '/env/myco')
  })
})

test('resolveDataDir：DSH agent 环境（DSH_SHELL=1）默认工作区相对', () => {
  withEnv({ DSH_SHELL: '1' }, () => {
    assert.equal(resolveDataDir(undefined), join(process.cwd(), '.myco'))
  })
})

test('resolveDataDir：普通环境默认回退 ~/.myco（向后兼容）', () => {
  withEnv({}, () => {
    assert.equal(resolveDataDir(undefined), join(homedir(), '.myco'))
  })
})
