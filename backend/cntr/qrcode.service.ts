import QRCode from 'qrcode';

export async function generateCheckInQRCode(
  workspaceId: string,
  sessionToken: string,
): Promise<string> {
  if (!workspaceId) {
    throw new Error('workspaceId must not be empty');
  }
  if (!sessionToken) {
    throw new Error('sessionToken must not be empty');
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const payload = JSON.stringify({ workspaceId, token: sessionToken, expiresAt });

  const dataUrl = await QRCode.toDataURL(payload, { type: 'image/png' });

  return dataUrl;
}