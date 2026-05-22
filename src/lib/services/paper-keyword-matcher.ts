import type { Paper } from '../types/paper'
import type { PaperMatch } from '../types/suggestion'

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
}
