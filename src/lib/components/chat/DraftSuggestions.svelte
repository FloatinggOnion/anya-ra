<!-- DraftSuggestions.svelte — Accept/reject/edit interface for LLM draft sections -->
<script lang="ts">
  import {
    chatState,
    acceptDraft,
    rejectDraft,
    editDraft,
    exportAcceptedDrafts
  } from '../../stores/chat'
  import type { DraftSection } from '../../types/chat'

  let editingSectionId = $state<string | null>(null)
  let editContent = $state('')
  let copied = $state(false)

  function startEdit(section: DraftSection) {
    editingSectionId = section.id
    editContent = section.editedContent || section.content
  }

  function saveEdit(sectionId: string) {
    editDraft(sectionId, editContent)
    editingSectionId = null
    editContent = ''
  }

  function cancelEdit() {
    editingSectionId = null
    editContent = ''
  }

  async function copyToClipboard() {
    const text = await exportAcceptedDrafts()
    if (!text.trim()) return

    await navigator.clipboard.writeText(text)
    copied = true
    setTimeout(() => {
      copied = false
    }, 2000)
  }

  const acceptedCount = $derived($chatState.draftSections.filter((d) => d.accepted).length)
</script>

{#if $chatState.draftSections.length > 0}
  <div class="draft-suggestions">
    <div class="draft-header">
      <h3>
        ✍️ Draft Sections
        <span class="count">{$chatState.draftSections.length}</span>
      </h3>
      <button class="copy-btn" onclick={copyToClipboard} disabled={acceptedCount === 0}>
        {copied ? '✓ Copied!' : `📋 Copy Accepted (${acceptedCount})`}
      </button>
    </div>

    <div class="sections">
      {#each $chatState.draftSections as section (section.id)}
        <div
          class="section"
          class:accepted={section.accepted && !section.rejected}
          class:rejected={section.rejected}
        >
          {#if editingSectionId === section.id}
            <!-- Edit mode -->
            <textarea
              bind:value={editContent}
              class="edit-textarea"
              rows={6}
            ></textarea>
            <div class="edit-actions">
              <button class="save-btn" onclick={() => saveEdit(section.id)}>✓ Save</button>
              <button class="cancel-btn" onclick={cancelEdit}>Cancel</button>
            </div>
          {:else}
            <!-- View mode -->
            <div class="section-content">
              {section.editedContent || section.content}
            </div>

            {#if !section.accepted && !section.rejected}
              <div class="section-actions">
                <button class="accept-btn" onclick={() => acceptDraft(section.id)}>
                  ✓ Accept
                </button>
                <button class="edit-btn" onclick={() => startEdit(section)}>
                  ✎ Edit
                </button>
                <button class="reject-btn" onclick={() => rejectDraft(section.id)}>
                  ✗ Reject
                </button>
              </div>
            {:else if section.accepted && !section.rejected}
              <div class="status-row">
                <span class="status accepted-status">✓ Accepted</span>
                <button class="undo-btn" onclick={() => startEdit(section)}>Edit</button>
              </div>
            {:else if section.rejected}
              <div class="status-row">
                <span class="status rejected-status">✗ Rejected</span>
                <button class="undo-btn" onclick={() => acceptDraft(section.id)}>Restore</button>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .draft-suggestions {
    padding: 12px 16px;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  .draft-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .draft-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: var(--color-accent);
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
  }

  .copy-btn {
    padding: 5px 12px;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.15s;
  }

  .copy-btn:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .copy-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 250px;
    overflow-y: auto;
  }

  .section {
    padding: 10px 12px;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 6px;
    transition: border-color 0.2s;
  }

  .section.accepted {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.04);
  }

  .section.rejected {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.04);
    opacity: 0.6;
  }

  .section-content {
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    margin-bottom: 10px;
    color: var(--color-text);
  }

  .section-actions {
    display: flex;
    gap: 6px;
  }

  .section-actions button {
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.1s;
  }

  .section-actions button:hover {
    opacity: 0.85;
  }

  .accept-btn {
    background: #4ade80;
    color: #0f2e0f;
  }

  .edit-btn {
    background: var(--color-accent);
    color: white;
  }

  .reject-btn {
    background: #f87171;
    color: #2e0f0f;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .accepted-status {
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
  }

  .rejected-status {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .undo-btn {
    padding: 3px 8px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 11px;
    transition: background 0.1s;
  }

  .undo-btn:hover {
    background: var(--color-border);
  }

  .edit-textarea {
    width: 100%;
    padding: 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: inherit;
    font-size: 13px;
    line-height: 1.6;
    resize: vertical;
    margin-bottom: 8px;
  }

  .edit-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .edit-actions {
    display: flex;
    gap: 6px;
  }

  .save-btn {
    padding: 5px 12px;
    background: #4ade80;
    color: #0f2e0f;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }

  .cancel-btn {
    padding: 5px 12px;
    background: var(--color-border);
    color: var(--color-text);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
</style>
