import React from 'react';

interface Props { password: string; }

const LEVELS = [
  { label: 'Weak',   colour: 'bg-red-500' },
  { label: 'Fair',   colour: 'bg-orange-400' },
  { label: 'Good',   colour: 'bg-yellow-400' },
  { label: 'Strong', colour: 'bg-green-500' },
];

function getScore(password: string): number {
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[a-z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 0;
  if (score === 2) return 1;
  if (score === 3) return 2;
  return 3;
}

export const PasswordStrengthMeter: React.FC<Props> = ({ password }) => {
  if (!password) return null;
  const level = getScore(password);
  const { label, colour } = LEVELS[level];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {LEVELS.map((l, i) => (
          <div
            key={l.label}
            className={`h-1.5 flex-1 rounded ${i <= level ? colour : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
};