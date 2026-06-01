import React, { useState } from 'react';

interface MemberRow { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'BANNED'; joinedAt: string; }
interface Props { members: MemberRow[]; onRoleChange: (id: string, role: 'USER' | 'ADMIN') => void; onBan: (id: string) => void; onUnban: (id: string) => void; }

export function AdminMemberTable({ members, onRoleChange, onBan, onUnban }: Props) {
  const [confirmBan, setConfirmBan] = useState<string | null>(null);
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b"><th className="text-left py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id} className="border-b">
            <td className="py-2">{m.name}</td>
            <td>{m.email}</td>
            <td><select value={m.role} onChange={(e) => onRoleChange(m.id, e.target.value as 'USER' | 'ADMIN')}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></td>
            <td><span className={m.status === 'BANNED' ? 'text-red-600 font-bold' : ''}>{m.status}</span></td>
            <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
            <td>
              {m.status === 'BANNED' ? (
                <button onClick={() => onUnban(m.id)}>Unban</button>
              ) : confirmBan === m.id ? (
                <button className="text-red-600" onClick={() => { onBan(m.id); setConfirmBan(null); }}>Confirm Ban</button>
              ) : (
                <button onClick={() => setConfirmBan(m.id)}>Ban</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}