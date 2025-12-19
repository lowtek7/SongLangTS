<script lang="ts">
  import { interpreterStore } from '$lib/stores/interpreter';
  import { afterUpdate } from 'svelte';

  let outputContainer: HTMLDivElement;

  afterUpdate(() => {
    if (outputContainer) {
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  });
</script>

<div class="output" bind:this={outputContainer}>
  {#each $interpreterStore.output as line}
    <div class="line {line.type}">
      {line.text}
    </div>
  {/each}
</div>

<style>
  .output {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    background: #0f0f1a;
  }

  .line {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }

  .line.output {
    color: #e0e0e0;
  }

  .line.error {
    color: #f87171;
  }

  .line.command {
    color: #60a5fa;
  }
</style>
