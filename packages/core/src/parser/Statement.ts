import { Expression, expressionToString } from './Expression.js';

/**
 * LOSES 타입
 */
export enum LosesType {
  Auto = 'Auto',
  Is = 'Is',
}

/**
 * 디버그 대상
 */
export enum DebugTarget {
  Graph = 'Graph',
  Tokens = 'Tokens',
  Ast = 'Ast',
}

/**
 * 쿼리 패턴 요소
 */
export interface QueryPattern {
  readonly isWildcard: boolean;
  readonly variableName: string | null;
}

export function createWildcardPattern(): QueryPattern {
  return { isWildcard: true, variableName: null };
}

export function createVariablePattern(name: string): QueryPattern {
  return { isWildcard: false, variableName: name };
}

/**
 * 문장 기본 인터페이스
 */
interface BaseStatement {
  readonly line: number;
  readonly column: number;
}

/**
 * 관계 문장: Subject Relation [Args...]
 */
export interface RelationStatement extends BaseStatement {
  readonly kind: 'relation';
  readonly subject: string;
  readonly relation: string;
  readonly arguments: unknown[];
}

/**
 * 표현식 기반 HAS 문장
 */
export interface HasExpressionStatement extends BaseStatement {
  readonly kind: 'hasExpression';
  readonly subject: string;
  readonly property: string;
  readonly valueExpression: Expression;
}

/**
 * 표현식 주어 PRINT 문장
 */
export interface ExpressionPrintStatement extends BaseStatement {
  readonly kind: 'expressionPrint';
  readonly subject: Expression;
}

/**
 * 표현식 주어 HAS 문장
 */
export interface ExpressionHasStatement extends BaseStatement {
  readonly kind: 'expressionHas';
  readonly subject: Expression;
  readonly property: string;
  readonly value: unknown;
  readonly valueExpression: Expression | null;
}

/**
 * 역할 정의 문장
 */
export interface RoleDefinitionStatement extends BaseStatement {
  readonly kind: 'roleDefinition';
  readonly subject: string;
  readonly roleName: string;
}

/**
 * DO 블록 문장
 */
export interface DoBlockStatement extends BaseStatement {
  readonly kind: 'doBlock';
  readonly subject: string;
  readonly body: Statement[];
}

/**
 * 능력 문장
 */
export interface CanStatement extends BaseStatement {
  readonly kind: 'can';
  readonly subject: string;
  readonly ability: string;
}

/**
 * 관계 제거 문장
 */
export interface LosesStatement extends BaseStatement {
  readonly kind: 'loses';
  readonly subject: string;
  readonly target: string;
  readonly type: LosesType;
}

/**
 * 디버그 문장
 */
export interface DebugStatement extends BaseStatement {
  readonly kind: 'debug';
  readonly target: DebugTarget;
}

/**
 * WHEN 조건문
 */
export interface WhenStatement extends BaseStatement {
  readonly kind: 'when';
  readonly condition: Statement;
  readonly body: Statement[];
}

/**
 * WHEN 표현식 조건문
 */
export interface WhenExpressionStatement extends BaseStatement {
  readonly kind: 'whenExpression';
  readonly subject: string;
  readonly condition: Expression;
  readonly body: Statement[];
  readonly elseBody: Statement[] | null;
  readonly elseWhen: WhenExpressionStatement | null;
}

/**
 * CHANCE 확률 분기문
 */
export interface ChanceStatement extends BaseStatement {
  readonly kind: 'chance';
  readonly percent: Expression;
  readonly body: Statement[];
  readonly elseBody: Statement[] | null;
}

/**
 * ALL 쿼리문
 */
export interface AllStatement extends BaseStatement {
  readonly kind: 'all';
  readonly typeName: string;
  readonly queryVariable: string | null;
  readonly action: Statement | null;
}

/**
 * EACH 반복문
 */
export interface EachStatement extends BaseStatement {
  readonly kind: 'each';
  readonly collection: string;
  readonly variable: string;
  readonly body: Statement[];
}

/**
 * 쿼리 문장
 */
export interface QueryStatement extends BaseStatement {
  readonly kind: 'query';
  readonly subject: QueryPattern;
  readonly relation: string;
  readonly target: string | null;
  readonly targetValue: unknown;
  readonly whereCondition: Expression | null;
}

/**
 * 모든 문장 타입의 Union
 */
export type Statement =
  | RelationStatement
  | HasExpressionStatement
  | ExpressionPrintStatement
  | ExpressionHasStatement
  | RoleDefinitionStatement
  | DoBlockStatement
  | CanStatement
  | LosesStatement
  | DebugStatement
  | WhenStatement
  | WhenExpressionStatement
  | ChanceStatement
  | AllStatement
  | EachStatement
  | QueryStatement;

// 문장 생성 헬퍼 함수들
export function createRelationStmt(
  subject: string,
  relation: string,
  args: unknown[],
  line: number,
  column: number
): RelationStatement {
  return { kind: 'relation', subject, relation, arguments: args, line, column };
}

export function createHasExpressionStmt(
  subject: string,
  property: string,
  valueExpression: Expression,
  line: number,
  column: number
): HasExpressionStatement {
  return { kind: 'hasExpression', subject, property, valueExpression, line, column };
}

export function createExpressionPrintStmt(
  subject: Expression,
  line: number,
  column: number
): ExpressionPrintStatement {
  return { kind: 'expressionPrint', subject, line, column };
}

export function createExpressionHasStmt(
  subject: Expression,
  property: string,
  value: unknown,
  valueExpression: Expression | null,
  line: number,
  column: number
): ExpressionHasStatement {
  return { kind: 'expressionHas', subject, property, value, valueExpression, line, column };
}

