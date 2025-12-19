import { Token } from '../tokenizer/Token.js';
import { TokenType } from '../tokenizer/TokenType.js';
import {
  Expression,
  BinaryOperator,
  UnaryOperator,
  createNumberExpr,
  createStringExpr,
  createIdentifierExpr,
  createPropertyAccessExpr,
  createBinaryExpr,
  createUnaryExpr,
  createGroupingExpr,
  createRandomExpr,
} from './Expression.js';
import {
  Statement,
  DebugTarget,
  LosesType,
  QueryPattern,
  createWildcardPattern,
  createVariablePattern,
  createRelationStmt,
  createHasExpressionStmt,
  createExpressionPrintStmt,
  createExpressionHasStmt,
  createRoleDefinitionStmt,
  createDoBlockStmt,
  createCanStmt,
  createLosesStmt,
  createDebugStmt,
  createWhenStmt,
  createWhenExpressionStmt,
  createChanceStmt,
  createAllStmt,
  createEachStmt,
  createQueryStmt,
} from './Statement.js';

/**
 * 파서 오류
 */
export class ParserError extends Error {
  readonly token: Token;

  constructor(message: string, token: Token) {
    super(`[${token.line}:${token.column}] ${message}`);
    this.name = 'ParserError';
    this.token = token;
  }
}

/**
 * Song 언어의 파서
 */
