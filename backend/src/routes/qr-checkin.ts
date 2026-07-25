import express from 'express';
import crypto from 'crypto';

const router = express.Router();

interface QRCheckInRequest {
  userId: string;
  timestamp: number;
  signature: string;
}

interface CheckInRecord {
  userId: string;
  checkInTime: Date;
  type: string;
}

const checkInRecords: CheckInRecord[] = [];
const secret = process.env.QR_SECRET || 'qr-secret-key';

function verifySignature(data: string, signature: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return computed === signature;
}

router.post('/scan', (req, res) => {
  try {
    const { userId, timestamp, signature }: QRCheckInRequest = req.body;

    if (!userId || !timestamp || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = `${userId}:${timestamp}`;
    if (!verifySignature(data, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const record: CheckInRecord = {
      userId,
      checkInTime: new Date(),
      type: 'qr-scan',
    };

    checkInRecords.push(record);
    res.json({ success: true, message: 'Checked in successfully', record });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = checkInRecords.filter(r => r.userId === userId);
  res.json({ userId, checkIns: history });
});

export default router;
