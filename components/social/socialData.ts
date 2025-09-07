// Mock data for the social feed feature

// A function to get a consistent placeholder image
const getAvatarUrl = (seed: string) => `https://i.pravatar.cc/150?u=${seed}`;
const getPostUrl = (seed: string) => `https://picsum.photos/seed/${seed}/600/750`;

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface Story {
  id: string;
  user: SocialUser;
  seen: boolean;
}

export interface PostComment {
    id: string;
    user: SocialUser;
    text: string;
}

export interface Post {
  id: string;
  user: SocialUser;
  mediaUrl: string;
  caption: string;
  likes: number;
  comments: PostComment[];
  timestamp: string;
}

// --- Mock Data ---

export const socialUsers: SocialUser[] = [
  { id: 'user-1', username: 'style_maven', displayName: 'Alex', avatarUrl: getAvatarUrl('alex') },
  { id: 'user-2', username: 'dapper_dan', displayName: 'Dan', avatarUrl: getAvatarUrl('dan') },
  { id: 'user-3', username: 'chic_chloe', displayName: 'Chloe', avatarUrl: getAvatarUrl('chloe') },
  { id: 'user-4', username: 'fashionista_mia', displayName: 'Mia', avatarUrl: getAvatarUrl('mia') },
  { id: 'user-5', username: 'trendsetter_leo', displayName: 'Leo', avatarUrl: getAvatarUrl('leo') },
  { id: 'user-6', username: 'vintage_vibes', displayName: 'Violet', avatarUrl: getAvatarUrl('violet') },
  { id: 'user-7', username: 'urban_explorer', displayName: 'Ethan', avatarUrl: getAvatarUrl('ethan') },
  { id: 'user-8', username: 'minimal_max', displayName: 'Max', avatarUrl: getAvatarUrl('max') },
];

export const stories: Story[] = socialUsers.map((user, index) => ({
    id: `story-${index + 1}`,
    user,
    seen: index > 2, // First 3 are unseen
}));

export const posts: Post[] = [
    {
        id: 'post-1',
        user: socialUsers[2],
        mediaUrl: getPostUrl('post1'),
        caption: 'Loving this new look for the season! What do you all think? ✨ #OOTD #FallFashion',
        likes: 1256,
        comments: [
            { id: 'c1-1', user: socialUsers[0], text: 'Absolutely stunning! 🔥' },
            { id: 'c1-2', user: socialUsers[4], text: 'Where did you get that jacket?!' },
        ],
        timestamp: '4h ago',
    },
    {
        id: 'post-2',
        user: socialUsers[1],
        mediaUrl: getPostUrl('post2'),
        caption: 'Keeping it casual today. Comfort is key. 👟',
        likes: 834,
        comments: [
            { id: 'c2-1', user: socialUsers[7], text: 'Clean fit!' },
        ],
        timestamp: '12h ago',
    },
    {
        id: 'post-3',
        user: socialUsers[5],
        mediaUrl: getPostUrl('post3'),
        caption: 'Thrift store finds are the best finds. 🌿 #Vintage #SustainableFashion',
        likes: 2310,
        comments: [
            { id: 'c3-1', user: socialUsers[3], text: 'Such a great find! Looks amazing on you.' },
            { id: 'c3-2', user: socialUsers[6], text: 'Love the retro vibe.' },
        ],
        timestamp: '1d ago',
    },
     {
        id: 'post-4',
        user: socialUsers[0],
        mediaUrl: getPostUrl('post4'),
        caption: 'Night out vibes. 🌃',
        likes: 987,
        comments: [
            { id: 'c4-1', user: socialUsers[2], text: 'Slay! ✨' },
        ],
        timestamp: '2d ago',
    },
];
