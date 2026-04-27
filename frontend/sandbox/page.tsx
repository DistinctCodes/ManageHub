import { LazyImage } from "./components/LazyImage";

const images = [
  { src: "https://picsum.photos/seed/a/600/400", alt: "Office space A" },
  { src: "https://picsum.photos/seed/b/600/400", alt: "Office space B" },
  { src: "https://picsum.photos/seed/c/600/400", alt: "Office space C" },
  { src: "https://picsum.photos/seed/d/600/400", alt: "Office space D" },
  { src: "https://picsum.photos/seed/e/600/400", alt: "Office space E" },
  { src: "https://picsum.photos/seed/f/600/400", alt: "Office space F" },
];

export default function SandboxPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">LazyImage Demo</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img) => (
          <LazyImage key={img.src} src={img.src} alt={img.alt} width={600} height={400} />
        ))}
      </div>
    </main>
  );
}
