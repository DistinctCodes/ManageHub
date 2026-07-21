"use client";

interface CompletenessItem {
  label: string;
  completed: boolean;
  href?: string;
}

interface Props {
  completeness: number;
  items: CompletenessItem[];
}

export function ProfileCompleteness({ completeness, items }: Props) {
  const pct = Math.min(100, Math.max(0, completeness));

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Profile Completeness</h3>
        <span className="text-sm font-bold text-blue-600">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  ✓
                </span>
                <span className="text-gray-600">{item.label}</span>
              </>
            ) : (
              <>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  ○
                </span>
                {item.href ? (
                  <a href={item.href} className="text-blue-600 hover:underline">
                    {item.label}
                  </a>
                ) : (
                  <span className="text-gray-400">{item.label}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
