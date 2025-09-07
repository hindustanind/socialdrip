// This file has been emptied as part of the social feature removal.
// Adding stub functions to prevent legacy imports from crashing the application.
export const getFeed = async () => { return { posts: [] }; };
export const getUserPosts = async (userId: string) => { return []; };
export const createPost = async (outfitId: string, caption: string) => { return { id: 'new-post' }; };
export const deletePost = async (postId: string) => {};
export const followUser = async (userId: string) => {};
export const unfollowUser = async (userId: string) => {};

// Add a default export just in case it's needed by legacy code.
export default {
    getFeed,
    getUserPosts,
    createPost,
    deletePost,
    followUser,
    unfollowUser,
};
