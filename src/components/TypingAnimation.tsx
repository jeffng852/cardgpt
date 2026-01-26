'use client';

import { useEffect, useState, useCallback } from 'react';

interface TypingAnimationProps {
  text: string;
  className?: string;
}

export default function TypingAnimation({ text, className = '' }: TypingAnimationProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  const startTypingAnimation = useCallback(() => {
    setDisplayText('');
    setIsTyping(true);

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 100); // 100ms per character for smooth typing

    return () => clearInterval(typingInterval);
  }, [text]);

  useEffect(() => {
    // Start animation on mount
    const cleanup = startTypingAnimation();

    // Restart animation every 1 minute (60000ms)
    const restartInterval = setInterval(() => {
      startTypingAnimation();
    }, 60000);

    return () => {
      cleanup();
      clearInterval(restartInterval);
    };
  }, [startTypingAnimation]);

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
