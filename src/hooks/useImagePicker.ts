import { useState, useCallback, useRef } from 'react';

interface UseImagePickerReturn {
  selectedImage: File | null;
  imagePreview: string | null;
  pickImage: () => void;
  clearImage: () => void;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function useImagePicker(): UseImagePickerReturn {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickImage = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      clearImage();
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
      clearImage();
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`Imagem muito grande. Máximo: ${MAX_SIZE_MB}MB`);
      clearImage();
      return;
    }

    setError(null);
    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [clearImage]);

  // Attach the handler to the input ref
  if (inputRef.current && !inputRef.current.onchange) {
    inputRef.current.onchange = handleFileChange as any;
  }

  return {
    selectedImage,
    imagePreview,
    pickImage,
    clearImage,
    error,
    inputRef,
  };
}
