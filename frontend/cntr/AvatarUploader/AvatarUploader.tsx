import React, { useRef, useState, useEffect } from 'react';

interface Props {
  currentAvatarUrl?: string;
  onFileSelect: (file: File) => void;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png'];

export const AvatarUploader: React.FC<Props> = ({ currentAvatarUrl, onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError('Only JPEG and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 2MB or smaller.');
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onFileSelect(file);
  }

  const src = preview ?? currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="Upload profile picture"
        onClick={() => inputRef.current?.click()}
        className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {src ? (
          <img src={src} alt="Avatar preview" className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500 text-2xl font-bold">
            ?
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleChange}
        data-testid="avatar-input"
      />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
};