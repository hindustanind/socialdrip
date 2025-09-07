import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import ProfileHeader from './ProfileHeader';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../shared/Spinner';

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface ProfilePageProps {
  viewedUserId: string | null;
  onNavigate: (page: Page, userId?: string | null) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ viewedUserId, onNavigate }) => {
  const { user: currentUser, updateProfile } = useAuth();
  const [viewedUser, setViewedUser] = useState<User | null>(null);

  useEffect(() => {
    // In this simplified version, we only support viewing the current user's profile.
    // A full implementation would fetch other user profiles from Supabase.
    if (!viewedUserId || viewedUserId === currentUser?.id) {
        setViewedUser(currentUser);
    } else {
        // Placeholder for fetching other users
        setViewedUser(null); 
    }
  }, [viewedUserId, currentUser]);

  const isOwnProfile = !viewedUserId || viewedUserId === currentUser?.id;
  
  if (!viewedUser) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
            <Spinner text="Loading Profile..." />
        </div>
      );
  }

  return (
    <div className="container mx-auto max-w-7xl page-transition-enter space-y-8">
      <div>
        <ProfileHeader
          user={viewedUser}
          onUpdateUser={updateProfile}
          isOwnProfile={isOwnProfile}
        />
      </div>
       <div className="text-center py-10">
        <p className="text-gray-500">Your showcase and closet have been simplified in this version.</p>
      </div>
    </div>
  );
};

export default ProfilePage;