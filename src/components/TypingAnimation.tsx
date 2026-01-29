'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface TypingAnimationProps {
  /** Single text or array of texts to cycle through */
  texts: string | string[];
  className?: string;
  /** Interval between animations in ms (default: 30000 = 30s for 2x per minute) */
  intervalMs?: number;
}

export default function TypingAnimation({
  texts,
  className = '',
  intervalMs = 10000 // 10 seconds = 6 times per minute
}: TypingAnimationProps) {
  // Normalize to array
  const textArray = Array.isArray(texts) ? texts : [texts];

  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTypingAnimation = useCallback((textToType: string) => {
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setDisplayText('');
    let charIndex = 0;

    typingIntervalRef.current = setInterval(() => {
      if (charIndex <= textToType.length) {
        setDisplayText(textToType.slice(0, charIndex));
        charIndex++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
      }
    }, 80); // 80ms per character for smooth typing
  }, []);

  // Handle text cycling and animation
  useEffect(() => {
    const currentText = textArray[currentIndex];

    // Start typing the current text
    startTypingAnimation(currentText);

    // Schedule next text after interval
    restartTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % textArray.length);
    }, intervalMs);

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [currentIndex, textArray, intervalMs, startTypingAnimation]);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530); // Standard cursor blink rate

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className={className}>
      {displayText}
      <span
        className={`inline-block w-0.5 h-[1em] bg-current ml-1 transition-opacity duration-100 ${
          showCursor ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}