export function createRoleDefinitionStmt(
  subject: string,
  roleName: string,
  line: number,
  column: number
): RoleDefinitionStatement {
  return { kind: 'roleDefinition', subject, roleName, line, column };
}

export function createDoBlockStmt(
  subject: string,
  body: Statement[],
  line: number,
  column: number
): DoBlockStatement {
  return { kind: 'doBlock', subject, body, line, column };
}

export function createCanStmt(
  subject: string,
  ability: string,
  line: number,
  column: number
): CanStatement {
  return { kind: 'can', subject, ability, line, column };
}

export function createLosesStmt(
  subject: string,
  target: string,
  type: LosesType,
  line: number,
  column: number
): LosesStatement {
  return { kind: 'loses', subject, target, type, line, column };
}

export function createDebugStmt(target: DebugTarget, line: number, column: number): DebugStatement {
  return { kind: 'debug', target, line, column };
}

export function createWhenStmt(
  condition: Statement,
  body: Statement[],
  line: number,
  column: number
): WhenStatement {
  return { kind: 'when', condition, body, line, column };
}

export function createWhenExpressionStmt(
  subject: string,
  condition: Expression,
  body: Statement[],
  elseBody: Statement[] | null,
  elseWhen: WhenExpressionStatement | null,
  line: number,
  column: number
): WhenExpressionStatement {
  return { kind: 'whenExpression', subject, condition, body, elseBody, elseWhen, line, column };
}

export function createChanceStmt(
  percent: Expression,
  body: Statement[],
  elseBody: Statement[] | null,
  line: number,
  column: number
): ChanceStatement {
  return { kind: 'chance', percent, body, elseBody, line, column };
}

export function createAllStmt(
  typeName: string,
  queryVariable: string | null,
  action: Statement | null,
  line: number,
  column: number
): AllStatement {
  return { kind: 'all', typeName, queryVariable, action, line, column };
}

export function createEachStmt(
  collection: string,
  variable: string,
  body: Statement[],
  line: number,
  column: number
): EachStatement {
  return { kind: 'each', collection, variable, body, line, column };
}

export function createQueryStmt(
  subject: QueryPattern,
  relation: string,
  target: string | null,
  targetValue: unknown,
  whereCondition: Expression | null,
  line: number,
  column: number
): QueryStatement {
  return { kind: 'query', subject, relation, target, targetValue, whereCondition, line, column };
}

/**
 * 문장을 문자열로 변환
 */
export function statementToString(stmt: Statement): string {
  switch (stmt.kind) {
    case 'relation': {
      if (stmt.arguments.length === 0) return `${stmt.subject} ${stmt.relation}`;
      const argsStr = stmt.arguments.map((a) => (typeof a === 'string' ? `"${a}"` : String(a))).join(' ');
      return `${stmt.subject} ${stmt.relation} ${argsStr}`;
    }
    case 'hasExpression':
      return `${stmt.subject} HAS ${stmt.property} (${expressionToString(stmt.valueExpression)})`;
    case 'expressionPrint':
      return `${expressionToString(stmt.subject)} PRINT`;
    case 'expressionHas':
      if (stmt.valueExpression) {
        return `${expressionToString(stmt.subject)} HAS ${stmt.property} (${expressionToString(stmt.valueExpression)})`;
      }
      return `${expressionToString(stmt.subject)} HAS ${stmt.property} ${stmt.value}`;
    case 'roleDefinition':
      return `${stmt.subject} HAS ${stmt.roleName} (Node)`;
    case 'doBlock':
      return `${stmt.subject} DO [${stmt.body.length} statements] END`;
    case 'can':
      return `${stmt.subject} CAN ${stmt.ability}`;
    case 'loses':
      return stmt.type === LosesType.Is
        ? `${stmt.subject} LOSES IS ${stmt.target}`
        : `${stmt.subject} LOSES ${stmt.target}`;
    case 'debug':
      return `DEBUG ${stmt.target}`;
    case 'when':
      return `${statementToString(stmt.condition)} WHEN DO [${stmt.body.length} statements] END`;
    case 'whenExpression': {
      let result = `${stmt.subject} WHEN (${expressionToString(stmt.condition)}) DO [${stmt.body.length} statements]`;
      if (stmt.elseWhen) {
        result += ` ELSE ${statementToString(stmt.elseWhen)}`;
      } else if (stmt.elseBody) {
        result += ` ELSE DO [${stmt.elseBody.length} statements]`;
      }
      return result + ' END';
    }
    case 'chance': {
      let result = `CHANCE ${expressionToString(stmt.percent)} DO [${stmt.body.length} statements]`;
      if (stmt.elseBody) {
        result += ` ELSE DO [${stmt.elseBody.length} statements]`;
      }
      return result + ' END';
    }
    case 'all': {
      const target = stmt.queryVariable ? `?${stmt.queryVariable}` : stmt.typeName;
      return stmt.action ? `ALL ${target} ${statementToString(stmt.action)}` : `ALL ${target}`;
    }
    case 'each':
      return `${stmt.collection} EACH ${stmt.variable} DO [${stmt.body.length} statements] END`;
    case 'query': {
      const subjectStr = stmt.subject.isWildcard ? '?' : `?${stmt.subject.variableName}`;
      let result = `${subjectStr} ${stmt.relation}`;
      if (stmt.target) result += ` ${stmt.target}`;
      if (stmt.targetValue !== null && stmt.targetValue !== undefined) result += ` ${stmt.targetValue}`;
      if (stmt.whereCondition) result += ` WHERE ${expressionToString(stmt.whereCondition)}`;
      return result;
    }
  }
}
