import { supabase } from './supa';
import { Outfit, OutfitCategory } from '../types';

// --- Types for internal use ---

interface OutfitItemRow {
  image_path: string;
  type: 'thumbnail' | 'original';
  sort_order: number;
  created_at: string;
}

interface OutfitRow {
  id: string;
  name: string;
  description: string | null;
  category: OutfitCategory;
  is_favorite: boolean;
  created_at: string;
  outfit_items: OutfitItemRow[];
}

export interface OutfitPage {
  items: Outfit[];
  nextCursor: string | null;
}

// In-memory cache for signed URLs
const signedUrlCache = new Map<string, { url: string; expires: number }>();
const SIGNED_URL_TTL_SECONDS = 21600; // 6 hours
const EXPIRATION_SAFETY_MARGIN_MS = 30000; // 30 seconds

/**
 * Signs an array of storage paths, utilizing and updating an in-memory cache.
 * @param paths - An array of storage paths to sign.
 * @returns A map of path to signed URL.
 */
async function signAndCacheUrls(paths: string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const pathsToSign: string[] = [];
  const resultMap = new Map<string, string>();

  // 1. Check cache for valid URLs
  for (const path of paths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expires > now + EXPIRATION_SAFETY_MARGIN_MS) {
      resultMap.set(path, cached.url);
    } else {
      pathsToSign.push(path);
    }
  }

  // 2. Batch sign any missing or expired URLs
  if (pathsToSign.length > 0) {
    const { data, error } = await supabase.storage
      .from('outfits')
      .createSignedUrls(pathsToSign, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error('[Outfits] Failed to create signed URLs in batch:', error);
      // Still return what we have from cache, don't throw
    } else if (data) {
      const expires = now + SIGNED_URL_TTL_SECONDS * 1000;
      for (const item of data) {
        if (item.signedUrl && item.path) {
          signedUrlCache.set(item.path, { url: item.signedUrl, expires });
          resultMap.set(item.path, item.signedUrl);
        }
      }
    }
  }

  return resultMap;
}

/**
 * Gets a single signed URL, for use in components like SignedImg.
 * @param path - The storage path.
 * @param force - If true, bypasses the cache and re-signs.
 * @returns The signed URL.
 */
export async function getSignedUrl(path: string, force = false): Promise<string> {
    const now = Date.now();
    const cached = signedUrlCache.get(path);

    if (!force && cached && cached.expires > now + EXPIRATION_SAFETY_MARGIN_MS) {
        return cached.url;
    }

    const { data, error } = await supabase.storage
        .from('outfits')
        .createSignedUrls([path], SIGNED_URL_TTL_SECONDS);

    if (error || !data || !data[0]?.signedUrl) {
        console.error(`[Outfits] Failed to re-sign single URL for path: ${path}`, error);
        throw new Error(`Could not sign URL for ${path}`);
    }

    const signedUrl = data[0].signedUrl;
    const expires = now + SIGNED_URL_TTL_SECONDS * 1000;
    signedUrlCache.set(path, { url: signedUrl, expires });
    return signedUrl;
}

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

/**
 * Fetches a paginated list of outfits for the logged-in user.
 * Uses a single relational query and keyset pagination for performance.
 */
