import { writable, derived, get } from 'svelte/store'
import { registerContextGetter } from '../stores/chat'

export interface ContextItem {
  id: string
  type: 'paper' | 'note'
  title: string
  content: string
  tokens: number
}

export interface ContextState {
  availableItems: ContextItem[]
  selectedIds: Set<string>
}

// Mock data for Phase 4 — real paper/note integration happens in later phases
const mockItems: ContextItem[] = [
  {
    id: 'paper-1',
    type: 'paper',
    title: 'Attention Is All You Need (Vaswani et al., 2017)',
    content:
      'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
    tokens: 2500
  },
  {
    id: 'paper-2',
    type: 'paper',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers (Devlin et al., 2018)',
    content:
      'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks.',
    tokens: 1800
  },
  {
    id: 'note-1',
    type: 'note',
    title: 'Research Notes: Transformer Architecture',
    content:
      'Key insight: Self-attention allows parallel processing unlike RNNs. Multi-head attention enables the model to jointly attend to information from different representation subspaces at different positions. The positional encoding preserves sequence order without recurrence. Key bottleneck: quadratic memory complexity O(n²) in sequence length.',
    tokens: 600
  },
  {
    id: 'paper-3',
    type: 'paper',
    title: 'GPT-3: Language Models are Few-Shot Learners (Brown et al., 2020)',
    content:
      "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can generally perform a new language task from only a few examples. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.",
    tokens: 3200
  },
  {
    id: 'note-2',
    type: 'note',
    title: 'Literature Review Outline',
    content:
      '1. Background on language models and NLP evolution\n2. Transformer innovations: self-attention, multi-head attention, positional encoding\n3. Scaling laws and emergent capabilities\n4. Fine-tuning vs few-shot learning tradeoffs\n5. Current limitations: context window, hallucination, computational cost',
    tokens: 450
  }
]

const initialState: ContextState = {
  availableItems: mockItems,
  selectedIds: new Set<string>()
}

export const contextState = writable<ContextState>(initialState)

export const selectedItems = derived(contextState, ($state) => {
  return $state.availableItems.filter((item) => $state.selectedIds.has(item.id))
})

export const totalTokens = derived(selectedItems, ($items) => {
  return $items.reduce((sum, item) => sum + item.tokens, 0)
})

export function toggleContextItem(id: string) {
  contextState.update((state) => {
    const newSelectedIds = new Set(state.selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    return { ...state, selectedIds: newSelectedIds }
  })
}

export function clearContext() {
  contextState.update((state) => ({
    ...state,
    selectedIds: new Set<string>()
  }))
}

export function selectAll() {
  contextState.update((state) => ({
    ...state,
    selectedIds: new Set(state.availableItems.map((item) => item.id))
  }))
}

// Register getter with chat store to avoid circular dependency
// This runs once when this module is first imported
registerContextGetter(() => get(selectedItems))
