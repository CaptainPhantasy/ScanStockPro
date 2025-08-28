'use client';

import React from 'react';

// PWA registration and management
// Agent 2 - Progressive Web App functionality

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isUpdateAvailable: boolean;
  installPrompt: PWAInstallPrompt | null;
}

class PWAManager {
  private installPrompt: PWAInstallPrompt | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private callbacks: Set<(state: PWAState) => void> = new Set();

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', this.handleInstallPrompt);
    
    // Listen for app installed
    window.addEventListener('appinstalled', this.handleAppInstalled);

    // Register service worker
    await this.registerServiceWorker();
    
    // Check for updates
    this.checkForUpdates();
  }

  private handleInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.installPrompt = e as any;
    this.notifyCallbacks();
  };

  private handleAppInstalled = () => {
    this.installPrompt = null;
    this.notifyCallbacks();
    
    // Track installation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_installed', {
        event_category: 'pwa',
        event_label: 'app_installed'
      });
    }
  };

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered:', this.registration);

        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          this.handleUpdateFound();
        });

        // Check for waiting service worker
        if (this.registration.waiting) {
          this.notifyCallbacks();
        }

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private handleUpdateFound() {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New content is available
        this.notifyCallbacks();
        
        // Show update notification
        this.showUpdateNotification();
      }
    });
  }

  private showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ScanStock Pro Update Available', {
        body: 'A new version is available. Restart the app to update.',
        icon: '/icons/icon-96x96.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          { action: 'update', title: 'Update Now' },
          { action: 'later', title: 'Later' }
        ]
      });
    }
  }

  private checkForUpdates() {
    // Check for updates every hour
    setInterval(() => {
      if (this.registration) {
        this.registration.update();
      }
    }, 60 * 60 * 1000);
  }

  private notifyCallbacks() {
    const state = this.getState();
    this.callbacks.forEach(callback => callback(state));
  }

  public getState(): PWAState {
    return {
      isInstalled: this.isInstalled(),
      canInstall: !!this.installPrompt,
      isUpdateAvailable: !!this.registration?.waiting,
      installPrompt: this.installPrompt,
    };
  }

  public isInstalled(): boolean {
    // Check various installation indicators
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    
    return isStandalone || isNavigatorStandalone || isAndroidApp;
  }

  public async install(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  }

  public async updateApp(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn('No update available');
      return;
    }

    // Tell the waiting service worker to activate
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to get the new version
    window.location.reload();
  }

  public subscribe(callback: (state: PWAState) => void): () => void {
    this.callbacks.add(callback);
    
    // Immediately call with current state
    callback(this.getState());
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.warn('Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.getVapidPublicKey(),
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private getVapidPublicKey(): string {
    // This should come from environment variables
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }
}

// Singleton instance
const pwaManager = new PWAManager();

// Hook for React components
export const usePWA = () => {
  const [state, setState] = React.useState<PWAState>(pwaManager.getState());

  React.useEffect(() => {
    return pwaManager.subscribe(setState);
  }, []);

  return {
    ...state,
    install: () => pwaManager.install(),
    updateApp: () => pwaManager.updateApp(),
    requestNotificationPermission: () => pwaManager.requestNotificationPermission(),
    subscribeToPushNotifications: () => pwaManager.subscribeToPushNotifications(),
  };
};

export default pwaManager;