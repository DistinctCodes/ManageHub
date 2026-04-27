"use client";
import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X } from "lucide-react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface UploadingFile {
  name: string;
  progress: number;
  error?: string;
}

interface WorkspaceImageManagerProps {
  images: string[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (url: string) => void;
}

export default function WorkspaceImageManager({ images, onUpload, onDelete }: WorkspaceImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  function validate(file: File): string | null {
    if (!ALLOWED.includes(file.type)) return "Only JPG, PNG, or WebP files are allowed.";
    if (file.size > MAX_SIZE) return "File must be under 5MB.";
    return null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const error = validate(file);
      if (error) {
        setUploading((u) => [...u, { name: file.name, progress: 0, error }]);
        continue;
      }
      setUploading((u) => [...u, { name: file.name, progress: 0 }]);
      // Simulate progress then call onUpload
      for (let p = 20; p <= 80; p += 20) {
        await new Promise((r) => setTimeout(r, 150));
        setUploading((u) => u.map((f) => f.name === file.name ? { ...f, progress: p } : f));
      }
      try {
        await onUpload(file);
        setUploading((u) => u.map((f) => f.name === file.name ? { ...f, progress: 100 } : f));
      } catch {
        setUploading((u) => u.map((f) => f.name === file.name ? { ...f, error: "Upload failed." } : f));
      }
      setTimeout(() => setUploading((u) => u.filter((f) => f.name !== file.name)), 1200);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
      >
        <UploadCloud className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-500">Drag & drop images here, or <span className="text-blue-600 font-medium">browse</span></p>
        <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5MB</p>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
      </div>

      {/* Upload progress */}
      {uploading.map((f) => (
        <div key={f.name} className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span className="truncate max-w-xs">{f.name}</span>
            {f.error ? <span className="text-red-500">{f.error}</span> : <span>{f.progress}%</span>}
          </div>
          {!f.error && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${f.progress}%` }} />
            </div>
          )}
        </div>
      ))}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onDelete(url)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
