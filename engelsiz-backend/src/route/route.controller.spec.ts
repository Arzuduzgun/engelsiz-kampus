import { Test, TestingModule } from '@nestjs/testing';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';

describe('RouteController', () => {
  let controller: RouteController;

  const mockRouteService = {
    getNodes: jest.fn().mockResolvedValue([{ id: 'A', name: 'Mühendislik' }]),
    findRoute: jest.fn().mockResolvedValue({
      path: [{ id: 'A', name: 'Mühendislik' }],
      totalDistance: 0,
      accessible: true,
    }),
    addEdge: jest.fn().mockResolvedValue({ message: 'Yol Başarıyla Eklendi!' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: mockRouteService,
        },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});