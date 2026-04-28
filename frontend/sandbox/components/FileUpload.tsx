"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onUploadComplete?: (urls: string[]) => void;
}

interface FileState {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "complete" | "error";
  error?: string;
  url?: string;
}

export default function FileUpload({ accept, maxSize, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) return file.name.endsWith(type);
        if (type.endsWith("/*")) return file.type.startsWith(type.replace("/*", ""));
        return file.type === type;
      });
      if (!isAccepted) return `Invalid file type. Expected: ${accept}`;
    }
    if (maxSize && file.size > maxSize) {
      return `File too large. Maximum size: ${formatSize(maxSize)}`;
    }
    return null;
  };

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;

    const incoming = Array.from(newFiles).map((file) => {
      const error = validateFile(file);
      return {
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: error ? ("error" as const) : ("idle" as const),
        error: error || undefined,
      };
    });

    setFiles((prev) => [...prev, ...incoming]);

    // Start uploading valid files
    for (const item of incoming) {
      if (item.status === "idle") {
        uploadFile(item.id, item.file);
      }
    }
  };

  const uploadFile = async (id: string, file: File) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f)));

    // Simulate upload progress
    for (let p = 10; p <= 100; p += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: p } : f)));
    }

    const dummyUrl = URL.createObjectURL(file);
    setFiles((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, status: "complete", url: dummyUrl } : f));
      
      // Trigger callback if all non-error files are finished
      const allFinished = updated.every((f) => f.status === "complete" || f.status === "error");
      if (allFinished && onUploadComplete) {
        const urls = updated.filter((f) => f.url).map((f) => f.url as string);
        onUploadComplete(urls);
      }
      return updated;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
          ${isDragging ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-gray-200 hover:border-gray-300 bg-gray-50/50"}`}
      >
        <input type="file" ref={inputRef} className="hidden" multiple accept={accept} onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
        <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100">
          <UploadCloud className={`w-6 h-6 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">{accept ? `${accept} files` : "Any file"} up to {maxSize ? formatSize(maxSize) : "Unlimited"}</p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-3">
          {files.map((item) => (
            <li key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${item.status === "error" ? "bg-red-50" : "bg-gray-50"}`}>
                    {item.status === "error" ? <AlertCircle className="w-4 h-4 text-red-500" /> : <FileText className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatSize(item.file.size)}</span>
                    </div>
                    {item.error ? (
                      <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                    ) : (
                      <div className="mt-2 w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{item.status}</span>
                          <span className="text-[10px] font-medium text-gray-500">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${item.status === "complete" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeFile(item.id); }} className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}