export const listOutfits = async (limit: number = 20, cursor?: string): Promise<OutfitPage> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { items: [], nextCursor: null };
  }

  // 1. Relational SELECT with keyset pagination
  let query = supabase
    .from('outfits')
    .select('id, name, description, category, is_favorite, created_at, outfit_items!outfit_items_outfit_id_fkey(image_path, type, sort_order, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: rows, error, status } = await query;

  if (error) {
    console.error(`[Outfits] Database SELECT failed (${status}):`, error);
    throw new Error(`Closet fetch failed (${status}): ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    return { items: [], nextCursor: null };
  }

  const typedRows = rows as OutfitRow[];

  // 3. Batch fetch signed URLs
  const allPaths = typedRows.flatMap(outfit => outfit.outfit_items.map(item => item.image_path));
  const uniquePaths = [...new Set(allPaths)];
  
  const urlMap = await signAndCacheUrls(uniquePaths);

  // 4. Map data to DTOs
  const items: Outfit[] = typedRows.map(row => {
    const sortedItems = [...row.outfit_items].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const thumbnails: string[] = [];
    const originals: string[] = [];
    const thumbnailPaths: string[] = [];
    const originalPaths: string[] = [];


    sortedItems.forEach(item => {
      const url = urlMap.get(item.image_path);
      if (url) {
        if (item.type === 'original') {
          originals.push(url);
          originalPaths.push(item.image_path);
        } else if (item.type === 'thumbnail') {
          thumbnails.push(url);
          thumbnailPaths.push(item.image_path);
        }
      }
    });

    // 5. Final DTO shape matching `Outfit` type
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category,
      isFavorite: row.is_favorite,
      createdAt: new Date(row.created_at).getTime(),
      images: thumbnails.length > 0 ? thumbnails : originals, // Fallback for display
      originalImages: originals,
      imagePaths: thumbnailPaths.length > 0 ? thumbnailPaths : originalPaths,
      originalImagePaths: originalPaths,
    };
  });

  const nextCursor = typedRows.length === limit ? typedRows[typedRows.length - 1].created_at : null;

  return { items, nextCursor };
};


export interface CreateOutfitData {
  name: string;
  description?: string;
  category: OutfitCategory;
  images: string[]; // base64 compressed
  originalImages: string[]; // base64 original
}

/**
 * Creates a new outfit for the authenticated user.
 * This involves:
 * 1. Inserting a record into the 'outfits' table.
 * 2. Uploading original and thumbnail images to Supabase Storage.
 *    - Each file is stored under a path prefixed with the user's ID and grouped by the new outfit's ID.
 *    - e.g., `/{user_id}/{outfit_id}/167..._0_thumbnail.jpg`
 * 3. Inserting a record for each uploaded image into the 'outfit_items' table.
 * 4. Generating and returning the complete new Outfit object with signed URLs for immediate UI display.
 * @param data - The data for the new outfit, including base64 encoded images.
 * @returns A Promise that resolves to the newly created Outfit object.
 */
export const createOutfit = async (data: CreateOutfitData): Promise<Outfit> => {
    // 1. Authenticate user and throw an error if not logged in.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated. Cannot create outfit.');

    // 2. Create the main outfit record in the database.
    const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .insert({
            user_id: user.id,
            name: data.name,
            description: data.description,
            category: data.category,
            is_favorite: false, // Outfits are not favorited by default.
        })
        .select('id, created_at')
        .single();

    if (outfitError) {
        console.error('[Outfits] Create outfit DB insert failed:', outfitError);
        throw new Error(`Could not create outfit record: ${outfitError.message}`);
    }
    const newOutfitId = outfitData.id;

    const uploadedPaths: { path: string; type: 'thumbnail' | 'original' }[] = [];

    // 3. Helper function to upload a single base64 image.
    const uploadImage = async (base64: string, type: 'thumbnail' | 'original', index: number) => {
        const mimeType = type === 'thumbnail' ? 'image/jpeg' : 'image/png';
        const extension = type === 'thumbnail' ? 'jpg' : 'png';
        
        // Use a unique filename including a timestamp to prevent any potential collisions.
        const fileName = `${Date.now()}_${index}_${type}.${extension}`;
        const file = base64toFile(base64, fileName, mimeType);
        
        // Construct the storage path, prefixed with the user's ID and grouped by the outfit ID.
        const path = `${user.id}/${newOutfitId}/${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage.from('outfits').upload(path, file);
        if (uploadError) {
            console.error(`[Outfits] Storage upload failed for path ${path}:`, uploadError);
            // Attempt to clean up the created outfit record if uploads fail.
            await supabase.from('outfits').delete().eq('id', newOutfitId);
            throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        // Store the exact path in the database, linking the image to the outfit.
        const { error: insertError } = await supabase.from('outfit_items').insert({
            outfit_id: newOutfitId, image_path: uploadData.path, type, sort_order: index,
        });
        if (insertError) {
            console.error(`[Outfits] DB insert failed for item ${uploadData.path}:`, insertError);
            // Attempt to clean up the uploaded file and the outfit record on DB insert failure.
            await supabase.storage.from('outfits').remove([uploadData.path]);
            await supabase.from('outfits').delete().eq('id', newOutfitId);
            throw new Error(`Failed to link image to outfit: ${insertError.message}`);
        }
        uploadedPaths.push({ path: uploadData.path, type });
    };

    try {
        // 4. Upload all images in parallel for performance.
        const thumbnailUploads = data.images.map((img, i) => uploadImage(img, 'thumbnail', i));
        const originalUploads = data.originalImages.map((img, i) => uploadImage(img, 'original', i));
        await Promise.all([...thumbnailUploads, ...originalUploads]);
    } catch (error) {
        // Errors from uploadImage are re-thrown to be caught here.
        // Cleanup is handled within uploadImage, so we just log and re-throw.
        console.error('[Outfits] An error occurred during the image upload process.', error);
        throw error;
    }

    // 5. Create signed URLs for all successfully uploaded images.
    const { data: urls, error: urlsError } = await supabase.storage.from('outfits').createSignedUrls(uploadedPaths.map(p => p.path), SIGNED_URL_TTL_SECONDS);
    if(urlsError) {
        console.error('[Outfits] Failed to create signed URLs:', urlsError);
        throw new Error(`Could not get image URLs: ${urlsError.message}`);
    };

    const urlMap = new Map<string, string>();
    const now = Date.now();
    const expires = now + SIGNED_URL_TTL_SECONDS * 1000;
    urls.forEach(u => {
        if (u.signedUrl && u.path) {
            urlMap.set(u.path, u.signedUrl);
            signedUrlCache.set(u.path, { url: u.signedUrl, expires });
        }
    });
    
    // 6. Assemble the final Outfit object to return to the UI.
    const thumbnails = uploadedPaths.filter(p => p.type === 'thumbnail').map(p => urlMap.get(p.path)!).filter(Boolean);
    const originals = uploadedPaths.filter(p => p.type === 'original').map(p => urlMap.get(p.path)!).filter(Boolean);
    const thumbnailPaths = uploadedPaths.filter(p => p.type === 'thumbnail').map(p => p.path);
    const originalPaths = uploadedPaths.filter(p => p.type === 'original').map(p => p.path);

    return {
        id: newOutfitId,
        name: data.name,
        description: data.description,
        category: data.category,
        createdAt: new Date(outfitData.created_at).getTime(),
        isFavorite: false,
        images: thumbnails.length > 0 ? thumbnails : originals, // Use thumbnails for display, fallback to originals.
        originalImages: originals,
        imagePaths: thumbnailPaths.length > 0 ? thumbnailPaths : originalPaths,
        originalImagePaths: originalPaths,
    };
};

/**
 * Updates an outfit's details in Supabase.
 */
export const updateOutfit = async (outfitId: string, updates: Partial<Outfit>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const payload: { [key: string]: any } = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
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
        if (storageError) console.error("Storage deletion error (will still attempt DB delete):", storageError.message);
    }

    const { error: deleteError } = await supabase.from('outfits').delete().eq('id', outfitId);
    if (deleteError) throw new Error(deleteError.message);
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
        localStorage.removeItem('dripsocial-outfits');
        localStorage.setItem('dripsocial-migrated', 'true');
    } catch (error) {
        console.error('Failed to migrate local closet:', error);
        throw error;
    }
};