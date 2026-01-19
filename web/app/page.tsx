'use client';

import { useState, useEffect } from 'react';
import AuthPage from '@/components/auth/AuthPage';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import Dashboard from '@/components/dashboard/Dashboard';

type AppState = 'auth' | 'onboarding' | 'dashboard';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const validateAndAutoLogin = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        // Validate token by making a request to the backend
        const response = await fetch('http://localhost:8000/api/teams', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          // Token is valid, proceed with auto-login
          const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
          if (!hasSeenOnboarding) {
            setAppState('onboarding');
          } else {
            setAppState('dashboard');
          }
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('has_seen_onboarding');
          setAppState('auth');
        }
      } catch (error) {
        // Network error or invalid token
        console.error('Token validation failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('has_seen_onboarding');
        setAppState('auth');
      }
    };

    validateAndAutoLogin();
  }, []);

  const handleAuthSuccess = (email?: string) => {
    // Check if user should see onboarding
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');

    // Show onboarding for new users or specific demo email
    if (!hasSeenOnboarding || email === 'aa@gmail.com') {
      setIsFirstTimeUser(true);
      setAppState('onboarding');
    } else {
      setAppState('dashboard');
    }
  };

  const handleOnboardingComplete = () => {
    // Mark onboarding as seen
    localStorage.setItem('has_seen_onboarding', 'true');
    setIsFirstTimeUser(false);
    setAppState('dashboard');
  };

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('has_seen_onboarding');

    // Clear any other cached data
    localStorage.removeItem('teams_cache');

    // Reset to auth state
    setAppState('auth');
    setIsFirstTimeUser(false);
  };

  if (appState === 'auth') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (appState === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard isFirstTime={isFirstTimeUser} onLogout={handleLogout} />;
}
