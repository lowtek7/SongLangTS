/**
 * 이항 연산자
 */
export enum BinaryOperator {
  // 산술
  Add = 'Add',
  Subtract = 'Subtract',
  Multiply = 'Multiply',
  Divide = 'Divide',
  Modulo = 'Modulo',

  // 비교
  Equal = 'Equal',
  NotEqual = 'NotEqual',
  LessThan = 'LessThan',
  GreaterThan = 'GreaterThan',
  LessEqual = 'LessEqual',
  GreaterEqual = 'GreaterEqual',

  // 논리
  And = 'And',
  Or = 'Or',
}

/**
 * 단항 연산자
 */
export enum UnaryOperator {
  Negate = 'Negate',
  Not = 'Not',
}

/**
 * 표현식 기본 인터페이스
 */
interface BaseExpression {
  readonly line: number;
  readonly column: number;
}

/**
 * 숫자 리터럴: 100, 3.14
 */
export interface NumberExpression extends BaseExpression {
  readonly kind: 'number';
  readonly value: number;
}

/**
 * 문자열 리터럴: "Hello"
 */
export interface StringExpression extends BaseExpression {
  readonly kind: 'string';
  readonly value: string;
}

/**
 * 식별자: Player, HP
 */
export interface IdentifierExpression extends BaseExpression {
  readonly kind: 'identifier';
  readonly name: string;
}

/**
 * 속성 접근: Player.HP
 */
export interface PropertyAccessExpression extends BaseExpression {
  readonly kind: 'propertyAccess';
  readonly object: Expression;
  readonly property: string;
}

/**
 * 이항 연산: a + b, a - b, a * b, a / b, a == b, etc.
 */
export interface BinaryExpression extends BaseExpression {
  readonly kind: 'binary';
  readonly left: Expression;
  readonly operator: BinaryOperator;
  readonly right: Expression;
}

/**
 * 단항 연산: -a, NOT a
 */
export interface UnaryExpression extends BaseExpression {
  readonly kind: 'unary';
  readonly operator: UnaryOperator;
  readonly operand: Expression;
}

/**
 * 괄호 표현식: (a + b)
 */
export interface GroupingExpression extends BaseExpression {
  readonly kind: 'grouping';
  readonly inner: Expression;
}

/**
 * 랜덤 표현식: RANDOM min max
 */
export interface RandomExpression extends BaseExpression {
  readonly kind: 'random';
  readonly min: Expression;
  readonly max: Expression;
}

/**
 * 모든 표현식 타입의 Union
 */
export type Expression =
  | NumberExpression
  | StringExpression
  | IdentifierExpression
  | PropertyAccessExpression
  | BinaryExpression
  | UnaryExpression
  | GroupingExpression
  | RandomExpression;

// 표현식 생성 헬퍼 함수들
export function createNumberExpr(value: number, line: number, column: number): NumberExpression {
  return { kind: 'number', value, line, column };
}

export function createStringExpr(value: string, line: number, column: number): StringExpression {
  return { kind: 'string', value, line, column };
}

export function createIdentifierExpr(name: string, line: number, column: number): IdentifierExpression {
  return { kind: 'identifier', name, line, column };
}

export function createPropertyAccessExpr(
  object: Expression,
  property: string,
  line: number,
  column: number
): PropertyAccessExpression {
  return { kind: 'propertyAccess', object, property, line, column };
}

export function createBinaryExpr(
  left: Expression,
  operator: BinaryOperator,
  right: Expression,
  line: number,
  column: number
): BinaryExpression {
  return { kind: 'binary', left, operator, right, line, column };
}

export function createUnaryExpr(
  operator: UnaryOperator,
  operand: Expression,
  line: number,
  column: number
): UnaryExpression {
  return { kind: 'unary', operator, operand, line, column };
}

export function createGroupingExpr(inner: Expression, line: number, column: number): GroupingExpression {
  return { kind: 'grouping', inner, line, column };
}

export function createRandomExpr(
  min: Expression,
  max: Expression,
  line: number,
  column: number
): RandomExpression {
  return { kind: 'random', min, max, line, column };
}

/**
 * 표현식을 문자열로 변환
 */
export function expressionToString(expr: Expression): string {
  switch (expr.kind) {
    case 'number':
      return String(expr.value);
    case 'string':
      return `"${expr.value}"`;
    case 'identifier':
      return expr.name;
    case 'propertyAccess':
      return `${expressionToString(expr.object)}.${expr.property}`;
    case 'binary':
      return `(${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)})`;
    case 'unary':
      return `(${expr.operator}${expressionToString(expr.operand)})`;
    case 'grouping':
      return `(${expressionToString(expr.inner)})`;
    case 'random':
      return `RANDOM ${expressionToString(expr.min)} ${expressionToString(expr.max)}`;
  }
}
