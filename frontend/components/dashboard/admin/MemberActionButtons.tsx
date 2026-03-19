"use client";
import { useState } from "react";
import { Member } from "@/lib/types/member";
import { ActionConfirmationModal } from "./ActionConfirmationModal";
import { MemberAction } from "@/lib/react-query/hooks/useMemberMutations";

export function MemberActionButtons({ member }: { member: Member }) {
  const [modal, setModal] = useState<{ open: boolean; action: MemberAction | null }>({
    open: false,
    action: null,
  });
  if (["ADMIN", "SUPER_ADMIN"].includes(member.role)) return <span className="text-gray-300 italic">Read-only</span>;

  const open = (action: MemberAction) => setModal({ open: true, action });

  return (
    <>
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wider">
        {member.status === "ACTIVE" ? (
          <>
            <button
              type="button"
              onClick={() => open("SUSPEND")}
              className="text-red-500 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Suspend
            </button>
            <button
              type="button"
              onClick={() => open(member.role === "USER" ? "PROMOTE" : "DEMOTE")}
              className="text-gray-900 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              {member.role === "USER" ? "Promote" : "Demote"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => open("ACTIVATE")}
            className="text-emerald-600 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Activate
          </button>
        )}
      </div>
      {modal.open && modal.action && (
        <ActionConfirmationModal 
          isOpen={modal.open} 
          onClose={() => setModal({ ...modal, open: false })} 
          member={member} 
          action={modal.action} 
        />
      )}
    </>
  );
}