/* Initial Mock Data for WhatsApp Web Clone */

const currentUser = {
  name: "You",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
  status: "Available | Coding with AI 🚀"
};

const contactsData = [
  {
    id: 1,
    name: "Aarav Sharma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    status: "online",
    about: "Urgent calls only 📞",
    hasStory: true,
    storyImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    unreadCount: 2,
    pinned: true,
    messages: [
      { id: 101, sender: "aarav", text: "Hey! How is the WhatsApp clone coming along?", time: "10:14 AM", status: "read", type: "text" },
      { id: 102, sender: "me", text: "It's coming along amazingly! Added dark mode and live calling interface.", time: "10:16 AM", status: "read", type: "text" },
      { id: 103, sender: "aarav", text: "That sounds awesome! Can you share a preview?", time: "10:18 AM", status: "unread", type: "text" },
      { id: 104, sender: "aarav", text: "Check out this view from my trip yesterday!", time: "10:19 AM", status: "unread", type: "image", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80" }
    ]
  },
  {
    id: 2,
    name: "Priya Patel",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
    status: "last seen today at 09:45 AM",
    about: "Design & Code ✨",
    hasStory: true,
    storyImg: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
    unreadCount: 0,
    pinned: true,
    messages: [
      { id: 201, sender: "priya", text: "Did you check the new color palette for the app?", time: "09:30 AM", status: "read", type: "text" },
      { id: 202, sender: "me", text: "Yes! The emerald green #00a884 matches perfectly.", time: "09:35 AM", status: "read", type: "text" },
      { id: 203, sender: "priya", text: "Audio Note (0:15)", time: "09:40 AM", status: "read", type: "audio", duration: "0:15" }
    ]
  },
  {
    id: 3,
    name: "Dev Team Global",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80",
    status: "Aarav, Priya, You",
    about: "Project discussions & deployments 💻",
    hasStory: false,
    unreadCount: 5,
    pinned: false,
    messages: [
      { id: 301, sender: "aarav", text: "Build passes all tests! 🚀", time: "Yesterday", status: "read", type: "text" },
      { id: 302, sender: "priya", text: "Great job guys! Ready for release.", time: "Yesterday", status: "read", type: "text" },
      { id: 303, sender: "aarav", text: "Deploying to production now...", time: "08:10 AM", status: "unread", type: "text" }
    ]
  },
  {
    id: 4,
    name: "Rohan Mehta",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
    status: "online",
    about: "Coffee & Code ☕",
    hasStory: false,
    unreadCount: 0,
    pinned: false,
    messages: [
      { id: 401, sender: "rohan", text: "Bro, up for a quick call regarding the weekend project?", time: "Yesterday", status: "read", type: "text" },
      { id: 402, sender: "me", text: "Sure Rohan, hit me up on video call!", time: "Yesterday", status: "read", type: "text" }
    ]
  },
  {
    id: 5,
    name: "Neha Verma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    status: "last seen yesterday at 11:20 PM",
    about: "Exploring the world 🌍",
    hasStory: true,
    storyImg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    unreadCount: 0,
    pinned: false,
    messages: [
      { id: 501, sender: "neha", text: "Sent you the trip pictures!", time: "Aug 4", status: "read", type: "text" }
    ]
  }
];

const autoReplyPool = [
  "Wow, that looks super smooth! Love the dark theme setup 👌",
  "Awesome! Let me know when you host this live.",
  "Haha true! WhatsApp Web really has the best desktop UX.",
  "Got it! I will check the details and reply shortly.",
  "Sounds great! Let's get on a call soon to discuss further. 📞",
  "Nice work! Is the audio call functional as well?"
];
