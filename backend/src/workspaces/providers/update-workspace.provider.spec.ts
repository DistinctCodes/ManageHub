import { UpdateWorkspaceProvider } from './update-workspace.provider';

describe('UpdateWorkspaceProvider.adjustAvailableSeats', () => {
  let findWorkspaceByIdProvider: { findById: jest.Mock };
  let workspacesRepository: { save: jest.Mock };
  let provider: UpdateWorkspaceProvider;

  const workspace = (overrides: Partial<any> = {}) => ({
    id: 'ws-1',
    totalSeats: 10,
    availableSeats: 5,
    ...overrides,
  });

  beforeEach(() => {
    findWorkspaceByIdProvider = { findById: jest.fn() };
    workspacesRepository = { save: jest.fn((w) => w) };
    provider = new UpdateWorkspaceProvider(
      workspacesRepository as any,
      findWorkspaceByIdProvider as any,
    );
  });

  it('decrements availableSeats by a negative delta', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());

    await provider.adjustAvailableSeats('ws-1', -3);

    expect(workspacesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSeats: 2 }),
    );
  });

  it('increments availableSeats by a positive delta', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());

    await provider.adjustAvailableSeats('ws-1', 3);

    expect(workspacesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSeats: 8 }),
    );
  });

  it('clamps at 0 when the delta would go negative', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(
      workspace({ availableSeats: 1 }),
    );

    await provider.adjustAvailableSeats('ws-1', -5);

    expect(workspacesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSeats: 0 }),
    );
  });

  it('clamps at totalSeats when the delta would exceed capacity', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(
      workspace({ availableSeats: 9, totalSeats: 10 }),
    );

    await provider.adjustAvailableSeats('ws-1', 5);

    expect(workspacesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSeats: 10 }),
    );
  });
});
