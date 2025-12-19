<script lang="ts">
  import { interpreterStore } from '$lib/stores/interpreter';

  let showHelp = false;

  function handleClear() {
    interpreterStore.execute(':clear');
  }

  function handleClearOutput() {
    interpreterStore.clearOutput();
  }

  function handleReset() {
    interpreterStore.reset();
  }

  function toggleHelp() {
    showHelp = !showHelp;
  }
</script>

<div class="toolbar">
  <div class="title">SongLang REPL</div>
  <div class="buttons">
    <button on:click={handleClear} title="Clear graph (:clear)">
      Clear Graph
    </button>
    <button on:click={handleClearOutput} title="Clear output">
      Clear Output
    </button>
    <button on:click={handleReset} title="Reset everything">
      Reset
    </button>
    <button on:click={toggleHelp} class:active={showHelp} title="Toggle help">
      Help
    </button>
  </div>
</div>

{#if showHelp}
  <div class="help-panel">
    <div class="help-section">
      <h3>REPL Commands</h3>
      <ul>
        <li><code>:clear</code>, <code>:c</code> - Clear graph</li>
        <li><code>:graph</code>, <code>:g</code> - Dump graph state</li>
        <li><code>:help</code>, <code>:h</code> - Show help</li>
      </ul>
    </div>
    <div class="help-section">
      <h3>Language Basics</h3>
      <ul>
        <li><code>Player IS Entity</code> - Type inheritance</li>
        <li><code>Player HAS HP 100</code> - Set property</li>
        <li><code>Player CAN ATTACK</code> - Add ability</li>
        <li><code>Player PRINT</code> - Print node name</li>
        <li><code>DEBUG GRAPH</code> - Show graph state</li>
      </ul>
    </div>
    <div class="help-section">
      <h3>Control Flow</h3>
      <ul>
        <li><code>WHEN condition DO ... END</code> - Conditional</li>
        <li><code>EACH node OF Type DO ... END</code> - Loop</li>
        <li><code>CHANCE 50% DO ... END</code> - Random chance</li>
      </ul>
    </div>
    <div class="help-section">
      <h3>Operators</h3>
      <ul>
        <li>Comparison: <code>=</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code></li>
        <li>Arithmetic: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code></li>
        <li>Logical: <code>AND</code>, <code>OR</code>, <code>NOT</code></li>
      </ul>
    </div>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #1a1a2e;
    border-bottom: 1px solid #333;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #4ade80;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    background: #2a2a4e;
    border: 1px solid #444;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: #3a3a5e;
  }

  button.active {
    background: #4ade80;
    color: #0f0f1a;
  }

  .help-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 16px;
    background: #1a1a2e;
    border-bottom: 1px solid #333;
  }

  .help-section h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #60a5fa;
  }

  .help-section ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .help-section li {
    font-size: 12px;
    color: #ccc;
    margin-bottom: 4px;
  }

  .help-section code {
    background: #2a2a4e;
    padding: 2px 4px;
    border-radius: 2px;
    font-family: 'Consolas', 'Monaco', monospace;
    color: #4ade80;
  }
</style>
