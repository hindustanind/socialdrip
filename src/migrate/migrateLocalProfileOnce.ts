import { upsertMyProfile, uploadAvatar } from '../services/profile';

const MIGRATION_KEY = 'dripsocial-profile-migrated-v1';
const LEGACY_PROFILE_KEY = 'dripsocial-local-profile';

// Helper to convert data URL to Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
}

export async function migrateLocalProfileOnce() {
    if (localStorage.getItem(MIGRATION_KEY)) {
        return; // Already migrated
    }

    try {
        const localProfileJSON = localStorage.getItem(LEGACY_PROFILE_KEY);
        if (!localProfileJSON) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            return;
        }

        console.log("Starting legacy profile migration...");

        const localProfile = JSON.parse(localProfileJSON);
        const updates: any = {};
        
        if (localProfile.displayName) {
            updates.display_name = localProfile.displayName;
        }
        if (localProfile.styleSignature) {
            updates.style_signature = localProfile.styleSignature;
        }

        // Upload avatar if it exists
        if (localProfile.profilePicture && localProfile.profilePicture.startsWith('data:')) {
            try {
                const blob = await dataUrlToBlob(localProfile.profilePicture);
                const file = new File([blob], "migrated_avatar.png", { type: blob.type });
                const { path } = await uploadAvatar(file);
                updates.avatar_path = path;
            } catch (e) {
                console.error("Failed to migrate legacy avatar:", e);
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await upsertMyProfile(updates);
        }

        // Clean up legacy keys
        localStorage.removeItem(LEGACY_PROFILE_KEY);
        localStorage.setItem(MIGRATION_KEY, 'true');
        console.log("Legacy profile migration successful.");
    } catch (error) {
        console.error("Failed to migrate local profile:", error);
        // Do not set migrated flag if it fails, so it can be retried next time.
    }
}
