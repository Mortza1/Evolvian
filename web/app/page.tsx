'use client';

import { useState } from 'react';
import AuthPage from '@/components/auth/AuthPage';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import Dashboard from '@/components/dashboard/Dashboard';

type AppState = 'auth' | 'onboarding' | 'dashboard';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  const handleAuthSuccess = () => {
    // Skip onboarding and go straight to dashboard
    setAppState('dashboard');
  };

  const handleOnboardingComplete = () => {
    setIsFirstTimeUser(false);
    setAppState('dashboard');
  };

  if (appState === 'auth') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (appState === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard isFirstTime={!isFirstTimeUser} />;
}
