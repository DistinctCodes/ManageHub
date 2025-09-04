import { EquipmentQueueService } from './equipment-queue.service';

describe('EquipmentQueueService', () => {
  let service: EquipmentQueueService;
  const equipment = 'VR Headset';
  const userA = 'userA';
  const userB = 'userB';
  const userC = 'userC';

  beforeEach(() => {
    service = new EquipmentQueueService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow a user to join the queue and return correct position', () => {
    const pos = service.joinQueue(equipment, userA);
    expect(pos).toBe(1);
    expect(service.getPosition(equipment, userA)).toBe(1);
  });

  it('should not allow duplicate joins for the same user', () => {
    service.joinQueue(equipment, userA);
    const pos = service.joinQueue(equipment, userA);
    expect(pos).toBe(1);
    expect(service.getQueue(equipment).length).toBe(1);
  });

  it('should return 0 for position if user is not in queue', () => {
    expect(service.getPosition(equipment, userB)).toBe(0);
  });

  it('should return correct queue positions for multiple users', () => {
    service.joinQueue(equipment, userA);
    service.joinQueue(equipment, userB);
    service.joinQueue(equipment, userC);
    expect(service.getPosition(equipment, userA)).toBe(1);
    expect(service.getPosition(equipment, userB)).toBe(2);
    expect(service.getPosition(equipment, userC)).toBe(3);
  });

  it('should return correct estimated wait time', () => {
    service.joinQueue(equipment, userA);
    service.joinQueue(equipment, userB);
    expect(service.getEstimatedWait(equipment, userA)).toBe(0);
    expect(service.getEstimatedWait(equipment, userB)).toBe(30);
  });

  it('should return 0 estimated wait if user is not in queue', () => {
    expect(service.getEstimatedWait(equipment, userC)).toBe(0);
  });

  it('should maintain separate queues for different equipment', () => {
    const eq2 = 'Camera';
    service.joinQueue(equipment, userA);
    service.joinQueue(eq2, userB);
    expect(service.getPosition(equipment, userA)).toBe(1);
    expect(service.getPosition(eq2, userB)).toBe(1);
    expect(service.getPosition(equipment, userB)).toBe(0);
  });

  it('should return the full queue for an equipment', () => {
    service.joinQueue(equipment, userA);
    service.joinQueue(equipment, userB);
    const queue = service.getQueue(equipment);
    expect(queue.length).toBe(2);
    expect(queue[0].userId).toBe(userA);
    expect(queue[1].userId).toBe(userB);
  });
});
