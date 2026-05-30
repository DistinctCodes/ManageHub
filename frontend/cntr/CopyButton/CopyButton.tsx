import React, { useEffect, useRef, useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
}

const COPY_TIMEOUT_MS = 2000;

export default function CopyButton({
  text,
  label = 'Copy',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const fallbackCopy = (value: string) => {
    const textarea = document.createElement('textarea');

    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);

    textarea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }

      setCopied(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, COPY_TIMEOUT_MS);
    } catch {
      fallbackCopy(text);

      setCopied(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, COPY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={copyToClipboard}
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? (
        <>
          ✓ Copied!
        </>
      ) : (
        label
      )}
    </button>
  );
}