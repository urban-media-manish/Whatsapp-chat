// Unified PWA Installation Utility

let globalDeferredPrompt: any = null;

// Initialize prompt listener immediately
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    (window as any).deferredInstallPrompt = e;
  });

  // Track app installation
  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    (window as any).deferredInstallPrompt = null;
    console.log('App was successfully installed');
  });
}

export const isAppInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
};

export interface InstallResult {
  status: 'installed' | 'prompted' | 'dismissed' | 'manual_ios' | 'manual_other';
  message: string;
}

export const installPwaApp = async (): Promise<InstallResult> => {
  if (isAppInstalled()) {
    return {
      status: 'installed',
      message: 'App is already installed on your device!'
    };
  }

  const promptEvent = globalDeferredPrompt || (window as any).deferredInstallPrompt;

  if (promptEvent) {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        globalDeferredPrompt = null;
        (window as any).deferredInstallPrompt = null;
        return {
          status: 'prompted',
          message: 'App installed to Home screen!'
        };
      } else {
        return {
          status: 'dismissed',
          message: 'Installation dismissed'
        };
      }
    } catch (err) {
      console.error('PWA install error:', err);
    }
  }

  if (isIOSDevice()) {
    return {
      status: 'manual_ios',
      message: "Tap Safari Share button (⎕↑) at the bottom → Choose 'Add to Home Screen' (+)"
    };
  }

  return {
    status: 'manual_other',
    message: "Tap browser menu (⋮ / ⊕ in address bar) → Choose 'Add to Home screen' or 'Install App'"
  };
};
