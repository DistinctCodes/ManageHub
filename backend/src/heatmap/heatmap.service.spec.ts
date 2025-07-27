import { HeatmapService } from './heatmap.service';
describe('HeatmapService', () => {
  let service: HeatmapService;
  beforeEach(() => {
    service = new HeatmapService();
  });
  it('should generate mock data for all workspaces and time slots', () => {
    const all = service.getAll();
    expect(all.length).toBe(4 * 8); // 4 workspaces * 8 time slots
  });
  it('should filter by workspace', () => {
    const ws = service.getByWorkspace('A');
    expect(ws.every(slot => slot.workspaceId === 'A')).toBe(true);
    expect(ws.length).toBe(8);
  });
  it('should filter by time slot', () => {
    const ts = service.getByTimeSlot('09:00-10:00');
    expect(ts.every(slot => slot.timeSlot === '09:00-10:00')).toBe(true);
    expect(ts.length).toBe(4);
  });
}); 