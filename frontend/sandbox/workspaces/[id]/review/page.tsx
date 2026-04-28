import { useRouter } from 'next/router';
import ReviewForm from '@/sandbox/components/ReviewForm';

export default function ReviewPage() {
  const router = useRouter();
  const { id: workspaceId } = router.query;

  // For demo purposes, using a fixed booking ID
  const bookingId = 'demo-booking-id';

  const handleSuccess = () => {
    console.log('Review submitted successfully');
    // In a real app, you might show a toast or redirect here
  };

  if (!workspaceId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Review Workspace</h1>
      <ReviewForm
        workspaceId={workspaceId as string}
        bookingId={bookingId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}