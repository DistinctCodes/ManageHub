// Placeholder for notification logic. Replace with real email/SMS integration as needed.
export async function sendBookingNotification(email: string, message: string) {
  // In production, integrate with nodemailer, SendGrid, etc.
  // For now, just log to console.
  console.log(`Notification to ${email}: ${message}`);
  return true;
}
