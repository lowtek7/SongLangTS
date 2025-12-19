import {
  Expression,
  BinaryOperator,
  UnaryOperator,
} from '../parser/Expression.js';
import {
  Statement,
  RelationStatement,
  HasExpressionStatement,
  ExpressionPrintStatement,
  ExpressionHasStatement,
  RoleDefinitionStatement,
  DoBlockStatement,
  CanStatement,
  LosesStatement,
  DebugStatement,
  WhenStatement,
  WhenExpressionStatement,
  ChanceStatement,
  AllStatement,
  EachStatement,
  QueryStatement,
  DebugTarget,
  LosesType,
  createRelationStmt,
} from '../parser/Statement.js';
import { Graph } from './Graph.js';
import { SongNode } from './Node.js';
import { SongError, ErrorType, InterpreterError } from './SongError.js';

/**
 * 출력 콜백 타입
 */
export type OutputCallback = (line: string) => void;

/**
 * 인터프리터 옵션
 */
export interface InterpreterOptions {
  onOutput?: OutputCallback;
}

/**
 * Song 언어의 인터프리터
 */
export class Interpreter {
  private readonly _graph: Graph = new Graph();
  private readonly onOutput: OutputCallback;

  // 현재 실행 컨텍스트 (DO 블록 내에서 사용)
  private readonly context: Map<string, unknown> = new Map();

  // WHEN 표현식 컨텍스트
  private whenSubject: SongNode | null = null;

  get graph(): Graph {
    return this._graph;
  }

  constructor(options: InterpreterOptions = {}) {
    this.onOutput = options.onOutput ?? ((line) => console.log(line));
  }

  /**
   * 문장 리스트 실행
   */
  execute(statements: Statement[]): void {
    for (const stmt of statements) {
      this.executeStatement(stmt);
    }
  }

