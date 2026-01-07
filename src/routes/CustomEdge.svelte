<script lang="ts">
  import { BaseEdge, getStraightPath } from '@xyflow/svelte';
  import { getContext } from 'svelte';
  
  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let targetX: number;
  export let targetY: number;
  export let data: { value?: number } = {};

  const updateEdgeValue = getContext('updateEdgeValue') as ((edgeId: string, newValue: number) => void) | undefined;
  let edgeValue = data.value || 0;

  // Calculate the straight path
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Calculate the midpoint for the input
  const edgeCenterX = (sourceX + targetX) / 2;
  const edgeCenterY = (sourceY + targetY) / 2;

  // Update the edge data when input changes
  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    edgeValue = parseFloat(target.value) || 0;
    
    // Update the edge value through context
    if (updateEdgeValue) {
      updateEdgeValue(id, edgeValue);
    }
  }
</script>

<BaseEdge path={edgePath} />

<!-- Input positioned at the midpoint of the edge -->
<div
  class="edge-input"
  style="left: {edgeCenterX}px; top: {edgeCenterY}px;"
>
  <input
    type="number"
    bind:value={edgeValue}
    on:input={handleInputChange}
    min="0"
    step="1"
  />
</div>

<style>
  .edge-input {
    position: absolute;
    transform: translate(-50%, -50%);
    background: white;
    padding: 4px;
    border-radius: 4px;
    border: 1px solid #ccc;
    font-size: 12px;
    z-index: 10;
  }

  .edge-input input {
    width: 50px;
    border: none;
    background: transparent;
    text-align: center;
    font-size: 12px;
    outline: none;
  }
</style>