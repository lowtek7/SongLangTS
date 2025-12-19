<script lang="ts">
  import { interpreterStore } from '$lib/stores/interpreter';

  let inputValue = '';
  let inputElement: HTMLInputElement;

  function handleSubmit() {
    if (inputValue.trim()) {
      interpreterStore.execute(inputValue);
      inputValue = '';
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = interpreterStore.navigateHistory('up');
      if (prev !== null) {
        inputValue = prev;
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = interpreterStore.navigateHistory('down');
      inputValue = next ?? '';
    }
  }

  function focusInput() {
    inputElement?.focus();
  }
</script>

<div class="editor" on:click={focusInput} on:keydown={focusInput} role="textbox" tabindex="-1">
  <span class="prompt">&gt;</span>
  <input
    bind:this={inputElement}
    bind:value={inputValue}
    on:keydown={handleKeyDown}
    type="text"
    class="input"
    placeholder="Enter SongLang code..."
    spellcheck="false"
    autocomplete="off"
  />
</div>

<style>
  .editor {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a2e;
    border-top: 1px solid #333;
  }

  .prompt {
    color: #4ade80;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    margin-right: 8px;
    user-select: none;
  }

  .input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e0e0e0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
  }

  .input::placeholder {
    color: #666;
  }
</style>
