import { Test, TestingModule } from '@nestjs/testing';
import { RouteService, NodeItem, EdgeItem } from './route.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('RouteService', () => {
  let service: RouteService;

  const mockNodes: NodeItem[] = [
    { id: 'A', name: 'Mühendislik Fakültesi' },
    { id: 'B', name: 'Kütüphane' },
    { id: 'C', name: 'Yemekhane' },
  ];

  const mockEdges: EdgeItem[] = [
    { start_node_id: 'A', end_node_id: 'C', distance: 50, is_accessible: false },
    { start_node_id: 'A', end_node_id: 'B', distance: 100, is_accessible: true },
    { start_node_id: 'B', end_node_id: 'C', distance: 120, is_accessible: true },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('engelsiz modda (accessible=true) merdivenli kısa yolu eleyip rampalı yolu seçmeli', () => {
    const result = service.calculateDijkstra(mockNodes, mockEdges, 'A', 'C', true);
    expect(result).not.toBeNull();
    expect(result?.path.map((p) => p.id)).toEqual(['A', 'B', 'C']);
    expect(result?.totalDistance).toBe(220);
  });

  it('normal modda (accessible=false) en kısa yolu seçmeli', () => {
    const result = service.calculateDijkstra(mockNodes, mockEdges, 'A', 'C', false);
    expect(result).not.toBeNull();
    expect(result?.path.map((p) => p.id)).toEqual(['A', 'C']);
    expect(result?.totalDistance).toBe(50);
  });
});