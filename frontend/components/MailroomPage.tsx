import React, { useState } from 'react';

interface MailItem {
  id: string;
  memberName: string;
  packageName: string;
  status: 'received' | 'notified' | 'picked-up';
  receivedAt: Date;
}

export const MailroomPage: React.FC = () => {
  const [mailItems, setMailItems] = useState<MailItem[]>([
    {
      id: '1',
      memberName: 'John Doe',
      packageName: 'Package A',
      status: 'received',
      receivedAt: new Date(),
    },
  ]);

  const markAsPickedUp = (id: string) => {
    setMailItems(
      mailItems.map(item =>
        item.id === id ? { ...item, status: 'picked-up' } : item
      )
    );
  };

  return (
    <div className="mailroom-container">
      <h2>Mailroom Management</h2>
      <div className="mail-list">
        {mailItems.map(item => (
          <div key={item.id} className="mail-item">
            <div className="mail-info">
              <h3>{item.memberName}</h3>
              <p>Package: {item.packageName}</p>
              <p>Status: {item.status}</p>
            </div>
            {item.status !== 'picked-up' && (
              <button onClick={() => markAsPickedUp(item.id)}>
                Mark Picked Up
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
