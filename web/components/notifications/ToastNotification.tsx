/**
 * Toast Notification Component
 *
 * Displays in-app toast notifications for assumptions and execution events.
 * Phase 6.1 - Assumption Notifications
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Toast {
  id: string;
  type: 'assumption' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // Auto-dismiss after N milliseconds (0 = no auto-dismiss)
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'assumption':
        return 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 border-amber-400';
      case 'success':
        return 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 border-green-400';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500/90 to-amber-500/90 border-yellow-400';
      case 'error':
        return 'bg-gradient-to-r from-red-500/90 to-pink-500/90 border-red-400';
      default:
        return 'bg-gradient-to-r from-indigo-500/90 to-purple-500/90 border-indigo-400';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'assumption':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`pointer-events-auto transform transition-all duration-300 ease-out ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`w-96 border backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden ${getTypeStyles()}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                {toast.title}
              </h4>
              <p className="text-sm text-white/90">
                {toast.message}
              </p>

              {/* Action Button */}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    handleDismiss();
                  }}
                  className="mt-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded text-xs font-medium text-white transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        {toast.duration && toast.duration > 0 && (
          <div className="h-1 bg-white/20">
            <div
              className="h-full bg-white/40 transition-all ease-linear"
              style={{
                animation: `shrink ${toast.duration}ms linear`,
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
