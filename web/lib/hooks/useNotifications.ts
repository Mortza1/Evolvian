/**
 * Notification Hook
 *
 * Provides browser notifications and toast notifications for assumption alerts.
 * Phase 6.1 - Assumption Notifications
 */

import { useEffect, useState, useCallback } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }, [supported, permission]);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      if (!supported || permission !== 'granted') {
        console.warn('Notifications not available or not permitted');
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          badge: '/favicon.ico',
        });

        if (options.onClick) {
          notification.onclick = () => {
            options.onClick!();
            notification.close();
          };
        }

        // Auto-close after 10 seconds if not requiring interaction
        if (!options.requireInteraction) {
          setTimeout(() => notification.close(), 10000);
        }

        return notification;
      } catch (err) {
        console.error('Error showing notification:', err);
        return null;
      }
    },
    [supported, permission]
  );

  const playNotificationSound = useCallback(() => {
    try {
      // Create a subtle notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound - subtle, pleasant tone
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.value = 0.1; // Low volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  }, []);

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    playNotificationSound,
    canNotify: supported && permission === 'granted',
  };
}
