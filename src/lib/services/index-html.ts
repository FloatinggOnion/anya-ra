/**
 * Index HTML generation for exported archives.
 * Entry point with full-text search powered by lunr.js.
 * 
 * Pattern: Papers + Search Index → index.html with embedded lunr + search UI
 */

import type { Paper } from '../types/paper'

/**
 * Generate main index.html for exported workspace.
 * Includes embedded search index and paper metadata.
 * Uses lunr.js from CDN for search functionality.
 */
export function generateIndexHTML(
  papers: Paper[],
  searchIndexJSON: string
): string {
  const papersJSON = JSON.stringify(papers)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Workspace • Export</title>
  <script src="https://cdn.jsdelivr.net/npm/lunr@2"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0d1117;
      color: #e0e0e0;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 1px solid #444;
      padding-bottom: 30px;
    }

    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      background: linear-gradient(to right, #64b5f6, #81c784);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .count {
      font-size: 18px;
      color: #888;
    }

    #search-container {
      margin: 30px 0;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
    }

    #searchBox {
      width: 100%;
      max-width: 500px;
      padding: 12px 16px;
      font-size: 16px;
      border: 1px solid #444;
      background: #1a1a1a;
      color: #e0e0e0;
      border-radius: 6px;
      transition: all 0.2s;
    }

    #searchBox:focus {
      outline: none;
      border-color: #64b5f6;
      box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
    }

    #searchBox::placeholder {
      color: #666;
    }

    #results {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .paper-card {
      display: block;
      padding: 20px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      text-decoration: none;
      color: #e0e0e0;
      transition: all 0.2s;
      cursor: pointer;
    }

    .paper-card:hover {
      border-color: #64b5f6;
      background: #222;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(100, 181, 246, 0.15);
    }

    .paper-card h3 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #64b5f6;
    }

    .paper-card .authors {
      font-size: 14px;
      color: #888;
      margin-bottom: 10px;
      max-height: 40px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .paper-card .abstract {
      font-size: 13px;
      color: #aaa;
      margin-bottom: 12px;
      line-height: 1.5;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .paper-card .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #666;
      margin-bottom: 10px;
    }

    .paper-card .year {
      background: #2a2a2a;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .paper-card .tags {
      font-size: 12px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .paper-card .score {
      font-size: 12px;
      color: #81c784;
      margin-top: 8px;
      font-weight: 500;
    }

    .no-results {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 16px;
    }

    .search-info {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 20px;
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 24px;
      }

      #results {
        grid-template-columns: 1fr;
      }

      #search-container {
        flex-direction: column;
      }

      #searchBox {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📚 Research Workspace</h1>
      <p class="count">${papers.length} papers • ${new Date().toLocaleDateString()}</p>
    </header>

    <div id="search-container">
      <input
        type="search"
        id="searchBox"
        placeholder="Search papers by title, authors, tags, notes..."
        autocomplete="off"
        aria-label="Search papers"
      />
    </div>

    <div id="results"></div>

    <div class="search-info">
      <p>💡 Tip: Search across titles, authors, tags, and notes in real-time.</p>
    </div>
  </div>

  <script>
    // Embedded search index (serialized lunr index)
    const indexData = ${searchIndexJSON}
    const idx = lunr.Index.load(indexData)

    // Paper metadata for results display
    const papers = ${papersJSON}

    // Cache DOM elements
    const searchBox = document.getElementById('searchBox')
    const resultsDiv = document.getElementById('results')

    // Initialize with all papers on load
    displayAllPapers()

    // Search on input
    searchBox.addEventListener('input', (e) => {
      const query = e.target.value.trim()
      if (!query) {
        displayAllPapers()
        return
      }

      // Full-text search
      const results = idx.search(query)
      displayResults(results)
    })

    function displayAllPapers() {
      resultsDiv.innerHTML = papers
        .map((p) => makePaperCard(p, null))
        .join('')
    }

    function displayResults(results) {
      if (results.length === 0) {
        resultsDiv.innerHTML =
          '<p class="no-results">No papers found. Try different keywords.</p>'
        return
      }

      resultsDiv.innerHTML = results
        .map((r) => {
          const paper = papers.find((p) => p.id === r.ref)
          return paper ? makePaperCard(paper, r.score) : ''
        })
        .join('')
    }

    function makePaperCard(paper, score) {
      const abstract = paper.abstract
        ? paper.abstract.substring(0, 150) + '...'
        : 'No abstract available'
      const tags = (paper.tags || []).join(', ')
      const scoreDisplay = score
        ? \`<p class="score">Match score: \${(score * 100).toFixed(1)}</p>\`
        : ''

      return \`
        <a href="papers/\${paper.id}.html" class="paper-card">
          <h3>\${escapeHTML(paper.title)}</h3>
          <p class="authors">\${escapeHTML(paper.authors.join(', '))}</p>
          <p class="abstract">\${escapeHTML(abstract)}</p>
          <div class="meta">
            <span class="year">\${paper.year || 'Unknown'}</span>
            <span class="tags">\${escapeHTML(tags) || '—'}</span>
          </div>
          \${scoreDisplay}
        </a>
      \`
    }

    function escapeHTML(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }
  </script>
</body>
</html>`
}
