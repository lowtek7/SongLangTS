import { TokenType } from './TokenType.js';
import { Token, createToken } from './Token.js';

/**
 * 토크나이저 오류
 */
export class TokenizerError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`[${line}:${column}] ${message}`);
    this.name = 'TokenizerError';
    this.line = line;
    this.column = column;
  }
}

/**
 * 키워드 맵 (대소문자 무시)
 */
const KEYWORDS: Record<string, TokenType> = {
  is: TokenType.IS,
  has: TokenType.HAS,
  do: TokenType.DO,
  end: TokenType.END,
  print: TokenType.PRINT,
  can: TokenType.CAN,
  loses: TokenType.LOSES,
  relation: TokenType.RELATION,
  debug: TokenType.DEBUG,
  when: TokenType.WHEN,
  else: TokenType.ELSE,
  all: TokenType.ALL,
  each: TokenType.EACH,
  where: TokenType.WHERE,
  of: TokenType.OF,
  random: TokenType.RANDOM,
  chance: TokenType.CHANCE,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
};

/**
 * Song 언어의 토크나이저
 * 소스 코드를 토큰 배열로 변환한다.
 */
export class Tokenizer {
  private readonly source: string;
  private readonly tokens: Token[] = [];

  private start = 0;
  private current = 0;
  private line = 1;
  private column = 1;
  private tokenStartColumn = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.tokenStartColumn = this.column;
      this.scanToken();
    }

    this.tokens.push(createToken(TokenType.EOF, '', null, this.line, this.column));
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case '{':
        this.addToken(TokenType.LBRACE);
        break;
      case '}':
        this.addToken(TokenType.RBRACE);
        break;
      case '(':
        this.addToken(TokenType.LPAREN);
        break;
      case ')':
        this.addToken(TokenType.RPAREN);
        break;
      case ',':
        this.addToken(TokenType.COMMA);
        break;
      case '.':
        this.addToken(TokenType.DOT);
        break;
      case '+':
        this.addToken(TokenType.PLUS);
        break;
      case '-':
        this.addToken(TokenType.MINUS);
        break;
      case '*':
        this.addToken(TokenType.STAR);
        break;
      case '%':
        this.addToken(TokenType.MODULO);
        break;
      case '/':
        if (this.peek() === '/') {
          // 주석: 줄 끝까지 무시
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      case '=':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.EQ);
        } else {
          throw new TokenizerError("'=' 단독 사용 불가, '==' 사용하세요", this.line, this.tokenStartColumn);
        }
        break;
      case '!':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.NEQ);
        } else {
          throw new TokenizerError("'!' 단독 사용 불가, '!=' 사용하세요", this.line, this.tokenStartColumn);
        }
        break;
      case '<':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.LTE);
        } else {
          this.addToken(TokenType.LT);
        }
        break;
      case '>':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.GTE);
        } else {
          this.addToken(TokenType.GT);
        }
        break;
      case '\n':
        this.addToken(TokenType.NEWLINE);
        this.line++;
        this.column = 1;
        break;
      case '\r':
        // Windows CRLF: \r 무시, \n에서 처리
        break;
      case ' ':
      case '\t':
        // 공백 무시
        break;
      case '?':
        this.scanQuery();
        break;
      case '"':
        this.scanString();
        break;
      default:
        if (this.isDigit(c)) {
          this.scanNumber();
        } else if (this.isAlpha(c)) {
          this.scanIdentifier();
        } else {
          throw new TokenizerError(`예상치 못한 문자 '${c}'`, this.line, this.tokenStartColumn);
        }
        break;
    }
  }

  private scanString(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new TokenizerError('닫히지 않은 문자열', this.line, this.tokenStartColumn);
    }

    // 닫는 따옴표
    this.advance();

    // 따옴표 제거한 값
    const value = this.source.slice(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }

  private scanNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // 소수점 처리
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // '.' 소비

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const lexeme = this.source.slice(this.start, this.current);
    const value = parseFloat(lexeme);
    this.addToken(TokenType.NUMBER, value);
  }

  private scanIdentifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.slice(this.start, this.current);

    // 키워드 확인 (대소문자 무시)
    const lowerText = text.toLowerCase();
    const type = KEYWORDS[lowerText] ?? TokenType.IDENTIFIER;

    this.addToken(type);
  }

  private scanQuery(): void {
    // ? 다음에 식별자가 오면 QUERY_VAR (?name)
    // 아니면 QUESTION (?)
    if (this.isAlpha(this.peek())) {
      // ?name 패턴
      while (this.isAlphaNumeric(this.peek())) {
        this.advance();
      }

      // ? 제외한 변수명
      const varName = this.source.slice(this.start + 1, this.current);
      this.addToken(TokenType.QUERY_VAR, varName);
    } else {
      // 단독 ?
      this.addToken(TokenType.QUESTION);
    }
  }

  private advance(): string {
    this.column++;
    return this.source[this.current++];
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private addToken(type: TokenType, value: unknown = null): void {
    const lexeme = this.source.slice(this.start, this.current);
    this.tokens.push(createToken(type, lexeme, value, this.line, this.tokenStartColumn));
  }
}
