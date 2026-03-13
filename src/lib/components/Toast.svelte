<script lang="ts">
  import { toasts, removeToast } from '../services/toast'
  import type { Toast } from '../services/toast'
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div class="toast" class:error={toast.type === 'error'} class:success={toast.type === 'success'}>
      <span>{toast.message}</span>
      <button onclick={() => removeToast(toast.id)} class="close-btn">✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .toast {
    background: #313244;
    border-left: 3px solid #a6adc8;
    border-radius: 4px;
    padding: 12px 16px;
    color: #cdd6f4;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    animation: slideIn 0.2s ease-out;
  }

  .toast.error {
    border-left-color: #f38ba8;
    background: #3a2a2f;
  }

  .toast.success {
    border-left-color: #a6e3a1;
    background: #2a3a2f;
  }

  .close-btn {
    background: none;
    border: none;
    color: #a6adc8;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .close-btn:hover {
    color: #cdd6f4;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
