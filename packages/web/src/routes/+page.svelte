<script lang="ts">
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Output from '$lib/components/Output.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import GraphVisualization from '$lib/components/GraphVisualization.svelte';
</script>

<svelte:head>
  <title>SongLang REPL</title>
</svelte:head>

<div class="app">
  <Toolbar />
  <div class="main">
    <div class="left-panel">
      <Output />
      <Editor />
    </div>
    <div class="right-panel">
      <GraphVisualization />
    </div>
  </div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #0f0f1a;
    color: #e0e0e0;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .left-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .right-panel {
    width: 40%;
    min-width: 300px;
    max-width: 600px;
  }

  @media (max-width: 768px) {
    .main {
      flex-direction: column;
    }

    .right-panel {
      width: 100%;
      max-width: none;
      height: 40%;
    }
  }
</style>
