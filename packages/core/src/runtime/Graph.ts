import { SongNode } from './Node.js';

/**
 * Song 언어의 그래프
 * 모든 노드들과 관계를 저장한다.
 */
export class Graph {
  private readonly nodes: Map<string, SongNode> = new Map();

  /**
   * 노드 가져오기 (없으면 생성)
   */
  getOrCreateNode(name: string): SongNode {
    let node = this.nodes.get(name);
    if (!node) {
      node = new SongNode(name);
      this.nodes.set(name, node);
    }
    return node;
  }

  /**
   * 노드 가져오기 (없으면 null)
   */
  getNode(name: string): SongNode | null {
    return this.nodes.get(name) ?? null;
  }

  /**
   * 노드 존재 여부 확인
   */
  hasNode(name: string): boolean {
    return this.nodes.has(name);
  }

  /**
   * 모든 노드들
   */
  get allNodes(): SongNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 개수
   */
  get count(): number {
    return this.nodes.size;
  }

  /**
   * 그래프 초기화
   */
  clear(): void {
    this.nodes.clear();
  }

  /**
   * 그래프를 문자열로 출력
   */
  toString(): string {
    return this.allNodes.map((n) => n.toString()).join('\n');
  }

  /**
   * 그래프 데이터를 직렬화 가능한 형태로 변환
   */
  toJSON(): GraphData {
    const nodes: NodeData[] = [];
    const edges: EdgeData[] = [];

    for (const node of this.allNodes) {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of node.properties) {
        // 내부 속성 및 노드 참조 제외
        if (!key.startsWith('_') && !(value instanceof SongNode)) {
          properties[key] = value;
        }
      }

      // 능력 목록 가져오기
      const abilitiesSet = node.properties.get('_Abilities') as Set<string> | undefined;
      const abilities = abilitiesSet ? Array.from(abilitiesSet) : [];

      nodes.push({
        id: node.name,
        name: node.name,
        properties,
        abilities,
      });

      // IS 관계 (부모)
      for (const parent of node.parents) {
        edges.push({
          source: node.name,
          target: parent.name,
          type: 'IS',
        });
      }
    }

    return { nodes, edges };
  }
}

export interface NodeData {
  id: string;
  name: string;
  properties: Record<string, unknown>;
  abilities: string[];
}

export interface EdgeData {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}