export class Parser {
  private readonly tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Statement[] {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (!this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt !== null) {
          statements.push(stmt);
        }
      }
    }

    return statements;
  }

  private parseStatement(): Statement | null {
    // DEBUG 문장 처리
    if (this.check(TokenType.DEBUG)) {
      return this.parseDebug();
    }

    // ALL 문장 처리
    if (this.check(TokenType.ALL)) {
      return this.parseAll();
    }

    // 쿼리 문장 처리
    if (this.check(TokenType.QUESTION) || this.check(TokenType.QUERY_VAR)) {
      return this.parseQuery();
    }

    // 괄호로 시작하는 표현식
    if (this.check(TokenType.LPAREN)) {
      return this.parseParenthesizedExpressionStatement();
    }

    // CHANCE 문장 처리
    if (this.check(TokenType.CHANCE)) {
      return this.parseChance();
    }

    // 문장은 항상 IDENTIFIER로 시작
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`문장은 식별자로 시작해야 합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const subjectToken = this.advance();

    // 체인된 속성 접근 확인
    let subjectExpr: Expression | null = null;
    if (this.check(TokenType.DOT)) {
      subjectExpr = createIdentifierExpr(subjectToken.lexeme, subjectToken.line, subjectToken.column);
      while (this.check(TokenType.DOT)) {
        this.advance(); // '.'
        if (!this.check(TokenType.IDENTIFIER)) {
          throw new ParserError(`'.' 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
        }
        const property = this.advance();
        subjectExpr = createPropertyAccessExpr(subjectExpr, property.lexeme, subjectExpr.line, subjectExpr.column);
      }
    }

    // 표현식 주어인 경우
    if (subjectExpr !== null) {
      return this.parseExpressionSubjectStatement(subjectExpr);
    }

    // 단순 식별자 주어
    if (!this.checkRelation()) {
      throw new ParserError(`관계가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const relation = this.advance();

    let stmt: Statement;
    switch (relation.type) {
      case TokenType.DO:
        stmt = this.parseDoBlock(subjectToken);
        break;
      case TokenType.PRINT:
        stmt = createRelationStmt(subjectToken.lexeme, relation.lexeme, [], subjectToken.line, subjectToken.column);
        break;
      case TokenType.CAN:
        stmt = this.parseCan(subjectToken);
        break;
      case TokenType.LOSES:
        stmt = this.parseLoses(subjectToken);
        break;
      case TokenType.HAS:
        stmt = this.parseHas(subjectToken);
        break;
      case TokenType.IS:
        stmt = this.parseIs(subjectToken);
        break;
      case TokenType.EACH:
        stmt = this.parseEach(subjectToken);
        break;
      case TokenType.WHEN:
        stmt = this.parseWhenExpression(subjectToken);
        break;
      default:
        stmt = this.parseCustomRelation(subjectToken, relation);
    }

    // 기존 WHEN 조건 체크
    if (this.check(TokenType.WHEN)) {
      return this.parseWhen(stmt);
    }

    return stmt;
  }

  private parseParenthesizedExpressionStatement(): Statement {
    this.advance(); // '('
    const expr = this.parseExpression();

    if (!this.check(TokenType.RPAREN)) {
      throw new ParserError(`')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }
    this.advance(); // ')'

    return this.parseExpressionSubjectStatement(expr);
  }

  private parseExpressionSubjectStatement(subjectExpr: Expression): Statement {
    if (!this.check(TokenType.PRINT) && !this.check(TokenType.HAS)) {
      throw new ParserError(`표현식 주어 뒤에는 PRINT 또는 HAS가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const relation = this.advance();

    if (relation.type === TokenType.PRINT) {
      return createExpressionPrintStmt(subjectExpr, subjectExpr.line, subjectExpr.column);
    }

    // HAS
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`HAS 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const property = this.advance();

    // 괄호로 시작하면 표현식
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // '('
      const valueExpr = this.parseExpression();
      if (!this.check(TokenType.RPAREN)) {
        throw new ParserError(`표현식 뒤에 ')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
      this.advance(); // ')'
      return createExpressionHasStmt(subjectExpr, property.lexeme, null, valueExpr, subjectExpr.line, subjectExpr.column);
    }

    // 일반 값
    if (this.checkEndOfStatement()) {
      return createExpressionHasStmt(subjectExpr, property.lexeme, null, null, subjectExpr.line, subjectExpr.column);
    }

    const value = this.parseSimpleValue();
    return createExpressionHasStmt(subjectExpr, property.lexeme, value, null, subjectExpr.line, subjectExpr.column);
  }

  private parseDebug(): Statement {
    const debugToken = this.advance(); // DEBUG

    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`DEBUG 뒤에 대상(GRAPH 등)이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const targetToken = this.advance();
    let target: DebugTarget;
    switch (targetToken.lexeme.toUpperCase()) {
      case 'GRAPH':
        target = DebugTarget.Graph;
        break;
      case 'TOKENS':
        target = DebugTarget.Tokens;
        break;
      case 'AST':
        target = DebugTarget.Ast;
        break;
      default:
        throw new ParserError(`알 수 없는 DEBUG 대상: ${targetToken.lexeme}`, targetToken);
    }

    return createDebugStmt(target, debugToken.line, debugToken.column);
  }

  private parseIs(subject: Token): Statement {
    if (!this.check(TokenType.IDENTIFIER) && !this.check(TokenType.RELATION)) {
      throw new ParserError(`IS 뒤에 타입이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const obj = this.advance();
    return createRelationStmt(subject.lexeme, 'IS', [obj.lexeme], subject.line, subject.column);
  }

  private parseHas(subject: Token): Statement {
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`HAS 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const property = this.advance();

    // 괄호로 시작하면 표현식 또는 역할 정의
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // '('

      // (Node) 패턴 확인 - 역할 정의
      if (this.check(TokenType.IDENTIFIER) && this.peek().lexeme.toLowerCase() === 'node') {
        this.advance(); // 'Node'
        if (!this.check(TokenType.RPAREN)) {
          throw new ParserError(`역할 정의에서 ')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
        }
        this.advance(); // ')'
        return createRoleDefinitionStmt(subject.lexeme, property.lexeme, subject.line, subject.column);
      }

      // 일반 표현식
      const expr = this.parseExpression();

      if (!this.check(TokenType.RPAREN)) {
        throw new ParserError(`표현식 뒤에 ')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
      this.advance(); // ')'

      return createHasExpressionStmt(subject.lexeme, property.lexeme, expr, subject.line, subject.column);
    }

    // 일반 값
    if (this.checkEndOfStatement()) {
      return createRelationStmt(subject.lexeme, 'HAS', [property.lexeme], subject.line, subject.column);
    }

    const value = this.parseSimpleValue();
    return createRelationStmt(subject.lexeme, 'HAS', [property.lexeme, value], subject.line, subject.column);
  }

  private parseCan(subject: Token): Statement {
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`CAN 뒤에 능력 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const ability = this.advance();
    return createCanStmt(subject.lexeme, ability.lexeme, subject.line, subject.column);
  }

  private parseLoses(subject: Token): Statement {
    // LOSES IS Parent 형태 확인
    if (this.check(TokenType.IS)) {
      this.advance(); // IS
      if (!this.check(TokenType.IDENTIFIER)) {
        throw new ParserError(`LOSES IS 뒤에 부모 노드 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
      const parent = this.advance();
      return createLosesStmt(subject.lexeme, parent.lexeme, LosesType.Is, subject.line, subject.column);
    }

    // LOSES Target 형태
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`LOSES 뒤에 대상이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const target = this.advance();
    return createLosesStmt(subject.lexeme, target.lexeme, LosesType.Auto, subject.line, subject.column);
  }

  private parseCustomRelation(subject: Token, relation: Token): Statement {
    // 인자가 없는 경우
    if (this.checkEndOfStatement()) {
      return createRelationStmt(subject.lexeme, relation.lexeme, [], subject.line, subject.column);
    }

    // 모든 인자 수집
    const args: unknown[] = [];

    while (!this.checkEndOfStatement()) {
      if (this.check(TokenType.IDENTIFIER)) {
        args.push(this.advance().lexeme);
      } else if (this.check(TokenType.NUMBER)) {
        args.push(this.advance().value);
      } else if (this.check(TokenType.STRING)) {
        args.push(this.advance().value);
      } else {
        throw new ParserError(`인자(식별자, 숫자, 문자열)가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
    }

    return createRelationStmt(subject.lexeme, relation.lexeme, args, subject.line, subject.column);
  }

  private parseDoBlock(subject: Token): Statement {
    this.skipNewlines();

    const body: Statement[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    if (!this.check(TokenType.END)) {
      throw new ParserError("DO 블록이 닫히지 않았습니다. 'END'가 필요합니다.", this.peek());
    }

    this.advance(); // END

    return createDoBlockStmt(subject.lexeme, body, subject.line, subject.column);
  }

  private parseWhen(condition: Statement): Statement {
    const whenToken = this.advance(); // WHEN

    if (!this.check(TokenType.DO)) {
      throw new ParserError(`WHEN 뒤에 'DO'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    this.advance(); // DO
    this.skipNewlines();

    const body: Statement[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    if (!this.check(TokenType.END)) {
      throw new ParserError("WHEN 블록이 닫히지 않았습니다. 'END'가 필요합니다.", this.peek());
    }

    this.advance(); // END

    return createWhenStmt(condition, body, whenToken.line, whenToken.column);
  }

  private parseWhenExpression(subject: Token): Statement {
    // (condition) 파싱
    if (!this.check(TokenType.LPAREN)) {
      throw new ParserError(`WHEN 뒤에 '('가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    this.advance(); // '('
    const condition = this.parseExpression();

    if (!this.check(TokenType.RPAREN)) {
      throw new ParserError(`조건 뒤에 ')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }
    this.advance(); // ')'

    // DO 블록
    if (!this.check(TokenType.DO)) {
      throw new ParserError(`WHEN 조건 뒤에 'DO'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    this.advance(); // DO
    this.skipNewlines();

    const body: Statement[] = [];

    // ELSE 또는 END까지 파싱
    while (!this.check(TokenType.END) && !this.check(TokenType.ELSE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    let elseBody: Statement[] | null = null;
    let elseWhen: Statement | null = null;

    // ELSE 처리
    if (this.check(TokenType.ELSE)) {
      this.advance(); // ELSE

      // ELSE WHEN (체이닝)
      if (this.check(TokenType.WHEN)) {
        this.advance(); // WHEN
        elseWhen = this.parseWhenExpression(subject);
        return createWhenExpressionStmt(
          subject.lexeme,
          condition,
          body,
          null,
          elseWhen as any,
          subject.line,
          subject.column
        );
      }

      // ELSE DO ... END
      if (!this.check(TokenType.DO)) {
        throw new ParserError(`ELSE 뒤에 'DO' 또는 'WHEN'이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }

      this.advance(); // DO
      this.skipNewlines();

      elseBody = [];

      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt !== null) {
          elseBody.push(stmt);
        }
        this.skipNewlines();
      }
    }

    if (!this.check(TokenType.END)) {
      throw new ParserError("WHEN 블록이 닫히지 않았습니다. 'END'가 필요합니다.", this.peek());
    }

    this.advance(); // END

    return createWhenExpressionStmt(subject.lexeme, condition, body, elseBody, null, subject.line, subject.column);
  }

  private parseChance(): Statement {
    const chanceToken = this.advance(); // CHANCE

    // 확률 표현식 파싱
    let percent: Expression;
    if (this.check(TokenType.NUMBER)) {
      const numToken = this.advance();
      percent = createNumberExpr(numToken.value as number, numToken.line, numToken.column);
    } else if (this.check(TokenType.LPAREN)) {
      this.advance(); // '('
      percent = this.parseExpression();
      if (!this.check(TokenType.RPAREN)) {
        throw new ParserError(`')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
      this.advance(); // ')'
    } else {
      throw new ParserError(`CHANCE 뒤에 확률 값이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    // DO 블록
    if (!this.check(TokenType.DO)) {
      throw new ParserError(`CHANCE 확률 뒤에 'DO'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    this.advance(); // DO
    this.skipNewlines();

    const body: Statement[] = [];

    while (!this.check(TokenType.END) && !this.check(TokenType.ELSE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    let elseBody: Statement[] | null = null;

    // ELSE 처리
    if (this.check(TokenType.ELSE)) {
      this.advance(); // ELSE

      if (!this.check(TokenType.DO)) {
        throw new ParserError(`ELSE 뒤에 'DO'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }

      this.advance(); // DO
      this.skipNewlines();

      elseBody = [];

      while (!this.check(TokenType.END) && !this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt !== null) {
          elseBody.push(stmt);
        }
        this.skipNewlines();
      }
    }

    if (!this.check(TokenType.END)) {
      throw new ParserError("CHANCE 블록이 닫히지 않았습니다. 'END'가 필요합니다.", this.peek());
    }

    this.advance(); // END

    return createChanceStmt(percent, body, elseBody, chanceToken.line, chanceToken.column);
  }

  private parseAll(): Statement {
    const allToken = this.advance(); // ALL

    let typeName: string;
    let queryVariable: string | null = null;

    // 쿼리 변수 또는 타입 이름
    if (this.check(TokenType.QUERY_VAR)) {
      const queryToken = this.advance();
      queryVariable = queryToken.value as string;
      typeName = queryVariable;
    } else if (this.check(TokenType.IDENTIFIER)) {
      const typeToken = this.advance();
      typeName = typeToken.lexeme;
    } else {
      throw new ParserError(`ALL 뒤에 타입 이름 또는 쿼리 변수가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    // 뒤에 액션이 있는지 확인
    if (this.checkEndOfStatement()) {
      return createAllStmt(typeName, queryVariable, null, allToken.line, allToken.column);
    }

    // 액션 파싱
    if (!this.checkRelation()) {
      throw new ParserError(`관계가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const relation = this.advance();

    // 임시 토큰 생성
    const typeToken2: Token = {
      type: TokenType.IDENTIFIER,
      lexeme: typeName,
      value: null,
      line: allToken.line,
      column: allToken.column,
    };

    let action: Statement;
    switch (relation.type) {
      case TokenType.HAS:
        action = this.parseHasForAll(typeToken2);
        break;
      case TokenType.PRINT:
        action = createRelationStmt(typeName, relation.lexeme, [], allToken.line, allToken.column);
        break;
      default:
        action = this.parseCustomRelationForAll(typeToken2, relation);
    }

    return createAllStmt(typeName, queryVariable, action, allToken.line, allToken.column);
  }

  private parseHasForAll(typeName: Token): Statement {
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`HAS 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const property = this.advance();

    if (this.checkEndOfStatement()) {
      return createRelationStmt(typeName.lexeme, 'HAS', [property.lexeme], typeName.line, typeName.column);
    }

    const value = this.parseSimpleValue();
    return createRelationStmt(typeName.lexeme, 'HAS', [property.lexeme, value], typeName.line, typeName.column);
  }

  private parseCustomRelationForAll(typeName: Token, relation: Token): Statement {
    if (this.checkEndOfStatement()) {
      return createRelationStmt(typeName.lexeme, relation.lexeme, [], typeName.line, typeName.column);
    }

    if (!this.check(TokenType.IDENTIFIER) && !this.check(TokenType.NUMBER) && !this.check(TokenType.STRING)) {
      throw new ParserError(`객체가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const obj = this.advance();

    if (this.checkEndOfStatement()) {
      return createRelationStmt(typeName.lexeme, relation.lexeme, [obj.lexeme], typeName.line, typeName.column);
    }

    const value = this.parseSimpleValue();
    return createRelationStmt(typeName.lexeme, relation.lexeme, [obj.lexeme, value], typeName.line, typeName.column);
  }

  private parseEach(subject: Token): Statement {
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParserError(`EACH 뒤에 변수 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const variable = this.advance();

    if (!this.check(TokenType.DO)) {
      throw new ParserError(`EACH 변수 뒤에 'DO'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    this.advance(); // DO
    this.skipNewlines();

    const body: Statement[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    if (!this.check(TokenType.END)) {
      throw new ParserError("EACH 블록이 닫히지 않았습니다. 'END'가 필요합니다.", this.peek());
    }

    this.advance(); // END

    return createEachStmt(subject.lexeme, variable.lexeme, body, subject.line, subject.column);
  }

  private parseQuery(): Statement {
    const queryToken = this.advance(); // ? or ?name

    // 쿼리 패턴 생성
    const pattern: QueryPattern =
      queryToken.type === TokenType.QUESTION
        ? createWildcardPattern()
        : createVariablePattern(queryToken.value as string);

    // 관계 타입 (IS, HAS, CAN)
    if (!this.check(TokenType.IS) && !this.check(TokenType.HAS) && !this.check(TokenType.CAN)) {
      throw new ParserError(`쿼리에서 IS, HAS, CAN 중 하나가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
    }

    const relationToken = this.advance();
    const relation = relationToken.lexeme.toUpperCase();

    // 대상
    let target: string | null = null;
    let targetValue: unknown = null;

    if (this.check(TokenType.IDENTIFIER)) {
      target = this.advance().lexeme;

      // HAS의 경우 값도 있을 수 있음
      if (relation === 'HAS' && !this.checkEndOfQueryStatement()) {
        if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING) || this.check(TokenType.IDENTIFIER)) {
          targetValue = this.parseSimpleValue();
        }
      }
    }

    // WHERE 조건 확인
    let whereCondition: Expression | null = null;
    if (this.check(TokenType.WHERE)) {
      this.advance(); // WHERE
      whereCondition = this.parseQueryCondition();
    }

    return createQueryStmt(pattern, relation, target, targetValue, whereCondition, queryToken.line, queryToken.column);
  }

  private parseQueryCondition(): Expression {
    return this.parseComparison();
  }

  private checkEndOfQueryStatement(): boolean {
    return this.isAtEnd() || this.check(TokenType.NEWLINE) || this.check(TokenType.END) || this.check(TokenType.WHERE);
  }

  // Expression Parsing (Pratt Parser style)

  private parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let expr = this.parseAnd();

    while (this.check(TokenType.OR)) {
      this.advance();
      const right = this.parseAnd();
      expr = createBinaryExpr(expr, BinaryOperator.Or, right, expr.line, expr.column);
    }

    return expr;
  }

  private parseAnd(): Expression {
    let expr = this.parseComparison();

    while (this.check(TokenType.AND)) {
      this.advance();
      const right = this.parseComparison();
      expr = createBinaryExpr(expr, BinaryOperator.And, right, expr.line, expr.column);
    }

    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAdditive();

    while (
      this.check(TokenType.EQ) ||
      this.check(TokenType.NEQ) ||
      this.check(TokenType.LT) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.LTE) ||
      this.check(TokenType.GTE)
    ) {
      const opToken = this.advance();
      const op = this.getBinaryOperator(opToken.type);
      const right = this.parseAdditive();
      expr = createBinaryExpr(expr, op, right, expr.line, expr.column);
    }

    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const opToken = this.advance();
      const op = this.getBinaryOperator(opToken.type);
      const right = this.parseMultiplicative();
      expr = createBinaryExpr(expr, op, right, expr.line, expr.column);
    }

    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parseUnary();

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.MODULO)) {
      const opToken = this.advance();
      const op = this.getBinaryOperator(opToken.type);
      const right = this.parseUnary();
      expr = createBinaryExpr(expr, op, right, expr.line, expr.column);
    }

    return expr;
  }

  private parseUnary(): Expression {
    // NOT
    if (this.check(TokenType.NOT)) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return createUnaryExpr(UnaryOperator.Not, operand, opToken.line, opToken.column);
    }

    // -
    if (this.check(TokenType.MINUS)) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return createUnaryExpr(UnaryOperator.Negate, operand, opToken.line, opToken.column);
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check(TokenType.DOT)) {
        this.advance(); // '.'
        if (!this.check(TokenType.IDENTIFIER)) {
          throw new ParserError(`'.' 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
        }
        const property = this.advance();
        expr = createPropertyAccessExpr(expr, property.lexeme, expr.line, expr.column);
      } else if (this.check(TokenType.OF)) {
        // OF 표기법: HP OF Player
        if (expr.kind !== 'identifier') {
          throw new ParserError('OF 앞에는 속성 이름이 와야 합니다', this.peek());
        }

        this.advance(); // 'OF'

        const objExpr = this.parsePostfix();

        expr = createPropertyAccessExpr(objExpr, expr.name, expr.line, expr.column);
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    if (this.check(TokenType.NUMBER)) {
      this.advance();
      return createNumberExpr(token.value as number, token.line, token.column);
    }

    if (this.check(TokenType.STRING)) {
      this.advance();
      return createStringExpr(token.value as string, token.line, token.column);
    }

    if (this.check(TokenType.IDENTIFIER)) {
      this.advance();
      return createIdentifierExpr(token.lexeme, token.line, token.column);
    }

    // 쿼리 변수
    if (this.check(TokenType.QUERY_VAR)) {
      this.advance();
      const varName = token.value as string;
      return createIdentifierExpr(varName, token.line, token.column);
    }

    if (this.check(TokenType.LPAREN)) {
      this.advance(); // '('
      const inner = this.parseExpression();
      if (!this.check(TokenType.RPAREN)) {
        throw new ParserError(`')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }
      this.advance(); // ')'
      return createGroupingExpr(inner, token.line, token.column);
    }

    // RANDOM min max
    if (this.check(TokenType.RANDOM)) {
      this.advance(); // RANDOM

      // min 파싱
      let minExpr: Expression;
      if (this.check(TokenType.NUMBER)) {
        const numToken = this.advance();
        minExpr = createNumberExpr(numToken.value as number, numToken.line, numToken.column);
      } else if (this.check(TokenType.LPAREN)) {
        this.advance(); // '('
        minExpr = this.parseExpression();
        if (!this.check(TokenType.RPAREN)) {
          throw new ParserError(`')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
        }
        this.advance(); // ')'
      } else if (this.check(TokenType.IDENTIFIER)) {
        const idToken = this.advance();
        minExpr = createIdentifierExpr(idToken.lexeme, idToken.line, idToken.column);
        while (this.check(TokenType.DOT)) {
          this.advance(); // '.'
          if (!this.check(TokenType.IDENTIFIER)) {
            throw new ParserError(`'.' 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
          }
          const prop = this.advance();
          minExpr = createPropertyAccessExpr(minExpr, prop.lexeme, minExpr.line, minExpr.column);
        }
      } else {
        throw new ParserError(`RANDOM 뒤에 최소값이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }

      // max 파싱
      let maxExpr: Expression;
      if (this.check(TokenType.NUMBER)) {
        const numToken = this.advance();
        maxExpr = createNumberExpr(numToken.value as number, numToken.line, numToken.column);
      } else if (this.check(TokenType.LPAREN)) {
        this.advance(); // '('
        maxExpr = this.parseExpression();
        if (!this.check(TokenType.RPAREN)) {
          throw new ParserError(`')'가 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
        }
        this.advance(); // ')'
      } else if (this.check(TokenType.IDENTIFIER)) {
        const idToken = this.advance();
        maxExpr = createIdentifierExpr(idToken.lexeme, idToken.line, idToken.column);
        while (this.check(TokenType.DOT)) {
          this.advance(); // '.'
          if (!this.check(TokenType.IDENTIFIER)) {
            throw new ParserError(`'.' 뒤에 속성 이름이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
          }
          const prop = this.advance();
          maxExpr = createPropertyAccessExpr(maxExpr, prop.lexeme, maxExpr.line, maxExpr.column);
        }
      } else {
        throw new ParserError(`RANDOM 뒤에 최대값이 필요합니다. '${this.peek().lexeme}' 발견`, this.peek());
      }

      return createRandomExpr(minExpr, maxExpr, token.line, token.column);
    }

    throw new ParserError(`표현식이 필요합니다. '${token.lexeme}' 발견`, token);
  }

  private getBinaryOperator(type: TokenType): BinaryOperator {
    switch (type) {
      case TokenType.PLUS:
        return BinaryOperator.Add;
      case TokenType.MINUS:
        return BinaryOperator.Subtract;
      case TokenType.STAR:
        return BinaryOperator.Multiply;
      case TokenType.SLASH:
        return BinaryOperator.Divide;
      case TokenType.MODULO:
        return BinaryOperator.Modulo;
      case TokenType.EQ:
        return BinaryOperator.Equal;
      case TokenType.NEQ:
        return BinaryOperator.NotEqual;
      case TokenType.LT:
        return BinaryOperator.LessThan;
      case TokenType.GT:
        return BinaryOperator.GreaterThan;
      case TokenType.LTE:
        return BinaryOperator.LessEqual;
      case TokenType.GTE:
        return BinaryOperator.GreaterEqual;
      case TokenType.AND:
        return BinaryOperator.And;
      case TokenType.OR:
        return BinaryOperator.Or;
      default:
        throw new Error(`알 수 없는 연산자: ${type}`);
    }
  }

  private parseSimpleValue(): unknown {
    const token = this.peek();

    switch (token.type) {
      case TokenType.NUMBER:
        return this.advance().value;
      case TokenType.STRING:
        return this.advance().value;
      case TokenType.IDENTIFIER:
        return this.advance().lexeme;
      default:
        throw new ParserError(`값(숫자, 문자열, 식별자)이 필요합니다. '${token.lexeme}' 발견`, token);
    }
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private checkEndOfStatement(): boolean {
    return this.isAtEnd() || this.check(TokenType.NEWLINE) || this.check(TokenType.END) || this.check(TokenType.WHEN);
  }

  private checkRelation(): boolean {
    const type = this.peek().type;
    return (
      type === TokenType.IS ||
      type === TokenType.HAS ||
      type === TokenType.DO ||
      type === TokenType.PRINT ||
      type === TokenType.CAN ||
      type === TokenType.LOSES ||
      type === TokenType.EACH ||
      type === TokenType.WHEN ||
      type === TokenType.IDENTIFIER
    );
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}
