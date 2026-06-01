import QRCode from 'qrcode';
import { generateCheckInQRCode } from './qrcode.service';

jest.mock('qrcode');

const mockedToDataURL = QRCode.toDataURL as jest.MockedFunction<typeof QRCode.toDataURL>;

describe('generateCheckInQRCode', () => {
  const FAKE_DATA_URL = 'data:image/png;base64,abc123==';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedToDataURL.mockResolvedValue(FAKE_DATA_URL);
  });

  it('returns a Base64 PNG data URL', async () => {
    const result = await generateCheckInQRCode('ws-001', 'token-xyz');
    expect(result).toBe(FAKE_DATA_URL);
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('encodes workspaceId, token, and expiresAt in the QR payload', async () => {
    const before = Date.now();
    await generateCheckInQRCode('ws-001', 'token-xyz');
    const after = Date.now();

    const [payload] = (mockedToDataURL.mock.calls[0] as unknown[]) as [string, ...unknown[]];
    const parsed = JSON.parse(payload);

    expect(parsed.workspaceId).toBe('ws-001');
    expect(parsed.token).toBe('token-xyz');

    const expiresAt = new Date(parsed.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it('throws when workspaceId is empty', async () => {
    await expect(generateCheckInQRCode('', 'token-xyz')).rejects.toThrow(
      'workspaceId must not be empty',
    );
  });

  it('throws when sessionToken is empty', async () => {
    await expect(generateCheckInQRCode('ws-001', '')).rejects.toThrow(
      'sessionToken must not be empty',
    );
  });

  it('calls QRCode.toDataURL with png type option', async () => {
    await generateCheckInQRCode('ws-002', 'tok-abc');
    expect(mockedToDataURL).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'image/png' }),
    );
  });
});