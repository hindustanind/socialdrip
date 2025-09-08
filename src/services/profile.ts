import { supabase } from './supabaseClient';
import { logProfile } from '../dev/profileLog';

// Simple slugify function for filenames
const slugify = (text: string) => {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
  
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with 'and'
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of text
}


/**
 * Fetches a user's profile from the database.
 * Returns the raw profile row.
 */
export const getProfile = async (userId: string) => {
    logProfile('getProfile', { userId });
    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, display_name, avatar_path, style_signature, updated_at`)
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        logProfile('getProfile FAILED', { userId }, error);
        throw error;
    }
    
    return data;
};

/**
 * Updates a user's profile with partial data.
 */
export const upsertProfile = async (partial: { display_name?: string | null; avatar_path?: string | null; style_signature?: string | null; }) => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated for profile update.');

    const updates = {
        ...partial,
        id: user.id,
        updated_at: new Date().toISOString(),
    };

    logProfile('upsertProfile', updates);
    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
        logProfile('upsertProfile FAILED', updates, error);
        throw new Error(`Failed to update profile: ${error.message}`);
    }
};

/**
 * Uploads an avatar file to Supabase Storage and updates the user's profile.
 */
export const uploadAvatar = async (file: File) => {
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated for avatar upload.');
    
    const fileExt = file.name.split('.').pop();
    const slugName = slugify(file.name.replace(`.${fileExt}`, ''));
    const path = `${user.id}/${Date.now()}_${slugName}.${fileExt}`;

    logProfile('uploadAvatar:upload', { path });
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        contentType: file.type,
        upsert: false, // Don't upsert, always create new to avoid caching issues
    });

    if (uploadError) {
        logProfile('uploadAvatar:upload FAILED', { path }, uploadError);
        throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    await upsertProfile({ avatar_path: path });
    return { path };
};

/**
 * Gets the public URL for an avatar from its storage path.
 */
export const getAvatarURL = (path: string): string | null => {
    if (!path) return null;
    // Assuming public bucket as per user's SQL and instructions
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    logProfile('getAvatarURL', { path, publicUrl: data.publicUrl });
    return data.publicUrl;
};
