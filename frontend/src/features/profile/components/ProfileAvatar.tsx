import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface ProfileAvatarProps {
  avatarUrl: string;
  onImageChange: (file: File) => void;
  onRemove: () => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ avatarUrl, onImageChange, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div className="relative group w-24 h-24">
      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg transition-transform group-hover:scale-[1.02]">
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
      >
        <Camera className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-400 border-2 border-[#0f1116] rounded-full flex items-center justify-center transition-colors"
        title="Remover foto"
      >
        <span className="text-[10px] text-white font-bold">×</span>
      </button>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
};
