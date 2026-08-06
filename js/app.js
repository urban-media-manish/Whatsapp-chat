/* WhatsApp Web Clone Core Application Logic */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const chatsList = document.getElementById('chatsList');
  const emptyState = document.getElementById('emptyState');
  const chatWindow = document.getElementById('chatWindow');
  const activeContactAvatar = document.getElementById('activeContactAvatar');
  const activeContactName = document.getElementById('activeContactName');
  const activeContactStatus = document.getElementById('activeContactStatus');
  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const sendIcon = document.getElementById('sendIcon');
  const searchInput = document.getElementById('searchInput');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const htmlDoc = document.documentElement;

  // Audio / Video Call Modal Elements
  const callModal = document.getElementById('callModal');
  const callModalAvatar = document.getElementById('callModalAvatar');
  const callModalName = document.getElementById('callModalName');
  const callModalStatus = document.getElementById('callModalStatus');
  const callVideoPreview = document.getElementById('callVideoPreview');
  const startAudioCallBtn = document.getElementById('startAudioCallBtn');
  const startVideoCallBtn = document.getElementById('startVideoCallBtn');
  const endCallBtn = document.getElementById('endCallBtn');
  const muteMicBtn = document.getElementById('muteMicBtn');
  const toggleCamBtn = document.getElementById('toggleCamBtn');

  // Emojis & Attachments
  const emojiToggleBtn = document.getElementById('emojiToggleBtn');
  const emojiPopover = document.getElementById('emojiPopover');
  const imageInput = document.getElementById('imageInput');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  // Status Story Elements
  const statusBtn = document.getElementById('statusBtn');
  const storyModal = document.getElementById('storyModal');
  const closeStoryBtn = document.getElementById('closeStoryBtn');
  const storyUserAvatar = document.getElementById('storyUserAvatar');
  const storyUserName = document.getElementById('storyUserName');
  const storyTime = document.getElementById('storyTime');
  const storyImage = document.getElementById('storyImage');
  const storyProgressFill = document.getElementById('storyProgressFill');

  // Audio Recording Elements
  const recordingBar = document.getElementById('recordingBar');
  const inputWrapper = document.getElementById('inputWrapper');
  const recordingTimer = document.getElementById('recordingTimer');

  // State Variables
  let activeChatId = null;
  let activeFilter = 'all';
  let isRecording = false;
  let recordingInterval = null;
  let callTimerInterval = null;
  let callSeconds = 0;
  let storyInterval = null;

  // SVG Icons
  const micSvg = `<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>`;
  const paperPlaneSvg = `<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>`;
  const doubleTickBlueSvg = `<svg viewBox="0 0 18 18"><path fill="#53bdeb" d="M17.394 5.035l-9.6 9.6a.75.75 0 0 1-1.06 0l-4.8-4.8a.75.75 0 0 1 1.06-1.06l4.27 4.27 9.07-9.07a.75.75 0 0 1 1.06 1.06zM13.5 5.035l-5.7 5.7a.75.75 0 1 1-1.06-1.06l5.7-5.7a.75.75 0 0 1 1.06 1.06z"/></svg>`;

  /* --- INITIALIZATION --- */
  function init() {
    renderChatsList();
    setupEventListeners();
  }

  /* --- RENDER CONTACTS SIDEBAR LIST --- */
  function renderChatsList() {
    chatsList.innerHTML = '';

    const searchTerm = searchInput.value.toLowerCase();
    
    let filteredContacts = contactsData.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm) ||
                            c.messages.some(m => m.text && m.text.toLowerCase().includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      if (activeFilter === 'unread') return c.unreadCount > 0;
      if (activeFilter === 'favorites') return c.pinned;
      return true;
    });

    // Sort: Pinned first, then by latest message timestamp
    filteredContacts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    filteredContacts.forEach(contact => {
      const lastMsgObj = contact.messages[contact.messages.length - 1] || {};
      const lastMsgText = lastMsgObj.type === 'image' ? '📷 Photo' :
                          lastMsgObj.type === 'audio' ? '🎵 Audio note' : (lastMsgObj.text || '');

      const chatItemHtml = `
        <div class="chat-item ${contact.id === activeChatId ? 'active' : ''}" data-id="${contact.id}">
          <div class="chat-avatar-wrapper">
            <img src="${contact.avatar}" alt="${contact.name}" class="avatar">
            ${contact.status === 'online' ? '<div class="online-indicator"></div>' : ''}
          </div>
          <div class="chat-info">
            <div class="chat-top-row">
              <span class="chat-name">${contact.name}</span>
              <span class="chat-time ${contact.unreadCount > 0 ? 'unread' : ''}">${lastMsgObj.time || ''}</span>
            </div>
            <div class="chat-bottom-row">
              <span class="last-msg">
                ${lastMsgObj.sender === 'me' ? doubleTickBlueSvg : ''}
                <span class="msg-text-snippet">${lastMsgText}</span>
              </span>
              ${contact.unreadCount > 0 ? `<span class="unread-badge">${contact.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;

      chatsList.insertAdjacentHTML('beforeend', chatItemHtml);
    });

    // Attach click listeners to chat items
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'));
        selectChat(id);
      });
    });
  }

  /* --- SELECT CHAT --- */
  function selectChat(id) {
    activeChatId = id;
    const contact = contactsData.find(c => c.id === id);
    if (!contact) return;

    // Clear unread count
    contact.unreadCount = 0;

    // Show Chat Window, Hide Empty State
    emptyState.classList.add('hidden');
    chatWindow.classList.remove('hidden');

    // Update Header
    activeContactAvatar.src = contact.avatar;
    activeContactName.textContent = contact.name;
    activeContactStatus.textContent = contact.status;
    activeContactStatus.className = `chat-header-status ${contact.status === 'online' ? 'online' : ''}`;

    renderMessages(contact.messages);
    renderChatsList();

    // Scroll to bottom of chat
    scrollToBottom();
  }

  /* --- RENDER MESSAGES IN CHAT --- */
  function renderMessages(messages) {
    messagesContainer.innerHTML = `<div class="date-divider">Today</div>`;

    messages.forEach(msg => {
      const isOutgoing = msg.sender === 'me';
      let contentHtml = '';

      if (msg.type === 'image') {
        contentHtml = `
          <div class="message-image" data-src="${msg.image}">
            <img src="${msg.image}" alt="Attached Image">
          </div>
          ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
        `;
      } else if (msg.type === 'audio') {
        contentHtml = `
          <div class="audio-player-bubble">
            <button class="audio-play-btn" data-audio="playing">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <div class="audio-waveform">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
            <span style="font-size:12px; opacity:0.8;">${msg.duration || '0:12'}</span>
          </div>
        `;
      } else {
        contentHtml = `<div class="message-text">${escapeHtml(msg.text)}</div>`;
      }

      const messageBubbleHtml = `
        <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${contentHtml}
          <div class="message-meta">
            <span class="message-time">${msg.time}</span>
            ${isOutgoing ? `<span class="tick-icon blue">${doubleTickBlueSvg}</span>` : ''}
          </div>
        </div>
      `;

      messagesContainer.insertAdjacentHTML('beforeend', messageBubbleHtml);
    });

    // Attach click listeners to image bubbles for Lightbox
    document.querySelectorAll('.message-image').forEach(imgEl => {
      imgEl.addEventListener('click', () => {
        lightboxImg.src = imgEl.getAttribute('data-src');
        lightboxModal.classList.remove('hidden');
      });
    });

    // Attach audio play toggle
    document.querySelectorAll('.audio-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bubble = btn.closest('.audio-player-bubble');
        bubble.classList.toggle('playing');
      });
    });

    scrollToBottom();
  }

  /* --- SEND MESSAGE --- */
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !activeChatId) return;

    const contact = contactsData.find(c => c.id === activeChatId);
    if (!contact) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: text,
      time: timeNow,
      status: 'read',
      type: 'text'
    };

    contact.messages.push(newMsg);
    messageInput.value = '';
    sendIcon.innerHTML = micSvg;

    renderMessages(contact.messages);
    renderChatsList();

    // Trigger Simulated Auto-Reply
    triggerAutoReply(contact);
  }

  /* --- AUTO REPLY SIMULATION --- */
  function triggerAutoReply(contact) {
    // Set status to "typing..."
    setTimeout(() => {
      if (activeChatId === contact.id) {
        activeContactStatus.textContent = 'typing...';
        activeContactStatus.className = 'chat-header-status online';
      }
    }, 600);

    // Send reply message after 1.8 seconds
    setTimeout(() => {
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const randomReply = autoReplyPool[Math.floor(Math.random() * autoReplyPool.length)];

      const replyMsg = {
        id: Date.now(),
        sender: contact.name.toLowerCase().split(' ')[0],
        text: randomReply,
        time: timeNow,
        status: 'read',
        type: 'text'
      };

      contact.messages.push(replyMsg);

      if (activeChatId === contact.id) {
        activeContactStatus.textContent = 'online';
        renderMessages(contact.messages);
      } else {
        contact.unreadCount += 1;
      }

      renderChatsList();
    }, 2200);
  }

  /* --- AUDIO RECORDING SIMULATOR --- */
  function toggleAudioRecording() {
    if (!isRecording) {
      // Start recording
      isRecording = true;
      inputWrapper.classList.add('hidden');
      recordingBar.classList.remove('hidden');
      sendBtn.style.color = '#ea4335';

      let secs = 0;
      recordingTimer.textContent = '0:00';
      recordingInterval = setInterval(() => {
        secs++;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        recordingTimer.textContent = `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
      }, 1000);
    } else {
      // Stop & Send recording
      clearInterval(recordingInterval);
      isRecording = false;
      inputWrapper.classList.remove('hidden');
      recordingBar.classList.add('hidden');
      sendBtn.style.color = '';

      if (activeChatId) {
        const contact = contactsData.find(c => c.id === activeChatId);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        contact.messages.push({
          id: Date.now(),
          sender: 'me',
          time: timeNow,
          status: 'read',
          type: 'audio',
          duration: recordingTimer.textContent
        });

        renderMessages(contact.messages);
        renderChatsList();
        triggerAutoReply(contact);
      }
    }
  }

  /* --- CALL MODAL SYSTEM --- */
  function startCall(type) {
    if (!activeChatId) return;
    const contact = contactsData.find(c => c.id === activeChatId);

    callModalAvatar.src = contact.avatar;
    callModalName.textContent = contact.name;
    callModalStatus.textContent = `${type === 'video' ? 'Video' : 'Voice'} Call Ringing...`;
    
    if (type === 'video') {
      callVideoPreview.style.display = 'block';
    } else {
      callVideoPreview.style.display = 'none';
    }

    callModal.classList.remove('hidden');

    callSeconds = 0;
    setTimeout(() => {
      callModalStatus.textContent = 'Connected (0:00)';
      callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = Math.floor(callSeconds / 60);
        const secs = callSeconds % 60;
        callModalStatus.textContent = `Connected (${mins}:${secs < 10 ? '0' : ''}${secs})`;
      }, 1000);
    }, 2000);
  }

  function endCall() {
    clearInterval(callTimerInterval);
    callModal.classList.add('hidden');
  }

  /* --- STATUS STORY VIEWER --- */
  function openStatusStory() {
    const contactWithStory = contactsData.find(c => c.hasStory);
    if (!contactWithStory) return;

    storyUserAvatar.src = contactWithStory.avatar;
    storyUserName.textContent = contactWithStory.name;
    storyImage.src = contactWithStory.storyImg;
    storyModal.classList.remove('hidden');

    storyProgressFill.style.width = '0%';
    let progress = 0;
    storyInterval = setInterval(() => {
      progress += 2;
      storyProgressFill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(storyInterval);
        storyModal.classList.add('hidden');
      }
    }, 100);
  }

  /* --- EVENT LISTENERS --- */
  function setupEventListeners() {
    // Input typing listener to switch send/mic icon
    messageInput.addEventListener('input', () => {
      if (messageInput.value.trim().length > 0) {
        sendIcon.innerHTML = paperPlaneSvg;
      } else {
        sendIcon.innerHTML = micSvg;
      }
    });

    // Keydown Enter to send
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Send Button click
    sendBtn.addEventListener('click', () => {
      if (messageInput.value.trim().length > 0) {
        sendMessage();
      } else {
        toggleAudioRecording();
      }
    });

    // Search Input
    searchInput.addEventListener('input', renderChatsList);

    // Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter');
        renderChatsList();
      });
    });

    // Dark / Light Theme Switcher
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlDoc.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      htmlDoc.setAttribute('data-theme', newTheme);
    });

    // Call Buttons
    startAudioCallBtn.addEventListener('click', () => startCall('audio'));
    startVideoCallBtn.addEventListener('click', () => startCall('video'));
    endCallBtn.addEventListener('click', endCall);

    muteMicBtn.addEventListener('click', () => muteMicBtn.classList.toggle('active-btn'));
    toggleCamBtn.addEventListener('click', () => toggleCamBtn.classList.toggle('active-btn'));

    // Emojis Popover Toggle
    emojiToggleBtn.addEventListener('click', () => emojiPopover.classList.toggle('hidden'));
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        messageInput.value += btn.textContent;
        sendIcon.innerHTML = paperPlaneSvg;
        emojiPopover.classList.add('hidden');
      });
    });

    // Image Upload
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !activeChatId) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const contact = contactsData.find(c => c.id === activeChatId);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        contact.messages.push({
          id: Date.now(),
          sender: 'me',
          text: '',
          image: event.target.result,
          time: timeNow,
          status: 'read',
          type: 'image'
        });

        renderMessages(contact.messages);
        renderChatsList();
        triggerAutoReply(contact);
      };
      reader.readAsDataURL(file);
    });

    // Lightbox Close
    closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.add('hidden'));

    // Status Story Trigger
    statusBtn.addEventListener('click', openStatusStory);
    closeStoryBtn.addEventListener('click', () => {
      clearInterval(storyInterval);
      storyModal.classList.add('hidden');
    });
  }

  // Utility Helpers
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Start App
  init();
});
