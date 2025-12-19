import { writable, derived } from 'svelte/store';
import {
  Tokenizer,
  Parser,
  Interpreter,
  Graph,
  type GraphData,
  TokenizerError,
  ParserError,
  SongError,
} from '@songlang/core';

interface OutputLine {
  type: 'output' | 'error' | 'command';
  text: string;
}

interface InterpreterState {
  graphData: GraphData;
  output: OutputLine[];
  history: string[];
  historyIndex: number;
}

function createInterpreterStore() {
  let interpreter: Interpreter | null = null;

  const { subscribe, set, update } = writable<InterpreterState>({
    graphData: { nodes: [], edges: [] },
    output: [],
    history: [],
    historyIndex: -1,
  });

  function init() {
    interpreter = new Interpreter({
      onOutput: (line: string) => {
        update((state) => ({
          ...state,
          output: [...state.output, { type: 'output', text: line }],
        }));
      },
    });
  }

  function execute(code: string) {
    if (!interpreter) {
      init();
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    // 히스토리에 추가
    update((state) => ({
      ...state,
      history: [...state.history, trimmedCode],
      historyIndex: state.history.length + 1,
      output: [...state.output, { type: 'command', text: `> ${trimmedCode}` }],
    }));

    // REPL 명령어 처리
    if (trimmedCode.startsWith(':')) {
      handleReplCommand(trimmedCode);
      return;
    }

    try {
      const tokenizer = new Tokenizer(trimmedCode);
      const tokens = tokenizer.tokenize();

      const parser = new Parser(tokens);
      const statements = parser.parse();

      interpreter!.execute(statements);

      // 그래프 데이터 업데이트
      update((state) => ({
        ...state,
        graphData: interpreter!.graph.toJSON(),
      }));
    } catch (error) {
      let errorMessage: string;

      if (error instanceof TokenizerError) {
        errorMessage = `Tokenizer Error: ${error.message}`;
      } else if (error instanceof ParserError) {
        errorMessage = `Parser Error: ${error.message}`;
      } else if (error instanceof SongError) {
        errorMessage = error.formatError();
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else {
        errorMessage = `Unknown Error: ${error}`;
      }

      update((state) => ({
        ...state,
        output: [...state.output, { type: 'error', text: errorMessage }],
      }));
    }
  }

  function handleReplCommand(command: string) {
    const cmd = command.toLowerCase();

    if (cmd === ':clear' || cmd === ':c') {
      interpreter = new Interpreter({
        onOutput: (line: string) => {
          update((state) => ({
            ...state,
            output: [...state.output, { type: 'output', text: line }],
          }));
        },
      });
      update((state) => ({
        ...state,
        graphData: { nodes: [], edges: [] },
        output: [...state.output, { type: 'output', text: 'Graph cleared.' }],
      }));
    } else if (cmd === ':graph' || cmd === ':g') {
      interpreter?.dumpGraph();
      update((state) => ({
        ...state,
        graphData: interpreter!.graph.toJSON(),
      }));
    } else if (cmd === ':help' || cmd === ':h') {
      const helpText = [
        '--- SongLang REPL Help ---',
        ':clear, :c  - Clear graph',
        ':graph, :g  - Dump graph state',
        ':help, :h   - Show this help',
        '',
        '--- Language Basics ---',
        'Player IS Entity      - Type inheritance',
        'Player HAS HP 100     - Set property',
        'Player CAN ATTACK     - Add ability',
        'Player PRINT          - Print node name',
        'DEBUG GRAPH           - Show graph state',
      ];
      update((state) => ({
        ...state,
        output: [...state.output, ...helpText.map((t) => ({ type: 'output' as const, text: t }))],
      }));
    } else {
      update((state) => ({
        ...state,
        output: [...state.output, { type: 'error', text: `Unknown command: ${command}` }],
      }));
    }
  }

  function clearOutput() {
    update((state) => ({
      ...state,
      output: [],
    }));
  }

  function navigateHistory(direction: 'up' | 'down'): string | null {
    let result: string | null = null;

    update((state) => {
      if (state.history.length === 0) return state;

      let newIndex = state.historyIndex;
      if (direction === 'up') {
        newIndex = Math.max(0, state.historyIndex - 1);
      } else {
        newIndex = Math.min(state.history.length, state.historyIndex + 1);
      }

      result = newIndex < state.history.length ? state.history[newIndex] : null;

      return {
        ...state,
        historyIndex: newIndex,
      };
    });

    return result;
  }

  // 초기화
  init();

  return {
    subscribe,
    execute,
    clearOutput,
    navigateHistory,
    reset: () => {
      init();
      set({
        graphData: { nodes: [], edges: [] },
        output: [],
        history: [],
        historyIndex: -1,
      });
    },
  };
}

export const interpreterStore = createInterpreterStore();
