/**
 * Song 언어의 토큰 타입
 */
export enum TokenType {
  // Keywords (원시 노드 + 내장 관계)
  IS = 'IS',
  HAS = 'HAS',
  DO = 'DO',
  END = 'END',
  PRINT = 'PRINT',
  CAN = 'CAN',
  LOSES = 'LOSES',
  RELATION = 'RELATION',
  DEBUG = 'DEBUG',
  WHEN = 'WHEN',
  ELSE = 'ELSE',
  ALL = 'ALL',
  EACH = 'EACH',
  WHERE = 'WHERE',
  OF = 'OF',
  RANDOM = 'RANDOM',
  CHANCE = 'CHANCE',

  // Query
  QUESTION = 'QUESTION',
  QUERY_VAR = 'QUERY_VAR',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',

  // Delimiters
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',

  // Operators
  DOT = 'DOT',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  MODULO = 'MODULO',
  EQ = 'EQ',
  NEQ = 'NEQ',
  LT = 'LT',
  GT = 'GT',
  LTE = 'LTE',
  GTE = 'GTE',

  // Logical Operators
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}
