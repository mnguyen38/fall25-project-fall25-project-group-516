import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import ImageCropper from '../imageCropper';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  currentImageUrl?: string;
  aspectRatio?: 'square' | 'banner';
  label: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  currentImageUrl,
  aspectRatio = 'square',
  label,
}) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentImageUrl) {
      setPreview(currentImageUrl);
    }
  }, [currentImageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);

    onUpload(croppedFile);
    setShowCropper(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const cropAspectRatio = aspectRatio === 'square' ? 1 : 1200 / 300;

  return (
    <>
      <div className='image-upload'>
        <label className='image-upload-label'>{label}</label>
        <div className={`image-preview ${aspectRatio}`}>
          {preview ? (
            <img src={preview} alt='Preview' className='preview-image' />
          ) : (
            <div className='no-image-placeholder'>
              <p>No image uploaded</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button type='button' className='button button-secondary' onClick={handleClick}>
          {preview ? 'Change Image' : 'Upload Image'}
        </button>
      </div>
      {showCropper && imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropAspectRatio}
        />
      )}
    </>
  );
};

export default ImageUpload;
