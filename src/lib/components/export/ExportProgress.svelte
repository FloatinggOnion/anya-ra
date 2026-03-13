<script lang="ts">
  interface Props {
    current: number
    total: number
    label?: string
    estimatedTime?: string
  }

  const { current = 0, total = 100, label = '', estimatedTime = '' }: Props = $props()

  const percentage = $derived((current / total) * 100)
</script>

<div class="progress-container">
  <div class="progress-bar">
    <div
      class="progress-fill"
      style="width: {percentage}%"
    />
  </div>
  <div class="progress-info">
    <span class="progress-label">{label}</span>
    {#if estimatedTime}
      <span class="estimated-time">~{estimatedTime} remaining</span>
    {/if}
  </div>
</div>

<style>
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #2a2a2a;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(to right, #64b5f6, #81c784);
    transition: width 0.1s linear;
    border-radius: 4px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #888;
  }

  .progress-label {
    font-weight: 500;
    color: #e0e0e0;
  }

  .estimated-time {
    color: #64b5f6;
  }
</style>
