import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RouteService, type CreateEdgeDto } from './route.service';

@Controller('route')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('nodes')
  getNodes() {
    return this.routeService.getNodes();
  }

  @Post('edge')
  addEdge(@Body() dto: CreateEdgeDto) {
    return this.routeService.addEdge(dto);
  }

  @Get()
  getRoute(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('accessible') accessible?: string,
  ) {
    const isAccessible = accessible === 'true';
    return this.routeService.findRoute(from, to, isAccessible);
  }
}