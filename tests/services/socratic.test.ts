import { describe, expect, it } from 'vitest'
import { buildCanvasContext, parseProposals, proposeResearch } from '../../src/lib/services/socratic'
import type { GraphNode, GraphEdge } from '../../src/lib/types/graph'
import type { LLMProvider } from '../../src/lib/types/llm'

const nodes: GraphNode[] = [
  { id: 'question', type: 'concept', position: { x: 0, y: 0 }, data: { kind: 'concept', label: 'A practical question', role: 'question' } },
  { id: 'evidence', type: 'document', position: { x: 300, y: 0 }, data: { kind: 'document', documentId: 'doc', title: 'Evidence' } },
  { id: 'private', type: 'note', position: { x: 0, y: 600 }, data: { kind: 'note', body: 'unrelated private material' } },
]
const edges: GraphEdge[] = [{ id: 'link', source: 'question', target: 'evidence', data: { type: 'supports' } }]

describe('Socratic research proposals', () => {
  it('includes only selected objects and their immediate evidence, with bounded document content', () => {
    const docs = new Map([['doc', { id: 'doc', title: 'Evidence', content: 'x'.repeat(10000), createdAt: '', updatedAt: '' }]])
    const context = buildCanvasContext(nodes, edges, ['question'], [], docs)
    expect(context).toContain('[question]')
    expect(context).toContain('[evidence]')
    expect(context).toContain('supports')
    expect(context).not.toContain('private')
    expect(context.length).toBeLessThan(3000)
    expect(buildCanvasContext(nodes, edges, [], [], docs)).toBe('')
  })

  it('rejects executable or malformed actions and removes invented evidence links', () => {
    expect(() => parseProposals('[{"kind":"execute","title":"run","body":"shell"}]', new Set())).toThrow()
    expect(() => parseProposals('[{"kind":"question","title":"","body":""}]', new Set())).toThrow()
    const [proposal] = parseProposals('```json\n[{"kind":"experiment","title":"Test it","body":"A proposed test, not a result.","sourceIds":["evidence","invented","evidence"]}]\n```', new Set(['evidence']))
    expect(proposal.sourceIds).toEqual(['evidence'])
  })

  it('generates proposals without changing source objects and passes cancellation through to the provider', async () => {
    let receivedSignal: AbortSignal | undefined
    const before = structuredClone(nodes)
    const provider = { async *chat(_messages, options) {
      receivedSignal = options.signal
      yield '[{"kind":"question","title":"What would disprove it?","body":"Test the assumption.","sourceIds":["question"]}]'
    } } as LLMProvider
    const result = await proposeResearch(provider, 'Apply this work', 'selected evidence', new Set(['question']), {}, new AbortController().signal)
    expect(result).toHaveLength(1)
    expect(nodes).toEqual(before)
    expect(receivedSignal).toBeInstanceOf(AbortSignal)
  })

  it('stops waiting for an unresponsive model when cancelled', async () => {
    const controller = new AbortController()
    let signal: AbortSignal | undefined
    const provider = { async *chat(_messages, options) {
      signal = options.signal
      await new Promise(() => {})
      yield ''
    } } as LLMProvider
    const pending = proposeResearch(provider, 'A goal', '', new Set(), {}, controller.signal)
    controller.abort()
    await expect(pending).rejects.toThrow('cancelled')
    expect(signal?.aborted).toBe(true)
  })
})
