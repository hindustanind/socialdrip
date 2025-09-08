// FIX: Updated Supabase client import path.
import { supabase } from '../lib/supa';
import { User } from '../types';

// Helper for dev-only logging
const log = (op: string, payload?: any, err?: any) => {
  if (process.env.NODE_ENV === 'production') return;
  const errorPayload = err ? { code: err.code, msg: err.message } : null;
  console.info(`%c[profileSvc] %c${op}`, 'color: #f400f4; font-weight: bold;', 'color: inherit;', payload || '', errorPayload || '');
};

/** Fetches the full user profile for the currently authenticated user. */
export async function fetchMyProfile(): Promise<User | null> {
    const { data: { user: authUser } } = await (supabase.auth as any).getUser();
    if (!authUser) return null;

    log('fetchMyProfile', { userId: authUser.id });
    const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path, style_signature')
        .eq('id', authUser.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        log('fetchMyProfile FAILED', { userId: authUser.id }, error);
        throw error;
    }

    // Sync from auth if profile is missing (first login)
    if (!profileData) {
        return syncFromAuth(authUser);
    }
    
    const avatarUrl = profileData.avatar_path ? getAvatarUrl(profileData.avatar_path) : null;
    
    return {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.display_name,
        profilePicture: avatarUrl,
        styleSignature: profileData.style_signature,
    };
}

/** 
 * Creates a profile entry based on auth data. 
 * This is typically for the very first time a user logs in.
 */
export async function syncFromAuth(authUser: any): Promise<User> {
    log('syncFromAuth', { authUser });
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', authUser.id)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // If profile exists, we don't need to sync. This is a safeguard.
    if (data) {
        log('syncFromAuth SKIPPED', { reason: 'Profile already exists' });
        const profile = await fetchMyProfile();
        if (!profile) throw new Error("Profile disappeared after sync check");
        return profile;
    }
    
    const newProfile = {
        id: authUser.id,
        username: authUser.user_metadata?.username || authUser.email.split('@')[0],
        display_name: authUser.user_metadata?.username || authUser.email.split('@')[0],
    };
    
    await upsertMyProfile(newProfile);

    return {
        id: newProfile.id,
        username: newProfile.username,
        displayName: newProfile.display_name,
        profilePicture: null,
        styleSignature: null,
    };
}

/** Updates the profile for the currently authenticated user. */
export async function upsertMyProfile(updates: Partial<{ display_name: string; style_signature: string; avatar_path: string; username: string; }>) {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated for profile update.');

    const payload = {
        ...updates,
        id: user.id,
        updated_at: new Date().toISOString(),
    };
    log('upsertMyProfile', payload);
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
        log('upsertMyProfile FAILED', payload, error);
        throw error;
    }
}

/** Uploads an avatar file and updates the user's profile with the path. */
export async function uploadAvatar(file: File): Promise<{ path: string }> {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated for avatar upload.');
    
    const fileExt = file.name.split('.').pop();
    const path = `${user.id}/avatar.${fileExt}`;

    log('uploadAvatar:upload', { path });
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, // Overwrite existing avatar
    });

    if (uploadError) {
        log('uploadAvatar:upload FAILED', { path }, uploadError);
        throw uploadError;
    }

    await upsertMyProfile({ avatar_path: path });
    return { path };
}

/** Gets the public URL for an avatar from its storage path. */
export function getAvatarUrl(path: string): string | null {
    if (!path) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    log('getAvatarURL', { path, publicUrl: data.publicUrl });
    return data.publicUrl;
}
