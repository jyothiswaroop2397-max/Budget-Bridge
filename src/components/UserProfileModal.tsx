import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Camera,
  Trash2,
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { getDefaultAvatar, sanitizeAvatarUrl } from '../utils/avatar.js';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
}) => {
  const { theme } = useTheme();
  const initialName = (!userProfile.name || userProfile.name === 'Maverick Vinales' || userProfile.name === 'Guest Account') ? 'Guest' : userProfile.name;
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(
    sanitizeAvatarUrl(userProfile.avatarUrl, initialName)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile when opened or changed
  useEffect(() => {
    if (isOpen) {
      const cleanName = (!userProfile.name || userProfile.name === 'Maverick Vinales' || userProfile.name === 'Guest Account') ? 'Guest' : userProfile.name;
      setName(cleanName);
      setAvatarUrl(sanitizeAvatarUrl(userProfile.avatarUrl, cleanName));
      setUploadError(null);
      setIsDragging(false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image size exceeds 3MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setAvatarUrl(e.target.result);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Guest';
    const finalAvatar = avatarUrl.trim() || getDefaultAvatar(finalName);
    onSaveProfile({
      name: finalName,
      avatarUrl: sanitizeAvatarUrl(finalAvatar, finalName),
    });
    onClose();
  };

  const isCustomUploaded = avatarUrl && !avatarUrl.startsWith('data:image/svg+xml');

  return (
    <div
      id="user-profile-modal-backdrop"
      style={{ zIndex: 1000 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="user-profile-modal-dialog"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md border rounded-[28px] shadow-2xl p-5 sm:p-6 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${theme.isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Camera className={`w-5 h-5 ${theme.accentText}`} />
            <h2 className={`text-base font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Edit Profile
            </h2>
          </div>
          <button
            id="close-user-profile-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview with Circular Border Styling */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div className="relative group">
            {/* Outer theme ring */}
            <div
              id="modal-avatar-preview"
              style={{ borderColor: theme.accentColor }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-amber-400/50 bg-slate-800 shrink-0 shadow-xl transition-all flex items-center justify-center"
            >
              <img
                src={avatarUrl || getDefaultAvatar(name)}
                alt="Profile Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = getDefaultAvatar(name);
                }}
              />
              <div
                style={{
                  background: `linear-gradient(to top right, ${theme.accentColor}22, transparent)`,
                }}
                className="absolute inset-0 pointer-events-none"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute bottom-0 right-0 p-2 rounded-full ${theme.accentBtnBg} ${theme.accentBtnText} shadow-md hover:scale-110 active:scale-95 transition-all border-2 ${theme.isDark ? 'border-[#090D16]' : 'border-white'}`}
              title="Upload photo from device"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-center">
            <p className={`text-sm font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>{name || 'Guest'}</p>
            <p className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Profile Avatar</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Display Name Input */}
          <div className="space-y-1">
            <label className={`text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                // If avatar is the default SVG, update initials dynamically
                if (!isCustomUploaded) {
                  setAvatarUrl(getDefaultAvatar(newName));
                }
              }}
              placeholder="e.g., Guest"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-amber-400 shadow-xs ${
                theme.isDark ? 'bg-[#090D16] border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Picture Upload Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                Upload Profile Picture
              </label>
              {isCustomUploaded && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(getDefaultAvatar(name))}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : theme.isDark
                  ? 'border-slate-800 hover:border-slate-700 bg-[#090D16]/60'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/80'
              }`}
            >
              <ImageIcon className={`w-6 h-6 mb-1.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-xs font-medium ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Click to browse or drag and drop your photo
              </p>
              <p className={`text-[10px] mt-0.5 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                PNG, JPG, JPEG, WEBP up to 3MB
              </p>
            </div>

            {uploadError && (
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">{uploadError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setName('Guest');
                setAvatarUrl(getDefaultAvatar('Guest'));
                setUploadError(null);
              }}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                theme.isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Reset name and avatar to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${
                theme.isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl ${theme.accentBtnBg} ${theme.accentBtnText} text-xs font-bold transition-all shadow-sm ${theme.accentShadow} hover:brightness-105`}
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
