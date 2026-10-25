<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import SpatialWorkspace from '../spatial/SpatialWorkspace.svelte'
  const dispatch = createEventDispatcher()
</script>

<SpatialWorkspace onsettings={() => dispatch('open-settings')} />
