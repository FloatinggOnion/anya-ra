<script lang="ts">
  // Placeholder for Phase 2+: PDF viewer, editor, etc.
</script>

<div class="main-panel">
  <div class="empty-state">
    <div class="icon">📄</div>
    <h2>Ready to research</h2>
    <p>Add papers to your workspace to get started.</p>
    <p class="coming-soon">Paper import and PDF viewer coming in Phase 2.</p>
  </div>
</div>

<style>
  .main-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--color-bg, #0f0f0f);
  }

  .empty-state {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h2 {
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-text, #f0f0f0);
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    font-size: 0.9375rem;
    color: var(--color-text-secondary, #aaaaaa);
    line-height: 1.6;
    margin: 0 0 0.25rem 0;
  }

  .coming-soon {
    font-size: 0.8125rem !important;
    color: var(--color-text-muted, #666666) !important;
    font-style: italic;
  }
</style>
