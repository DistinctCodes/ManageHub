import { HeatmapController } from './heatmap.controller';
import { HeatmapService } from './heatmap.service';
describe('HeatmapController', () => {
  let controller: HeatmapController;
  let service: jest.Mocked<HeatmapService>;
  beforeEach(() => {
    service = {
      getAll: jest.fn().mockReturnValue([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]),
      getByWorkspace: jest.fn().mockReturnValue([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]),
      getByTimeSlot: jest.fn().mockReturnValue([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]),
    } as any;
    controller = new HeatmapController(service);
  });
  it('should return all heatmap data', () => {
    expect(controller.getAll()).toEqual([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]);
  });
  it('should return data by workspace', () => {
    expect(controller.getByWorkspace('A')).toEqual([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]);
  });
  it('should return data by time slot', () => {
    expect(controller.getByTimeSlot('09:00-10:00')).toEqual([{ workspaceId: 'A', timeSlot: '09:00-10:00', usage: 50 }]);
  });
}); 