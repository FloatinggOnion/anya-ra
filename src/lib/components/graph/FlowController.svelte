<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte'
  interface Props { onready: (flow: ReturnType<typeof useSvelteFlow>) => void }
  let { onready }: Props = $props()
  const flow = useSvelteFlow()
  $effect(() => { onready(flow) })
</script>
