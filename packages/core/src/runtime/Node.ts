/**
 * Song 언어의 노드
 * 노드는 관계의 집합이다. 이름과 속성들을 가진다.
 */
export class SongNode {
  readonly name: string;

  /**
   * IS 관계로 연결된 부모 노드들 (프로토타입 체인)
   */
  readonly parents: SongNode[] = [];

  /**
   * HAS 관계로 연결된 속성들 (Property -> Value)
   */
  readonly properties: Map<string, unknown> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 속성 값 가져오기 (프로토타입 체인 탐색)
   */
  getProperty(name: string): unknown {
    // 자신의 속성 먼저 확인
    if (this.properties.has(name)) {
      return this.properties.get(name);
    }

    // 부모 노드들에서 찾기 (프로토타입 상속)
    for (const parent of this.parents) {
      const parentValue = parent.getProperty(name);
      if (parentValue !== null && parentValue !== undefined) {
        return parentValue;
      }
    }

    return null;
  }

  /**
   * 속성 값 설정하기
   */
  setProperty(name: string, value: unknown): void {
    this.properties.set(name, value);
  }

  /**
   * 부모 노드 추가 (IS 관계)
   */
  addParent(parent: SongNode): void {
    if (!this.parents.includes(parent)) {
      this.parents.push(parent);
    }
  }

  /**
   * 부모 노드 제거 (LOSES IS)
   */
  removeParent(parent: SongNode): void {
    const index = this.parents.indexOf(parent);
    if (index !== -1) {
      this.parents.splice(index, 1);
    }
  }

  /**
   * 자신의 속성인지 확인 (상속 제외)
   */
  hasOwnProperty(name: string): boolean {
    return this.properties.has(name);
  }

  /**
   * 속성 제거
   */
  removeProperty(name: string): void {
    this.properties.delete(name);
  }

  /**
   * 특정 타입인지 확인 (IS 관계 체인 탐색)
   */
  is(typeName: string): boolean {
    if (this.name === typeName) return true;

    for (const parent of this.parents) {
      if (parent.is(typeName)) {
        return true;
      }
    }

    return false;
  }

  toString(): string {
    const propsArr: string[] = [];
    for (const [key, value] of this.properties) {
      const val = typeof value === 'string' ? `"${value}"` : String(value);
      propsArr.push(`${key}=${val}`);
    }
    const props = propsArr.join(', ');

    const parentsStr =
      this.parents.length > 0 ? ` IS ${this.parents.map((p) => p.name).join(', ')}` : '';

    return `Node(${this.name}${parentsStr}) { ${props} }`;
  }
}
