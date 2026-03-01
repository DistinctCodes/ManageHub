export default function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-5 inset-0  w-full fixed bg-black/70 z-[100]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      <p className="text-white">Loading...</p>
    </div>
  );
}
