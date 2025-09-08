// FIX: Changed import to use the correct exported functions 'updateProfileData' and 'uploadProfileAvatar'.
import { updateProfileData, uploadProfileAvatar } from '../services/profile';

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
        
        // Upload avatar if it exists. This also updates the profile with the avatar_path.
        if (localProfile.profilePicture && localProfile.profilePicture.startsWith('data:')) {
            try {
                const blob = await dataUrlToBlob(localProfile.profilePicture);
                const file = new File([blob], "migrated_avatar.png", { type: blob.type });
                // FIX: Correctly call 'uploadProfileAvatar' which handles the upload and profile update.
                await uploadProfileAvatar(file);
            } catch (e) {
                console.error("Failed to migrate legacy avatar:", e);
            }
        }
        
        // Prepare updates for other profile fields.
        const updates: { displayName?: string; styleSignature?: string } = {};
        if (localProfile.displayName) {
            updates.displayName = localProfile.displayName;
        }
        if (localProfile.styleSignature) {
            updates.styleSignature = localProfile.styleSignature;
        }

        // Update the profile with text-based data in a separate call.
        if (Object.keys(updates).length > 0) {
            // FIX: Correctly call 'updateProfileData' to save text-based profile information.
            await updateProfileData(updates);
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
