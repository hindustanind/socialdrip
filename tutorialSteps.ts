type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

export interface TutorialStep {
  elementId: string;
  title: string;
  content: string;
  page?: Page;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const tutorialSteps: TutorialStep[] = [
  {
    page: 'home',
    elementId: 'nav-generator',
    title: "1. Create Your First Outfit",
    content: "Welcome! Let's start by creating your first digital outfit. Tap here to go to the Outfit Generator.",
    position: 'bottom',
  },
  {
    page: 'generator',
    elementId: 'tutorial-generator-uploader',
    title: "2. Upload Your Style",
    content: "Simply upload a photo of any outfit. Our AI, AVA, will generate a clean, interactive 360° view, even if the photo is only half-body!",
    position: 'right',
  },
  {
    page: 'generator',
    elementId: 'nav-closet',
    title: "3. Visit Your Closet",
    content: "After generation, your new digital outfits are saved in 'My Outfits'. Let's go there now.",
    position: 'bottom',
  },
  {
    page: 'closet',
    elementId: 'outfit-grid',
    title: "4. Your Digital Wardrobe",
    content: "This is your closet! All your saved items will appear here. Tap any outfit to open the 360° interactive viewer.",
    position: 'bottom',
  },
  {
    page: 'closet',
    elementId: 'category-filter',
    title: "5. Stay Organized",
    content: "As your collection grows, use these filters to easily find the perfect outfit for any occasion.",
    position: 'bottom',
  },
  {
    page: 'closet',
    elementId: 'dripscore',
    title: "6. Your DripScore 🔥",
    content: "This is your style score! It increases every time you share a look from the app. The higher the score, the more you're influencing the fashion world!",
    position: 'left',
  },
  {
    page: 'closet',
    elementId: 'tutorial-dressing-room-tab',
    title: "7. The Dressing Room",
    content: "Ready for some fun? Tap here to switch to the Dressing Room, where you can create a virtual avatar and try on your saved outfits!",
    position: 'bottom',
  },
  {
    page: 'closet',
    elementId: 'nav-ava',
    title: "8. Meet Your AI Stylist",
    content: "Need fashion advice? Let's check out your personal AI stylist, AVA.",
    position: 'bottom',
  },
  {
    page: 'ava',
    elementId: 'tutorial-ava-stylist-page',
    title: "9. Get Instant Advice",
    content: "Chat with AVA here! Ask for styling tips, what to wear for an event, or how to pair items. She knows everything in your closet!",
    position: 'top',
  },
  {
    page: 'ava',
    elementId: 'header-menu-button',
    title: "10. Profile & Settings",
    content: "This menu holds your profile, app settings, and the logout option. You can change your display name and profile picture from here.",
    position: 'left',
  },
  {
    elementId: '', // An empty ID signifies the final, centered modal
    title: "You're All Set!",
    content: "That's the grand tour! You're ready to build your ultimate virtual wardrobe. Go ahead and generate your first outfit!",
    position: 'center',
  },
];