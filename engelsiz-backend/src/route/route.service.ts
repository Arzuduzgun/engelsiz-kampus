import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface NodeItem {
  id: string;
  name: string;
}

export interface EdgeItem {
  id?: number;
  start_node_id: string;
  end_node_id: string;
  distance: number;
  is_accessible: boolean;
}

export interface CreateEdgeDto {
  start_node_id: string;
  end_node_id: string;
  distance: number;
  is_accessible: boolean;
}

@Injectable()
export class RouteService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getNodes(): Promise<NodeItem[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('nodes')
      .select('id, name')
      .order('id', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data ?? [];
  }

  async addEdge(dto: CreateEdgeDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('edges')
      .insert([
        {
          start_node_id: dto.start_node_id,
          end_node_id: dto.end_node_id,
          distance: Number(dto.distance),
          is_accessible: Boolean(dto.is_accessible),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return { message: 'Yol Başarıyla Eklendi!', edge: data };
  }

  async findRoute(from: string, to: string, accessible: boolean) {
    const client = this.supabaseService.getClient();

    const [{ data: nodes, error: nodesErr }, { data: edges, error: edgesErr }] =
      await Promise.all([
        client.from('nodes').select('id, name'),
        client.from('edges').select('start_node_id, end_node_id, distance, is_accessible'),
      ]);

    if (nodesErr || edgesErr) {
      throw new InternalServerErrorException('Veritabanı verileri alınamadı.');
    }

    const result = this.calculateDijkstra(
      nodes ?? [],
      edges ?? [],
      from,
      to,
      accessible,
    );

    if (!result) {
      throw new NotFoundException('Belirtilen iki nokta arasında uygun bir rota bulunamadı.');
    }

    return result;
  }

  // Test edilebilir saf (pure) Dijkstra metodu
  calculateDijkstra(
    nodes: NodeItem[],
    edges: EdgeItem[],
    from: string,
    to: string,
    accessible: boolean,
  ) {
    const nodeMap = new Map<string, string>();
    nodes.forEach((n) => nodeMap.set(n.id, n.name));

    if (!nodeMap.has(from) || !nodeMap.has(to)) {
      return null;
    }

    const graph = new Map<string, { node: string; weight: number }[]>();
    nodes.forEach((n) => graph.set(n.id, []));

    for (const edge of edges) {
      // Modifiye Dijkstra: Engelsiz rota isteniyorsa ve yol erişilebilir değilse maliyet Sonsuz
      const weight =
        accessible && !edge.is_accessible ? Infinity : Number(edge.distance);

      if (weight === Infinity) continue;

      graph.get(edge.start_node_id)?.push({ node: edge.end_node_id, weight });
      graph.get(edge.end_node_id)?.push({ node: edge.start_node_id, weight });
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    nodes.forEach((n) => {
      distances.set(n.id, Infinity);
      previous.set(n.id, null);
      unvisited.add(n.id);
    });
    distances.set(from, 0);

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDist = Infinity;

      for (const nodeId of unvisited) {
        const d = distances.get(nodeId)!;
        if (d < minDist) {
          minDist = d;
          current = nodeId;
        }
      }

      if (current === null || current === to) break;
      unvisited.delete(current);

      const neighbors = graph.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.node)) continue;
        const alt = minDist + neighbor.weight;
        if (alt < distances.get(neighbor.node)!) {
          distances.set(neighbor.node, alt);
          previous.set(neighbor.node, current);
        }
      }
    }

    const totalDistance = distances.get(to)!;
    if (totalDistance === Infinity) {
      return null;
    }

    const pathIds: string[] = [];
    let curr: string | null = to;
    while (curr) {
      pathIds.unshift(curr);
      curr = previous.get(curr) ?? null;
    }

    return {
      path: pathIds.map((id) => ({ id, name: nodeMap.get(id) ?? id })),
      totalDistance,
      accessible,
    };
  }
}