  private executeStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'relation':
        this.executeRelation(stmt);
        break;
      case 'hasExpression':
        this.executeHasExpression(stmt);
        break;
      case 'roleDefinition':
        this.executeRoleDefinition(stmt);
        break;
      case 'doBlock':
        this.executeDoBlock(stmt);
        break;
      case 'can':
        this.executeCan(stmt);
        break;
      case 'loses':
        this.executeLoses(stmt);
        break;
      case 'debug':
        this.executeDebug(stmt);
        break;
      case 'when':
        this.executeWhen(stmt);
        break;
      case 'whenExpression':
        this.executeWhenExpression(stmt);
        break;
      case 'all':
        this.executeAll(stmt);
        break;
      case 'each':
        this.executeEach(stmt);
        break;
      case 'query':
        this.executeQuery(stmt);
        break;
      case 'expressionPrint':
        this.executeExpressionPrint(stmt);
        break;
      case 'expressionHas':
        this.executeExpressionHas(stmt);
        break;
      case 'chance':
        this.executeChance(stmt);
        break;
      default: {
        const exhaustiveCheck: never = stmt;
        void exhaustiveCheck;
        throw new InterpreterError(`알 수 없는 문장 타입`, 0, 0);
      }
    }
  }

  private executeDebug(stmt: DebugStatement): void {
    switch (stmt.target) {
      case DebugTarget.Graph:
        this.dumpGraph();
        break;
      case DebugTarget.Tokens:
      case DebugTarget.Ast:
        this.onOutput(`DEBUG ${stmt.target}는 아직 구현되지 않았습니다.`);
        break;
    }
  }

  dumpGraph(): void {
    this.onOutput('--- Graph State ---');
    if (this._graph.count === 0) {
      this.onOutput('(empty)');
      return;
    }

    for (const node of this._graph.allNodes) {
      this.onOutput(this.formatNode(node));
    }
    this.onOutput('-------------------');
  }

  private formatNode(node: SongNode): string {
    let result = `Node(${node.name})`;

    if (node.parents.length > 0) {
      result += ` IS ${node.parents.map((p) => p.name).join(', ')}`;
    }

    // 내부 속성 제외
    const visibleProps: string[] = [];
    for (const [key, value] of node.properties) {
      if (!key.startsWith('_')) {
        let val: string;
        if (typeof value === 'string') {
          val = `"${value}"`;
        } else if (value instanceof SongNode) {
          val = `→${value.name}`;
        } else {
          val = String(value);
        }
        visibleProps.push(`${key}=${val}`);
      }
    }

    if (visibleProps.length > 0) {
      result += ` { ${visibleProps.join(', ')} }`;
    }

    // 쿼리 결과
    const items = node.properties.get('_Items') as SongNode[] | undefined;
    if (items && items.length > 0) {
      result += ` CONTAINS [${items.map((n) => n.name).join(', ')}]`;
    }

    // 능력
    const abilities = node.properties.get('_Abilities') as Set<string> | undefined;
    if (abilities && abilities.size > 0) {
      result += ` CAN [${Array.from(abilities).join(', ')}]`;
    }

    return result;
  }

  private resolveNode(name: string): SongNode {
    // 컨텍스트에서 먼저 찾기
    const contextValue = this.context.get(name);
    if (contextValue instanceof SongNode) {
      return contextValue;
    }

    return this._graph.getOrCreateNode(name);
  }

  private resolveNodeOrNull(name: string): SongNode | null {
    const contextValue = this.context.get(name);
    if (contextValue instanceof SongNode) {
      return contextValue;
    }

    return this._graph.getNode(name);
  }

  private executeRelation(stmt: RelationStatement): void {
    const subject = this.resolveNode(stmt.subject);

    switch (stmt.relation.toUpperCase()) {
      case 'IS':
        this.executeIs(subject, stmt);
        break;
      case 'HAS':
        this.executeHas(subject, stmt);
        break;
      case 'PRINT':
        this.executePrint(subject);
        break;
      default:
        this.executeCustomRelation(subject, stmt);
        break;
    }
  }

  private executeIs(subject: SongNode, stmt: RelationStatement): void {
    const objName = stmt.arguments[0];
    if (objName === null || objName === undefined) {
      throw new InterpreterError('IS 관계에는 객체가 필요합니다', stmt.line, stmt.column);
    }

    const parent = this.resolveNode(String(objName));
    subject.addParent(parent);
  }

  private executeHas(subject: SongNode, stmt: RelationStatement): void {
    const propName = stmt.arguments[0];
    if (propName === null || propName === undefined) {
      throw new InterpreterError('HAS 관계에는 속성 이름이 필요합니다', stmt.line, stmt.column);
    }

    let value = stmt.arguments[1] ?? null;

    // 값이 문자열이고 존재하는 노드 이름이면 노드 참조로 저장
    if (typeof value === 'string') {
      const node = this._graph.getNode(value);
      if (node !== null) {
        value = node;
      }
    }

    subject.setProperty(String(propName), value);
  }

  private executeHasExpression(stmt: HasExpressionStatement): void {
    const subject = this.resolveNode(stmt.subject);
    const value = this.evaluateExpression(stmt.valueExpression);
    subject.setProperty(stmt.property, value);
  }

  private executePrint(subject: SongNode): void {
    const name = subject.getProperty('Name');
    if (name === null || name === undefined) {
      this.onOutput(subject.name);
    } else {
      this.onOutput(String(name));
    }
  }

  private executeExpressionPrint(stmt: ExpressionPrintStatement): void {
    const value = this.evaluateExpression(stmt.subject);
    if (value instanceof SongNode) {
      const name = value.getProperty('Name');
      this.onOutput(name !== null && name !== undefined ? String(name) : value.name);
    } else {
      this.onOutput(value !== null && value !== undefined ? String(value) : 'null');
    }
  }

  private executeExpressionHas(stmt: ExpressionHasStatement): void {
    const subjectValue = this.evaluateExpression(stmt.subject);
    if (!(subjectValue instanceof SongNode)) {
      throw new InterpreterError('HAS의 주어는 노드여야 합니다', stmt.line, stmt.column);
    }

    let value: unknown;
    if (stmt.valueExpression !== null) {
      value = this.evaluateExpression(stmt.valueExpression);
    } else {
      value = stmt.value;
      if (typeof value === 'string') {
        const node = this._graph.getNode(value);
        if (node !== null) {
          value = node;
        }
      }
    }

    subjectValue.setProperty(stmt.property, value);
  }

  private executeRoleDefinition(stmt: RoleDefinitionStatement): void {
    const subject = this._graph.getOrCreateNode(stmt.subject);

    let roles = subject.getProperty('_Roles') as string[] | null;
    if (roles === null) {
      roles = [];
      subject.setProperty('_Roles', roles);
    }

    if (!roles.includes(stmt.roleName)) {
      roles.push(stmt.roleName);
    }
  }

  private executeCustomRelation(subject: SongNode, stmt: RelationStatement): void {
    const relationNode = this._graph.getNode(stmt.relation);

    if (relationNode === null) {
      if (stmt.arguments.length > 0) {
        const objName = String(stmt.arguments[0]);
        const objNode = this._graph.getOrCreateNode(objName);
        subject.setProperty(`_${stmt.relation}`, objNode.name);
      }
      return;
    }

    if (!relationNode.is('RELATION')) {
      throw new InterpreterError(`'${stmt.relation}'는 관계가 아닙니다`, stmt.line, stmt.column);
    }

    const doBody = relationNode.getProperty('_DoBody') as Statement[] | null;
    if (doBody !== null) {
      const roles = relationNode.getProperty('_Roles') as string[] | null;

      if (roles !== null && roles.length > 0) {
        this.context.set(roles[0], subject);

        for (let i = 1; i < roles.length && i <= stmt.arguments.length; i++) {
          const argName = String(stmt.arguments[i - 1]);
          if (argName) {
            this.context.set(roles[i], this._graph.getOrCreateNode(argName));
          }
        }

        this.execute(doBody);

        for (const role of roles) {
          this.context.delete(role);
        }
      } else {
        this.execute(doBody);
      }
    }
  }

  private executeDoBlock(stmt: DoBlockStatement): void {
    const subject = this.resolveNode(stmt.subject);
    subject.setProperty('_DoBody', stmt.body);
  }

  private executeCan(stmt: CanStatement): void {
    const subject = this.resolveNode(stmt.subject);

    let abilities = subject.getProperty('_Abilities') as Set<string> | null;
    if (abilities === null) {
      abilities = new Set();
      subject.setProperty('_Abilities', abilities);
    }

    abilities.add(stmt.ability);
  }

  private executeLoses(stmt: LosesStatement): void {
    const subject = this.resolveNode(stmt.subject);

    switch (stmt.type) {
      case LosesType.Is: {
        const parent = this.resolveNodeOrNull(stmt.target);
        if (parent !== null) {
          subject.removeParent(parent);
        }
        break;
      }
      case LosesType.Auto: {
        const abilities = subject.getProperty('_Abilities') as Set<string> | null;
        if (abilities?.has(stmt.target)) {
          abilities.delete(stmt.target);
        } else if (subject.hasOwnProperty(stmt.target)) {
          subject.removeProperty(stmt.target);
        }
        break;
      }
    }
  }

  private executeWhen(stmt: WhenStatement): void {
    if (this.evaluateCondition(stmt.condition)) {
      this.execute(stmt.body);
    }
  }

  private executeWhenExpression(stmt: WhenExpressionStatement): void {
    const subjectNode = this._graph.getNode(stmt.subject);

    if (subjectNode !== null) {
      this.context.set(stmt.subject, subjectNode);
    }

    const previousWhenSubject = this.whenSubject;
    this.whenSubject = subjectNode;

    try {
      const result = this.evaluateExpression(stmt.condition);

      if (this.isTruthy(result)) {
        this.execute(stmt.body);
      } else {
        if (stmt.elseWhen !== null) {
          this.executeWhenExpression(stmt.elseWhen);
        } else if (stmt.elseBody !== null) {
          this.execute(stmt.elseBody);
        }
      }
    } finally {
      this.whenSubject = previousWhenSubject;
      if (subjectNode !== null) {
        this.context.delete(stmt.subject);
      }
    }
  }

  private executeChance(stmt: ChanceStatement): void {
    const percentValue = this.evaluateExpression(stmt.percent);
    const percent = this.toNumber(percentValue, stmt.percent);

    const roll = Math.floor(Math.random() * 100);

    if (roll < percent) {
      this.execute(stmt.body);
    } else if (stmt.elseBody !== null) {
      this.execute(stmt.elseBody);
    }
  }

  private evaluateCondition(condition: Statement): boolean {
    if (condition.kind === 'relation') {
      const node = this._graph.getNode(condition.subject);
      if (node === null) return false;

      switch (condition.relation.toUpperCase()) {
        case 'HAS':
          return this.evaluateHasCondition(node, condition);
        case 'IS':
          return condition.arguments[0] !== null && node.is(String(condition.arguments[0]));
        case 'CAN':
          return condition.arguments[0] !== null && this.nodeCan(node, String(condition.arguments[0]));
        default:
          return false;
      }
    }

    return false;
  }

  private evaluateHasCondition(node: SongNode, rel: RelationStatement): boolean {
    const propName = rel.arguments[0];
    if (propName === null || propName === undefined) return false;

    const propValue = node.getProperty(String(propName));

    const relValue = rel.arguments[1];
    if (relValue === null || relValue === undefined) {
      return propValue !== null && propValue !== undefined;
    }

    if (propValue === null || propValue === undefined) return false;

    if (typeof relValue === 'number' && typeof propValue === 'number') {
      return Math.abs(relValue - propValue) < 0.0001;
    }

    return relValue === propValue;
  }

  private executeAll(stmt: AllStatement): void {
    let matchingNodes: SongNode[];

    if (stmt.queryVariable !== null) {
      matchingNodes = this.getQueryResults(stmt.queryVariable);
      if (matchingNodes.length === 0) {
        this.onOutput(`ALL ?${stmt.queryVariable}: No query results found (run query first)`);
        return;
      }
    } else {
      matchingNodes = this._graph.allNodes.filter((n) => n.is(stmt.typeName));
    }

    if (stmt.action === null) {
      const target = stmt.queryVariable !== null ? `?${stmt.queryVariable}` : stmt.typeName;
      this.onOutput(`ALL ${target}: ${matchingNodes.length} nodes found`);
      return;
    }

    for (const node of matchingNodes) {
      this.executeActionOnNode(node, stmt.action);
    }
  }

  private executeActionOnNode(node: SongNode, action: Statement): void {
    if (action.kind === 'relation') {
      const newRel = createRelationStmt(
        node.name,
        action.relation,
        action.arguments,
        action.line,
        action.column
      );
      this.executeRelation(newRel);
    }
  }

  private executeEach(stmt: EachStatement): void {
    const collectionNode = this._graph.getNode(stmt.collection);
    if (collectionNode === null) {
      throw new InterpreterError(`컬렉션 '${stmt.collection}'을 찾을 수 없습니다`, stmt.line, stmt.column);
    }

    const children = this._graph.allNodes.filter((n) => n.parents.includes(collectionNode));

    for (const child of children) {
      this.context.set(stmt.variable, child);
      this.execute(stmt.body);
      this.context.delete(stmt.variable);
    }
  }

  private executeQuery(stmt: QueryStatement): void {
    let matchingNodes = this.findMatchingNodes(stmt);

    if (stmt.whereCondition !== null) {
      matchingNodes = this.filterByWhereCondition(matchingNodes, stmt);
    }

    if (!stmt.subject.isWildcard && stmt.subject.variableName !== null) {
      const varName = stmt.subject.variableName;

      const resultNode = this._graph.getOrCreateNode(varName);

      const queryResultType = this._graph.getOrCreateNode('QueryResult');
      if (!resultNode.parents.includes(queryResultType)) {
        resultNode.addParent(queryResultType);
      }

      resultNode.setProperty('_Items', matchingNodes);

      this.onOutput(`Query ?${varName}: ${matchingNodes.length} nodes found`);
      for (const node of matchingNodes) {
        this.onOutput(`  - ${node.name}`);
      }
    } else {
      this.onOutput(`Query: ${matchingNodes.length} nodes found`);
      for (const node of matchingNodes) {
        this.onOutput(`  - ${node.name}`);
      }
    }
  }

  private findMatchingNodes(stmt: QueryStatement): SongNode[] {
    const result: SongNode[] = [];

    for (const node of this._graph.allNodes) {
      let matches = false;

      switch (stmt.relation) {
        case 'IS':
          matches = this.matchesIsQuery(node, stmt);
          break;
        case 'HAS':
          matches = this.matchesHasQuery(node, stmt);
          break;
        case 'CAN':
          matches = this.matchesCanQuery(node, stmt);
          break;
      }

      if (matches) {
        result.push(node);
      }
    }

    return result;
  }

  private matchesIsQuery(node: SongNode, stmt: QueryStatement): boolean {
    if (stmt.target === null) return true;
    return node.is(stmt.target);
  }

  private matchesHasQuery(node: SongNode, stmt: QueryStatement): boolean {
    if (stmt.target === null) return node.properties.size > 0;

    const propValue = node.getProperty(stmt.target);

    if (propValue === null || propValue === undefined) return false;

    if (stmt.targetValue === null || stmt.targetValue === undefined) return true;

    if (typeof stmt.targetValue === 'number' && typeof propValue === 'number') {
      return Math.abs(stmt.targetValue - propValue) < 0.0001;
    }

    return stmt.targetValue === propValue;
  }

  private matchesCanQuery(node: SongNode, stmt: QueryStatement): boolean {
    if (stmt.target === null) {
      const abilities = node.getProperty('_Abilities') as Set<string> | null;
      return abilities !== null && abilities.size > 0;
    }
    return this.nodeCan(node, stmt.target);
  }

  private filterByWhereCondition(nodes: SongNode[], stmt: QueryStatement): SongNode[] {
    const result: SongNode[] = [];
    const varName = stmt.subject.variableName ?? '_';

    for (const node of nodes) {
      this.context.set(varName, node);

      try {
        const conditionResult = this.evaluateExpression(stmt.whereCondition!);

        if (typeof conditionResult === 'boolean' && conditionResult) {
          result.push(node);
        } else if (typeof conditionResult === 'number' && conditionResult !== 0) {
          result.push(node);
        }
      } catch {
        // 평가 실패 시 해당 노드는 제외
      } finally {
        this.context.delete(varName);
      }
    }

    return result;
  }

  getQueryResults(variableName: string): SongNode[] {
    const resultNode = this._graph.getNode(variableName);
    if (resultNode !== null) {
      if (resultNode.is('QueryResult')) {
        const items = resultNode.getProperty('_Items') as SongNode[] | null;
        if (items !== null) {
          return items;
        }
      }
    }
    return [];
  }

  // Expression Evaluation

  private evaluateExpression(expr: Expression): unknown {
    switch (expr.kind) {
      case 'number':
        return expr.value;
      case 'string':
        return expr.value;
      case 'identifier':
        return this.resolveIdentifier(expr);
      case 'propertyAccess':
        return this.resolvePropertyAccess(expr);
      case 'binary':
        return this.evaluateBinary(expr);
      case 'unary':
        return this.evaluateUnary(expr);
      case 'grouping':
        return this.evaluateExpression(expr.inner);
      case 'random':
        return this.evaluateRandom(expr);
      default: {
        const exhaustiveCheck: never = expr;
        void exhaustiveCheck;
        throw new InterpreterError('알 수 없는 표현식 타입', 0, 0);
      }
    }
  }

  private evaluateRandom(expr: Expression & { kind: 'random'; min: Expression; max: Expression }): number {
    const minValue = this.evaluateExpression(expr.min);
    const maxValue = this.evaluateExpression(expr.max);

    const min = Math.floor(this.toNumber(minValue, expr.min));
    const max = Math.floor(this.toNumber(maxValue, expr.max));

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private resolveIdentifier(id: Expression & { kind: 'identifier'; name: string }): unknown {
    // 컨텍스트에서 먼저 찾기
    if (this.context.has(id.name)) {
      return this.context.get(id.name);
    }

    // 그래프에서 노드 찾기
    const node = this._graph.getNode(id.name);
    if (node !== null) {
      return node;
    }

    // WHEN 컨텍스트에서 Subject의 속성으로 해석 시도
    if (this.whenSubject !== null) {
      const propValue = this.whenSubject.getProperty(id.name);
      if (propValue !== null && propValue !== undefined) {
        return propValue;
      }
    }

    throw new SongError(ErrorType.NodeNotFound, `"${id.name}"`, id.line, id.column);
  }

  private resolvePropertyAccess(prop: Expression & { kind: 'propertyAccess'; object: Expression; property: string }): unknown {
    const obj = this.evaluateExpression(prop.object);

    if (obj instanceof SongNode) {
      const value = obj.getProperty(prop.property);
      if (value === null || value === undefined) {
        throw new SongError(
          ErrorType.PropertyNotFound,
          `"${obj.name}" has no "${prop.property}"`,
          prop.line,
          prop.column
        );
      }
      return value;
    }

    throw new SongError(ErrorType.TypeMismatch, `'${prop.object}' is not a Node`, prop.line, prop.column);
  }

  private evaluateBinary(bin: Expression & { kind: 'binary'; left: Expression; operator: BinaryOperator; right: Expression }): unknown {
    // AND, OR은 short-circuit 평가
    if (bin.operator === BinaryOperator.And) {
      const left = this.evaluateExpression(bin.left);
      if (!this.isTruthy(left)) return false;
      return this.isTruthy(this.evaluateExpression(bin.right));
    }

    if (bin.operator === BinaryOperator.Or) {
      const left = this.evaluateExpression(bin.left);
      if (this.isTruthy(left)) return true;
      return this.isTruthy(this.evaluateExpression(bin.right));
    }

    const leftVal = this.evaluateExpression(bin.left);
    const rightVal = this.evaluateExpression(bin.right);

    switch (bin.operator) {
      case BinaryOperator.Add:
        return this.add(leftVal, rightVal, bin);
      case BinaryOperator.Subtract:
        return this.toNumber(leftVal, bin.left) - this.toNumber(rightVal, bin.right);
      case BinaryOperator.Multiply:
        return this.toNumber(leftVal, bin.left) * this.toNumber(rightVal, bin.right);
      case BinaryOperator.Divide: {
        const divisor = this.toNumber(rightVal, bin.right);
        if (divisor === 0) {
          throw new SongError(ErrorType.DivisionByZero, 'Cannot divide by zero', bin.line, bin.column);
        }
        return this.toNumber(leftVal, bin.left) / divisor;
      }
      case BinaryOperator.Modulo: {
        const divisor = this.toNumber(rightVal, bin.right);
        if (divisor === 0) {
          throw new SongError(ErrorType.DivisionByZero, 'Cannot modulo by zero', bin.line, bin.column);
        }
        return this.toNumber(leftVal, bin.left) % divisor;
      }
      case BinaryOperator.Equal:
        return this.equals(leftVal, rightVal);
      case BinaryOperator.NotEqual:
        return !this.equals(leftVal, rightVal);
      case BinaryOperator.LessThan:
        return this.compare(leftVal, rightVal, bin) < 0;
      case BinaryOperator.GreaterThan:
        return this.compare(leftVal, rightVal, bin) > 0;
      case BinaryOperator.LessEqual:
        return this.compare(leftVal, rightVal, bin) <= 0;
      case BinaryOperator.GreaterEqual:
        return this.compare(leftVal, rightVal, bin) >= 0;
      default:
        throw new InterpreterError(`알 수 없는 연산자: ${bin.operator}`, bin.line, bin.column);
    }
  }

  private evaluateUnary(unary: Expression & { kind: 'unary'; operator: UnaryOperator; operand: Expression }): unknown {
    const operand = this.evaluateExpression(unary.operand);

    switch (unary.operator) {
      case UnaryOperator.Negate:
        return -this.toNumber(operand, unary.operand);
      case UnaryOperator.Not:
        return !this.isTruthy(operand);
      default:
        throw new InterpreterError(`알 수 없는 연산자: ${unary.operator}`, unary.line, unary.column);
    }
  }

  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (value instanceof SongNode) return true;
    return true;
  }

  private toNumber(value: unknown, expr: Expression): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value === null || value === undefined) {
      throw new SongError(ErrorType.TypeMismatch, 'null cannot be converted to Number', expr.line, expr.column);
    }
    throw new SongError(ErrorType.TypeMismatch, `'${value}' cannot be converted to Number`, expr.line, expr.column);
  }

  private add(left: unknown, right: unknown, expr: Expression): unknown {
    if (typeof left === 'string' || typeof right === 'string') {
      return `${left}${right}`;
    }
    return this.toNumber(left, expr) + this.toNumber(right, expr);
  }

  private compare(left: unknown, right: unknown, expr: Expression): number {
    const l = this.toNumber(left, expr);
    const r = this.toNumber(right, expr);
    if (l < r) return -1;
    if (l > r) return 1;
    return 0;
  }

  private equals(left: unknown, right: unknown): boolean {
    if (left === null && right === null) return true;
    if (left === undefined && right === undefined) return true;
    if (left === null || left === undefined || right === null || right === undefined) return false;
    return left === right;
  }

  private nodeCan(node: SongNode, ability: string): boolean {
    const abilities = node.getProperty('_Abilities') as Set<string> | null;
    if (abilities?.has(ability)) {
      return true;
    }

    for (const parent of node.parents) {
      if (this.nodeCan(parent, ability)) {
        return true;
      }
    }

    return false;
  }
}
