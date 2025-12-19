/**
 * Song 언어 에러 타입
 */
export enum ErrorType {
  // 노드 관련
  NodeNotFound = 'NodeNotFound',
  PropertyNotFound = 'PropertyNotFound',

  // 타입 관련
  TypeMismatch = 'TypeMismatch',
  InvalidCondition = 'InvalidCondition',

  // 연산 관련
  DivisionByZero = 'DivisionByZero',
  InvalidOperand = 'InvalidOperand',

  // 능력 관련
  CannotPerform = 'CannotPerform',

  // 구문 관련
  SyntaxError = 'SyntaxError',
  UnexpectedToken = 'UnexpectedToken',

  // 기타
  RuntimeError = 'RuntimeError',
}

/**
 * Song 언어 에러
 */
export class SongError extends Error {
  readonly type: ErrorType;
  readonly line: number;
  readonly column: number;
  readonly sourceLine: string | null;

  constructor(type: ErrorType, message: string, line: number, column: number, sourceLine: string | null = null) {
    super(message);
    this.name = 'SongError';
    this.type = type;
    this.line = line;
    this.column = column;
    this.sourceLine = sourceLine;
  }

  /**
   * 포맷된 에러 메시지 생성
   */
  formatError(): string {
    const typeName = this.getTypeName();
    let result = `[Error] ${typeName}: ${this.message}`;
    result += `\n  at line ${this.line}`;

    if (this.sourceLine !== null) {
      result += `: ${this.sourceLine.trim()}`;
    }

    return result;
  }

  private getTypeName(): string {
    switch (this.type) {
      case ErrorType.NodeNotFound:
        return 'Node not found';
      case ErrorType.PropertyNotFound:
        return 'Property not found';
      case ErrorType.TypeMismatch:
        return 'Type mismatch';
      case ErrorType.InvalidCondition:
        return 'Invalid condition';
      case ErrorType.DivisionByZero:
        return 'Division by zero';
      case ErrorType.InvalidOperand:
        return 'Invalid operand';
      case ErrorType.CannotPerform:
        return 'Cannot perform';
      case ErrorType.SyntaxError:
        return 'Syntax error';
      case ErrorType.UnexpectedToken:
        return 'Unexpected token';
      case ErrorType.RuntimeError:
        return 'Runtime error';
      default:
        return 'Error';
    }
  }

  toString(): string {
    return this.formatError();
  }
}

/**
 * 인터프리터 예외
 */
export class InterpreterError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`[${line}:${column}] ${message}`);
    this.name = 'InterpreterError';
    this.line = line;
    this.column = column;
  }
}

/**
 * 예외를 SongError로 변환
 */
export function fromException(ex: Error, line = 0, column = 0): SongError {
  if (ex instanceof SongError) {
    return ex;
  }

  if (ex instanceof InterpreterError) {
    const msgParts = ex.message.split(']');
    const msg = msgParts.length > 1 ? msgParts.slice(1).join(']').trim() : ex.message;
    return new SongError(ErrorType.RuntimeError, msg, ex.line, ex.column);
  }

  return new SongError(ErrorType.RuntimeError, ex.message, line, column);
}
