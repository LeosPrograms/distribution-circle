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
  let isEditing = false;
  let inputElement: HTMLInputElement;

  // Update local value when data changes
  $: edgeValue = data.value || 0;

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

  function startEditing() {
    isEditing = true;
    // Focus the input after it's rendered
    setTimeout(() => {
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 0);
  }

  function finishEditing() {
    isEditing = false;
    if (updateEdgeValue) {
      updateEdgeValue(id, edgeValue);
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      finishEditing();
    }
    if (event.key === 'Escape') {
      edgeValue = data.value || 0; // Reset to original value
      isEditing = false;
    }
  }
</script>

<BaseEdge path={edgePath} />

<!-- Clickable label/input positioned at the midpoint of the edge -->
<div
  class="edge-label"
  style="left: {edgeCenterX}px; top: {edgeCenterY}px;"
>
  {#if isEditing}
    <input
      bind:this={inputElement}
      bind:value={edgeValue}
      type="number"
      step="1"
      min="0"
      on:blur={finishEditing}
      on:keydown={handleKeyPress}
      class="edge-input-field"
    />
  {:else}
    <button 
      class="edge-display" 
      on:click={startEditing}
      title="Click to edit"
    >
      {edgeValue}
    </button>
  {/if}
</div>

<style>
  .edge-label {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 1000;
    pointer-events: auto;
  }

  .edge-display {
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    min-width: 30px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .edge-display:hover {
    background: #f0f0f0;
    border-color: #999;
  }

  .edge-input-field {
    background: white;
    border: 2px solid #007bff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: bold;
    min-width: 50px;
    text-align: center;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .edge-input-field:focus {
    border-color: #0056b3;
  }
</style>