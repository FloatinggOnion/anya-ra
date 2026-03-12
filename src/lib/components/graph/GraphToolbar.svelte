<script lang="ts">
  interface Props {
    onaddconcept: () => void
    onaddnote: () => void
    onfitview: () => void
  }
  let { onaddconcept, onaddnote, onfitview }: Props = $props()
</script>

<div class="graph-toolbar">
  <button onclick={onaddconcept} title="Add concept node">💡 Concept</button>
  <button onclick={onaddnote} title="Add note node">📝 Note</button>
  <div class="sep"></div>
  <button onclick={onfitview} title="Fit all nodes into view">⊞ Fit</button>
</div>

<style>
  .graph-toolbar {
    display: flex; gap: 6px; align-items: center;
    background: rgba(30,30,46,0.9);
    border: 1px solid #45475a;
    border-radius: 8px;
    padding: 6px 8px;
    backdrop-filter: blur(4px);
  }
  button {
    background: #313244; border: none; border-radius: 6px;
    padding: 5px 10px; font-size: 12px; color: #cdd6f4;
    cursor: pointer; white-space: nowrap;
  }
  button:hover { background: #45475a; }
  .sep { width: 1px; height: 20px; background: #45475a; margin: 0 2px; }
</style>
