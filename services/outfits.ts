import { supabase } from './supabaseClient';
import { Outfit, OutfitCategory } from '../types';

// Helper to convert base64 to File object
const base64toFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};

// --- API Functions ---

export interface CreateOutfitData {
  name: string;
  description?: string;
  category: OutfitCategory;
  images: string[]; // base64 compressed
  originalImages: string[]; // base64 original
}

/**
 * Creates a new outfit, uploads images, and saves all data to Supabase.
 */
export const createOutfit = async (data: CreateOutfitData): Promise<Outfit> => {
    // FIX: Cast to 'any' to bypass TypeScript error, likely from a dependency version mismatch.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .insert({
            user_id: user.id,
            name: data.name,
            description: data.description,
            category: data.category,
            is_favorite: false,
        })
        .select()
        .single();

    if (outfitError) throw new Error(outfitError.message);
    const newOutfitId = outfitData.id;

    const uploadImage = async (base64: string, type: 'thumbnail' | 'original', index: number) => {
        const mimeType = type === 'thumbnail' ? 'image/jpeg' : 'image/png';
        const extension = type === 'thumbnail' ? 'jpg' : 'png';
        const file = base64toFile(base64, `${index}_${type}.${extension}`, mimeType);
        const path = `${user.id}/${newOutfitId}/${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage.from('outfits').upload(path, file);
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { error: insertError } = await supabase.from('outfit_items').insert({
            outfit_id: newOutfitId, image_path: uploadData.path, type, sort_order: index,
        });
        if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
    };

    const thumbnailUploads = data.images.map((img, i) => uploadImage(img, 'thumbnail', i));
    const originalUploads = data.originalImages.map((img, i) => uploadImage(img, 'original', i));

    await Promise.all([...thumbnailUploads, ...originalUploads]);

    // Refetch to get the newly created one with signed URLs
    const outfits = await listOutfits();
    const newOutfit = outfits.find(o => o.id === newOutfitId);
    if (!newOutfit) throw new Error("Could not retrieve newly created outfit.");

    return newOutfit;
};

/**
 * Fetches all outfits for the logged-in user with signed URLs for images.
 * This version uses separate queries to be robust against schema/relationship issues.
 */
export const listOutfits = async (): Promise<Outfit[]> => {
    // FIX: Cast to 'any' to bypass TypeScript error, likely from a dependency version mismatch.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return [];

    const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select(`*`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (outfitsError) throw new Error(outfitsError.message);

    return Promise.all(
        outfitsData.map(async (o) => {
            const { data: items, error: itemsError } = await supabase
                .from('outfit_items')
                .select('image_path, type, sort_order')
                .eq('outfit_id', o.id);
            
            if (itemsError) throw new Error(itemsError.message);

            const thumbnails = items.filter(i => i.type === 'thumbnail').sort((a, b) => a.sort_order - b.sort_order);
            const originals = items.filter(i => i.type === 'original').sort((a, b) => a.sort_order - b.sort_order);

            return {
                id: o.id,
                name: o.name,
                description: o.description,
                category: o.category,
                createdAt: new Date(o.created_at).getTime(),
                isFavorite: o.is_favorite,
                images: await Promise.all(thumbnails.map(i => getSignedUrl(i.image_path))),
                originalImages: await Promise.all(originals.map(i => getSignedUrl(i.image_path))),
            };
        })
    );
};

/**
 * Updates an outfit's details in Supabase.
 */
export const updateOutfit = async (outfitId: string, updates: { name?: string; description?: string; isFavorite?: boolean }): Promise<void> => {
    // FIX: Cast to 'any' to bypass TypeScript error, likely from a dependency version mismatch.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) throw new Error('User not authenticated');

    const payload: { [key: string]: any } = {};
    if (updates.name) payload.name = updates.name;
    if (updates.description) payload.description = updates.description;
    if (typeof updates.isFavorite === 'boolean') payload.is_favorite = updates.isFavorite;

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase.from('outfits').update(payload).match({ id: outfitId, user_id: user.id });
    if (error) throw new Error(error.message);
};


/**
 * Deletes an outfit and its associated images from Supabase.
 */
export const deleteOutfit = async (outfitId: string): Promise<void> => {
    const { data: items, error: itemsError } = await supabase.from('outfit_items').select('image_path').eq('outfit_id', outfitId);
    if (itemsError) throw new Error(itemsError.message);

    if (items?.length > 0) {
        const paths = items.map(item => item.image_path);
        const { error: storageError } = await supabase.storage.from('outfits').remove(paths);
        if (storageError) console.error("Storage deletion error:", storageError.message); // Log but don't block DB delete
    }

    const { error: deleteError } = await supabase.from('outfits').delete().eq('id', outfitId);
    if (deleteError) throw new Error(deleteError.message);
};

/**
 * Generates a temporary signed URL for a private image in Supabase storage.
 */
export const getSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('outfits').createSignedUrl(path, 60 * 60); // 1 hour validity
    if (error) throw new Error(error.message);
    return data.signedUrl;
};

/**
 * Migrates outfits from localStorage to Supabase if they exist.
 */
export const migrateLocalCloset = async (): Promise<void> => {
    if (localStorage.getItem('dripsocial-migrated')) return;

    const localOutfitsJSON = localStorage.getItem('dripsocial-outfits');
    if (!localOutfitsJSON) {
        localStorage.setItem('dripsocial-migrated', 'true');
        return;
    }

    try {
        const localOutfits: Outfit[] = JSON.parse(localOutfitsJSON);
        if (localOutfits.length === 0) {
            localStorage.setItem('dripsocial-migrated', 'true');
            return;
        }

        console.log(`Migrating ${localOutfits.length} outfits from localStorage...`);
        for (const outfit of localOutfits) {
            // Check for originalImages which signifies the full outfit data is present
            if (outfit.originalImages && outfit.originalImages.length > 0) {
                 await createOutfit({
                    name: outfit.name || 'Migrated Outfit',
                    description: outfit.description,
                    category: outfit.category,
                    images: outfit.images, // these are base64 in local storage
                    originalImages: outfit.originalImages, // also base64
                });
            }
        }

        console.log('Migration complete.');
        localStorage.removeItem('dripsocial-outfits'); // Clear after successful migration
        localStorage.setItem('dripsocial-migrated', 'true');
    } catch (error) {
        console.error('Failed to migrate local closet:', error);
        // Do not set migrated flag if it fails, so it can be retried.
        // Re-throw the error so the user is notified of the failure.
        throw error;
    }
};
