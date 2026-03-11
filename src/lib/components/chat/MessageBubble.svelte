<script lang="ts">
  import type { ChatMessage } from '../../types/chat'

  interface Props {
    message: ChatMessage
  }

  let { message }: Props = $props()
</script>

<div class="message {message.role}">
  <div class="message-content">
    {message.content}
  </div>
  <div class="message-timestamp">
    {new Date(message.timestamp).toLocaleTimeString()}
  </div>
</div>

<style>
  .message {
    padding: 12px 16px;
    margin: 4px 0;
    border-radius: 8px;
    max-width: 80%;
    word-break: break-word;
  }

  .message.user {
    background: var(--color-accent);
    color: white;
    margin-left: auto;
    align-self: flex-end;
  }

  .message.assistant {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    align-self: flex-start;
  }

  .message-content {
    white-space: pre-wrap;
    line-height: 1.6;
    font-size: 14px;
  }

  .message-timestamp {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 4px;
    opacity: 0.7;
  }

  .message.user .message-timestamp {
    color: rgba(255, 255, 255, 0.7);
  }
</style>
