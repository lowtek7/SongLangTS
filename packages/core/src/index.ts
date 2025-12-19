// Tokenizer
export { TokenType } from './tokenizer/TokenType.js';
export { Token, createToken, tokenToString } from './tokenizer/Token.js';
export { Tokenizer, TokenizerError } from './tokenizer/Tokenizer.js';

// Parser
export * from './parser/Expression.js';
export * from './parser/Statement.js';
export { Parser, ParserError } from './parser/Parser.js';

// Runtime
export { SongNode } from './runtime/Node.js';
export { Graph, type NodeData, type EdgeData, type GraphData } from './runtime/Graph.js';
export { Interpreter, type OutputCallback, type InterpreterOptions } from './runtime/Interpreter.js';
export { SongError, InterpreterError, ErrorType, fromException } from './runtime/SongError.js';

// Internal imports for run function
import { Tokenizer } from './tokenizer/Tokenizer.js';
import { Parser } from './parser/Parser.js';
import { Interpreter } from './runtime/Interpreter.js';

/**
 * 코드를 실행하고 인터프리터를 반환합니다.
 */
export function run(
  code: string,
  options: { onOutput?: (line: string) => void } = {}
): { interpreter: Interpreter; output: string[] } {
  const output: string[] = [];

  const interpreter = new Interpreter({
    onOutput: (line: string) => {
      output.push(line);
      options.onOutput?.(line);
    },
  });

  const tokenizer = new Tokenizer(code);
  const tokens = tokenizer.tokenize();

  const parser = new Parser(tokens);
  const statements = parser.parse();

  interpreter.execute(statements);

  return { interpreter, output };
}
