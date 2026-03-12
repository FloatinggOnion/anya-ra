<script lang="ts">
  interface Props {
    mode: 'concept' | 'note'
    onsubmit: (data: { label?: string; body: string }) => void
    oncancel: () => void
  }

  let { mode, onsubmit, oncancel }: Props = $props()
  let label = $state('')
  let body = $state('')

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (mode === 'concept' && !label.trim()) return
    if (!body.trim() && mode === 'note') return
    onsubmit({ label: mode === 'concept' ? label : undefined, body })
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <h3>{mode === 'concept' ? '💡 New Concept' : '📝 New Note'}</h3>
    <form onsubmit={handleSubmit}>
      {#if mode === 'concept'}
        <label>
          Label
          <input bind:value={label} placeholder="e.g. Attention Mechanism" required autofocus />
        </label>
      {/if}
      <label>
        {mode === 'concept' ? 'Description' : 'Note content'}
        <textarea
          bind:value={body}
          placeholder={mode === 'concept' ? 'Describe the concept…' : 'Write your note…'}
          rows={4}
        ></textarea>
      </label>
      <div class="actions">
        <button type="button" class="cancel" onclick={oncancel}>Cancel</button>
        <button type="submit">Add</button>
      </div>
    </form>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 12px;
    padding: 24px;
    width: 380px;
    max-width: 90vw;
  }
  h3 { margin: 0 0 16px; color: #cdd6f4; font-size: 16px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;
    font-size: 12px; color: #a6adc8; }
  input, textarea {
    background: #313244; border: 1px solid #45475a; border-radius: 6px;
    padding: 8px 10px; color: #cdd6f4; font-size: 14px; font-family: inherit;
    resize: vertical;
  }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
  button { padding: 6px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
  button[type=submit] { background: #89b4fa; color: #1e1e2e; font-weight: 600; }
  .cancel { background: #313244; color: #a6adc8; }
</style>
