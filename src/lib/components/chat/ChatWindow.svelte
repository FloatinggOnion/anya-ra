<script lang="ts">
  import { onMount } from 'svelte'
  import { chatState, streamChat } from '../../stores/chat'
  import { providerState, initializeProvider } from '../../stores/llm-provider'
  import MessageBubble from './MessageBubble.svelte'
  import ProviderSettings from './ProviderSettings.svelte'
  import ContextSelection from './ContextSelection.svelte'
  import DraftSuggestions from './DraftSuggestions.svelte'

  let inputValue = $state('')
  let chatContainer: HTMLDivElement | undefined = $state()
  let ollamaWarning = $state(false)

  onMount(async () => {
    await initializeProvider()
    // Show warning if Ollama not available
    if ($providerState.error) {
      ollamaWarning = true
    }
  })

  async function handleSend() {
    const provider = $providerState.provider
    if (!inputValue.trim() || $chatState.isStreaming || !provider) return

    const message = inputValue.trim()
    inputValue = ''

    await streamChat(message, provider, { model: 'qwen2:0.5b' })

    // Auto-scroll to bottom after streaming
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-scroll when messages update
  $effect(() => {
    const _msgs = $chatState.messages
    if (chatContainer && _msgs.length > 0) {
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      }, 0)
    }
  })
</script>

<div class="chat-window">
  {#if ollamaWarning && $providerState.error}
    <div class="ollama-banner">
      ⚠️ {$providerState.error}
      <button onclick={() => (ollamaWarning = false)}>✕</button>
    </div>
  {/if}

  <ProviderSettings />
  <ContextSelection />

  <div class="messages" bind:this={chatContainer}>
    {#each $chatState.messages as message (message.id)}
      <MessageBubble {message} />
    {/each}

    {#if $chatState.isStreaming}
      <div class="streaming-indicator" aria-label="AI is generating response">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    {/if}

    {#if $chatState.error}
      <div class="error-message" role="alert">
        ⚠️ {$chatState.error}
      </div>
    {/if}
  </div>

  {#if $chatState.draftSections.length > 0}
    <div class="draft-area">
      <DraftSuggestions />
    </div>
  {/if}

  <div class="input-area">
    <textarea
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder={$providerState.provider
        ? 'Ask about your research... (Enter to send, Shift+Enter for newline)'
        : 'Start Ollama to chat...'}
      disabled={$chatState.isStreaming || !$providerState.provider}
      rows={2}
    ></textarea>
    <button
      onclick={handleSend}
      disabled={$chatState.isStreaming || !inputValue.trim() || !$providerState.provider}
      aria-label="Send message"
    >
      {$chatState.isStreaming ? '⏳' : '→'}
    </button>
  </div>
</div>

<style>
  .chat-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg);
    overflow: hidden;
  }

  .ollama-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: rgba(255, 200, 50, 0.15);
    border-bottom: 1px solid rgba(255, 200, 50, 0.3);
    color: #fbbf24;
    font-size: 13px;
  }

  .ollama-banner button {
    background: none;
    border: none;
    color: #fbbf24;
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .streaming-indicator {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    align-self: flex-start;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: pulse 1.4s infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    60%,
    100% {
      opacity: 0.3;
    }
    30% {
      opacity: 1;
    }
  }

  .error-message {
    padding: 12px;
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid var(--color-error);
    border-radius: 6px;
    color: var(--color-error);
    font-size: 13px;
    margin: 8px 0;
  }

  .draft-area {
    max-height: 300px;
    overflow-y: auto;
    border-top: 1px solid var(--color-border);
  }

  .input-area {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  textarea {
    flex: 1;
    padding: 10px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text);
    font-family: inherit;
    font-size: 14px;
    resize: none;
    line-height: 1.5;
    transition: border-color 0.15s;
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button {
    padding: 10px 20px;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 18px;
    transition: background 0.15s;
    align-self: flex-end;
    min-width: 48px;
  }

  button:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
