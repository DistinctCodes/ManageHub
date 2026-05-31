import React from 'react';
import { Inbox } from 'lucide-react';

interface Action {
  label: string;
  onClick: () => void;
}

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: Action;
}

export const EmptyState: React.FC<Props> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="mb-4 text-gray-400">
      {icon ?? <Inbox size={48} aria-hidden="true" />}
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        {action.label}
      </button>
    )}
  </div>
);