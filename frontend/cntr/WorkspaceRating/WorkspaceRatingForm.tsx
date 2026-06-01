import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface Props { workspaceId: string; bookingId: string; onSubmit: (r: { score: 1|2|3|4|5; comment: string }) => void; }

export function WorkspaceRatingForm({ onSubmit }: Props) {
  const [score, setScore] = useState<1|2|3|4|5|0>(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {([1,2,3,4,5] as const).map((s) => (
          <button key={s} type="button" onClick={() => setScore(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
            <Star size={24} className={(hover || score) >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
          </button>
        ))}
      </div>
      <div>
        <textarea maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
          className="w-full border rounded p-2 text-sm" rows={3} placeholder="Leave a comment (optional)" />
        <p className="text-xs text-muted-foreground text-right">{comment.length} / 500</p>
      </div>
      <button disabled={score === 0} onClick={() => onSubmit({ score: score as 1|2|3|4|5, comment })}
        className="btn-primary disabled:opacity-50">Submit Review</button>
    </div>
  );
}