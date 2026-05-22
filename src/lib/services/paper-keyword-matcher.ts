import type { Paper } from '../types/paper'
import type { PaperMatch } from '../types/suggestion'
import type { SuggestionProviderChain } from './suggestion-provider-chain'
import type { Message, ChatOptions } from '../types/llm'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'use', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'i', 'we', 'you',
  'he', 'she', 'it', 'they', 'me', 'us', 'him', 'her', 'them', 'this',
  'that', 'these', 'those', 'my', 'our', 'your', 'his', 'its', 'their',
  'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'about', 'above', 'after', 'again', 'against',
  'between', 'during', 'through', 'into', 'while', 'with', 'within',
  'without', 'of', 'in', 'to', 'for', 'on', 'at', 'by', 'from', 'up', 'down'
])

const MAX_RESULTS = 5
const MIN_KEYWORD_LENGTH = 3
const NOISE_FLOOR = 0.05

export class PaperKeywordMatcher {

  /**
   * Tier 1: Keyword-based paper matching.
   * Extracts keywords from document content, scores papers against those keywords,
   * and returns top matches sorted by relevance.
   */
  match(content: string, papers: Paper[]): PaperMatch[] {
    // 1. Extract keywords from content
    const keywords = this.extractKeywords(content)
    if (keywords.length === 0) return []

    // 2. Score each paper against keywords
    const scored = papers.map(paper => {
      const { score, matched } = this.scorePaper(paper, keywords)
      return { paper, score, matched }
    })

    // 3. Filter scores > NOISE_FLOOR
    const relevant = scored.filter(s => s.score > NOISE_FLOOR)

    // 4. Sort by relevanceScore descending
    relevant.sort((a, b) => b.score - a.score)

    // 5. Take top MAX_RESULTS
    const top = relevant.slice(0, MAX_RESULTS)

    // 6. Return as PaperMatch[]
    return top.map(s => ({
      paperId: s.paper.id,
      title: s.paper.title,
      authors: s.paper.authors,
      year: s.paper.year,
      relevanceScore: Math.round(s.score * 10000) / 10000,
      matchedKeywords: s.matched
    }))
  }

  /**
   * Extract meaningful keywords from content.
   * Tokenizes, removes stopwords, enforces minimum length, deduplicates.
   */
  extractKeywords(content: string): string[] {
    const tokens = content.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(t))
    return [...new Set(tokens)]
  }

  /**
   * Score a single paper against a set of keywords.
   * Weight scheme:
   *   title match:    weight 3.0 per keyword
   *   authors match:  weight 2.0 per keyword
   *   abstract match: weight 1.0 per keyword
   * Raw score normalized by (keywords.length * 6.0), clamped to [0, 1].
   */
  private scorePaper(paper: Paper, keywords: string[]): { score: number; matched: string[] } {
    const matched: string[] = []
    let rawScore = 0

    const titleLower = paper.title.toLowerCase()
    const authorsLower = paper.authors.join(' ').toLowerCase()
    const abstractLower = paper.abstract?.toLowerCase() ?? null

    for (const kw of keywords) {
      let kwWeight = 0

      if (titleLower.includes(kw)) {
        kwWeight += 3.0
      }
      if (authorsLower.includes(kw)) {
        kwWeight += 2.0
      }
      if (abstractLower && abstractLower.includes(kw)) {
        kwWeight += 1.0
      }

      if (kwWeight > 0) {
        matched.push(kw)
        rawScore += kwWeight
      }
    }

    const maxPossible = keywords.length * 6.0
    const normalized = maxPossible > 0 ? rawScore / maxPossible : 0
    const score = Math.max(0, Math.min(1, normalized))

    return { score, matched }
  }

  /**
   * Tier 2: LLM semantic re-rank of Tier 1 keyword results (D-05).
   * Called on-demand (section boundary or manual "Suggest" button), not continuously.
   * Uses the existing SuggestionProviderChain for LLM calls.
   *
   * @param providerChain - The existing multi-provider fallback chain
   * @param content - Current document text (provides semantic context)
   * @param tier1Matches - Top N results from Tier 1 keyword matching (max 5)
   * @param signal - AbortSignal for cancellation
   * @returns Re-ranked PaperMatch[] with llmRelevanceScore + llmRationale populated
   */
  async rerank(
    providerChain: SuggestionProviderChain,
    content: string,
    tier1Matches: PaperMatch[],
    signal: AbortSignal
  ): Promise<PaperMatch[]> {
    if (tier1Matches.length === 0) return []

    // Truncate to max 5 to stay within token budget
    const candidates = tier1Matches.slice(0, 5)

    // Build paper list for the prompt
    const paperList = candidates.map((m, i) =>
      `${i+1}. "${m.title}" (${m.year ?? 'n.d.'}) by ${m.authors.slice(0, 3).join(', ')}`
    ).join('\n')

    // Build LLM prompt
    const messages: Message[] = [
      { role: 'system' as const, content: 'You are a research relevance rater. Given a document excerpt and a list of academic papers, rank the papers by their relevance to the document. For each paper, output exactly one line in JSON format: {"index":<N>,"score":<0.0-1.0>,"rationale":"<one sentence why>"}. Order lines by relevance (highest score first). Include ALL papers. No other output.' },
      { role: 'user' as const, content: `Document text:\n"""\n${content.slice(0, 1500)}\n"""\n\nPapers to rank:\n${paperList}` }
    ]

    const options: ChatOptions = {
      temperature: 0.2,
      maxTokens: 512,
    }

    try {
      // Collect streamed response
      let responseText = ''
      for await (const chunk of providerChain.generateSuggestion(messages, options, signal)) {
        responseText += chunk
      }

      // Parse JSON lines from LLM output
      const rankings = new Map<number, { score: number; rationale: string }>()
      const lines = responseText.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('{')) continue
        try {
          const parsed = JSON.parse(trimmed)
          if (typeof parsed.index === 'number' && typeof parsed.score === 'number') {
            rankings.set(parsed.index, {
              score: Math.max(0, Math.min(1, parsed.score)),
              rationale: parsed.rationale || 'No rationale provided'
            })
          }
        } catch { /* skip malformed lines */ }
      }

      // Apply LLM scores to candidates
      const reranked = candidates.map((m, i) => {
        const llmResult = rankings.get(i + 1)
        return {
          ...m,
          llmRelevanceScore: llmResult?.score ?? m.relevanceScore,
          llmRationale: llmResult?.rationale,
        }
      })

      // Sort: prioritized by llmRelevanceScore, then by original relevanceScore as tiebreaker
      reranked.sort((a, b) => {
        const scoreA = a.llmRelevanceScore ?? a.relevanceScore
        const scoreB = b.llmRelevanceScore ?? b.relevanceScore
        if (scoreB !== scoreA) return scoreB - scoreA
        return b.relevanceScore - a.relevanceScore
      })

      return reranked
    } catch (err) {
      // Graceful degradation: return original Tier 1 matches on LLM error
      console.warn('[PaperKeywordMatcher.rerank] LLM re-rank failed, falling back to Tier 1:', err)
      return candidates.map(m => ({ ...m }))
    }
  }
}
