import React, { useRef, useState } from 'react';
import { User } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { fileToBase64 } from '../../utils';

interface ProfileHeaderProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => Promise<void>;
  isOwnProfile: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, onUpdateUser, isOwnProfile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newSignature, setNewSignature] = useState(user.styleSignature || '');

  const handlePictureClick = () => {
    if (!isOwnProfile) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert('Image is too large. Please select an image under 2MB.');
          return;
      }
      try {
        const base64 = await fileToBase64(file);
        // Supabase storage not implemented, so we save base64 for now.
        // A full implementation would upload to storage and save the URL.
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        await onUpdateUser({ profilePicture: dataUrl });
      } catch (err) {
        console.error("Failed to convert file to base64", err);
      }
    }
  };

  const handleSaveSignature = async () => {
    await onUpdateUser({ styleSignature: newSignature });
    setIsEditing(false);
  };
  
  const isUrl = user.profilePicture?.startsWith('http') || user.profilePicture?.startsWith('data:');

  return (
    <>
      <div className="flex flex-col md:flex-row items-center gap-8 bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10 shadow-2xl shadow-[#00f2ff]/10">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          <button 
            className={`relative w-36 h-36 rounded-full group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a0a37] focus:ring-[#00f2ff] ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={handlePictureClick}
            aria-label="Change profile picture"
            disabled={!isOwnProfile}
          >
            {user.profilePicture ? (
              <img 
                src={isUrl ? user.profilePicture : `data:image/jpeg;base64,${user.profilePicture}`} 
                alt="Profile" 
                className={`w-full h-full object-cover rounded-full border-4 border-transparent transition-all ${isOwnProfile ? 'group-hover:border-[#00f2ff]' : ''}`} 
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-white/10 flex items-center justify-center border-4 border-dashed border-gray-500 transition-all ${isOwnProfile ? 'group-hover:border-[#00f2ff]' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 group-hover:text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {isOwnProfile && (
              <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-white text-sm">
                  Change
              </div>
            )}
          </button>
          {isOwnProfile && <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg"/>}
        </div>

        {/* Profile Info */}
        <div className="flex-grow text-center md:text-left">
          <h1 className="text-3xl font-bold">{user.displayName}</h1>
          <p className="text-gray-400">@{user.username}</p>
          <p className="text-gray-300 italic mt-4">"{user.styleSignature}"</p>
          {isOwnProfile && <Button onClick={() => setIsEditing(true)} variant="secondary" className="mt-4 px-4 py-1 text-sm">Edit Profile</Button>}
        </div>
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Your Style Signature">
        <div className="p-4 flex flex-col gap-4">
          <textarea
            value={newSignature}
            onChange={(e) => setNewSignature(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all min-h-[100px]"
            placeholder="Describe your style..."
            maxLength={150}
          />
          <div className="flex justify-end gap-4">
            <Button onClick={() => setIsEditing(false)} variant="secondary">Cancel</Button>
            <Button onClick={handleSaveSignature}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProfileHeader;