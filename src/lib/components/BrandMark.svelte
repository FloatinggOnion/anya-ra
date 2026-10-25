<script lang="ts">
  import mark from '../assets/brand.json'
  let { size = 28 }: { size?: number } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
  <g stroke="currentColor" stroke-width={mark.strokeWidth} stroke-linecap="round" stroke-linejoin="round">
    <path d={mark.arch} />
    <path d={mark.bridge} />
  </g>
  <circle cx={mark.point.x} cy={mark.point.y} r={mark.point.radius} fill="currentColor" />
</svg>

<style>
  svg { display: block; flex-shrink: 0; color: var(--color-accent); }
</style>
