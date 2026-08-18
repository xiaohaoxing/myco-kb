import { defineTool } from '@deepseek-ai/dsh-tools'

function present(title, kind, detail) {
  return { title, kind, detail }
}

// defineTool 要求 output.schema（JSON Schema 子集）+ output.render
const OBJECT_OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render(args, value) {
    return value
  },
}

const FIND_OUTPUT = {
  schema: {
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  },
  render(args, value) {
    return value
  },
}

// agent 工具面：把 myco 能力注册为 dsh-tools 工具
export function registerTools(ctx, myco) {
  ctx.tools.register(defineTool({
    name: 'myco_status',
    description: '查看 MyCo-KB 知识库维护状态：知识包清单、索引新鲜度、生命周期候选数、挂载错误。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.status(),
    presentCall: () => present('MyCo-KB 状态', 'read'),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_find',
    description: '在 MyCo-KB 知识库中检索：tag 命中×3、文件名×2、全文×1，返回最多 20 条，含证据页标记。',
    parameters: {
      query: { type: 'string', required: true, description: '检索关键词，空格分隔' },
    },
    output: FIND_OUTPUT,
    execute: async (args) => myco.find(args.query),
    presentCall: (args) => present('MyCo-KB 检索', 'read', args.query),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_index',
    description: '重建 MyCo-KB 跨包索引，返回文档/tag/知识包计数。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.reindex(),
    presentCall: () => present('重建索引', 'other'),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_sweep',
    description: '运行 MyCo-KB 生命周期候选扫描（仅报告，不自动执行）：休眠证据页→归档候选，孤页→补链/归档候选。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.sweep(),
    presentCall: () => present('生命周期扫描', 'read'),
  }))
}
