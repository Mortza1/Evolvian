'use client';

import { useEffect, useState, useRef } from 'react';

interface RollingDigitProps {
  value: number;
  decimals?: number;
  className?: string;
}

export default function RollingDigit({ value, decimals = 2, className = '' }: RollingDigitProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isRolling, setIsRolling] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsRolling(true);

      // Animate the number change
      const duration = 300;
      const steps = 20;
      const stepTime = duration / steps;
      const increment = (value - displayValue) / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(value);
          setIsRolling(false);
          clearInterval(interval);
        } else {
          setDisplayValue(prev => prev + increment);
        }
      }, stepTime);

      prevValueRef.current = value;

      return () => clearInterval(interval);
    }
  }, [value, displayValue]);

  const formattedValue = displayValue.toFixed(decimals);
  const [integerPart, decimalPart] = formattedValue.split('.');

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      {/* Integer part */}
      <span className={`inline-block ${isRolling ? 'animate-roll-digit' : ''}`}>
        {integerPart}
      </span>

      {/* Decimal separator */}
      {decimals > 0 && (
        <>
          <span className="mx-[1px]">.</span>

          {/* Decimal part */}
          <span className={`inline-block ${isRolling ? 'animate-roll-digit' : ''}`}>
            {decimalPart}
          </span>
        </>
      )}
    </span>
  );
}
