import { DragEvent, useMemo, useRef, useState } from 'react';

interface ImageUploadDropzoneProps {
  label: string;
  onFileChange: (file: File) => void;
  initialPreview?: string;
}

export default function ImageUploadDropzone({ label, onFileChange, initialPreview }: ImageUploadDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialPreview);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    const imageFile = file.type.startsWith('image/') ? file : null;
    if (!imageFile) return;
    setPreviewUrl(URL.createObjectURL(imageFile));
    onFileChange(imageFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const handleChoose = () => {
    fileInputRef.current?.click();
  };

  const dragClasses = useMemo(
    () =>
      `rounded-3xl border-2 border-dashed p-6 text-center transition ${
        isDragging ? 'border-slate-700 bg-slate-100' : 'border-slate-300 bg-white/80'
      }`,
    [isDragging]
  );

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div
        className={dragClasses}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleChoose}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(event) => {
            if (event.target.files?.[0]) handleFile(event.target.files[0]);
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
          <span>{previewUrl ? 'Drop a new image or click to replace' : 'Drag & drop an image here'}</span>
          <button type="button" className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-sm">
            Choose image
          </button>
        </div>
        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-2">
            <img src={previewUrl} alt="Preview" className="mx-auto h-48 w-48 object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
