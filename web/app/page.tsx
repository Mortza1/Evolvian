'use client';

import { useState, useEffect } from 'react';
import AuthPage from '@/components/auth/AuthPage';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import Dashboard from '@/components/dashboard/Dashboard';
import LandingPage from '@/components/landing/LandingPage';

type AppState = 'landing' | 'auth' | 'onboarding' | 'dashboard';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing');
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
          const teams = await response.json();
          const hasTeams = Array.isArray(teams) && teams.length > 0;
          const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');

          if (hasTeams || hasSeenOnboarding) {
            // User already set up — go straight to dashboard
            if (!hasSeenOnboarding) localStorage.setItem('has_seen_onboarding', 'true');
            setAppState('dashboard');
          } else {
            setAppState('onboarding');
          }
        } else {
          // Token is invalid, clear it — stay on landing
          localStorage.removeItem('access_token');
          localStorage.removeItem('has_seen_onboarding');
        }
      } catch (error) {
        // Network error or invalid token — stay on landing
        console.error('Token validation failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('has_seen_onboarding');
      }
    };

    validateAndAutoLogin();
  }, []);

  const handleAuthSuccess = (email?: string, isNewUser?: boolean) => {
    if (isNewUser) {
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

    // Reset to landing state
    setAppState('landing');
    setIsFirstTimeUser(false);
  };

  if (appState === 'landing') {
    return <LandingPage onGetStarted={() => setAppState('auth')} />;
  }

  if (appState === 'auth') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} onBack={() => setAppState('landing')} />;
  }

  if (appState === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard isFirstTime={isFirstTimeUser} onLogout={handleLogout} />;
}
