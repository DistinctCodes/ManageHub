export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-[#f8fafc]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-gray-900 font-semibold text-lg">Confirming...</div>
        <p className="text-gray-600 text-sm mt-2">Please wait a moment.</p>
      </div>
    </div>
  );
}
