import { TokenType } from './TokenType.js';

/**
 * Song 언어의 토큰
 */
export interface Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly value: unknown;
  readonly line: number;
  readonly column: number;
}

export function createToken(
  type: TokenType,
  lexeme: string,
  value: unknown,
  line: number,
  column: number
): Token {
  return { type, lexeme, value, line, column };
}

export function tokenToString(token: Token): string {
  return token.value === null || token.value === undefined
    ? `[${token.type}] '${token.lexeme}' at ${token.line}:${token.column}`
    : `[${token.type}] '${token.lexeme}' = ${token.value} at ${token.line}:${token.column}`;
}
