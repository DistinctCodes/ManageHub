import { notFound } from "next/navigation";

type Badge = { id: string; name: string };
type Member = {
  id: string;
  name: string;
  photo: string;
  memberSince: string;
  streak: number;
  totalCheckIns: number;
  badges: Badge[];
};

const MOCK_MEMBERS: Record<string, Member> = {
  "1": {
    id: "1",
    name: "Alex Rivera",
    photo: "https://i.pravatar.cc/150?u=1",
    memberSince: "2024-03-01",
    streak: 14,
    totalCheckIns: 87,
    badges: [
      { id: "b1", name: "Early Bird" },
      { id: "b2", name: "30-Day Streak" },
      { id: "b3", name: "Top Contributor" },
    ],
  },
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function formatMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MemberProfilePage({ params }: { params: { id: string } }) {
  const member = MOCK_MEMBERS[params.id];
  if (!member) notFound();

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.photo} alt={member.name} className="h-16 w-16 rounded-full object-cover" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm text-gray-400">Member since {formatMemberSince(member.memberSince)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard label="Check-in Streak" value={`${member.streak} days`} />
        <StatCard label="Total Check-ins" value={member.totalCheckIns} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Badges Earned</h2>
        <div className="flex flex-wrap gap-2">
          {member.badges.map((b) => (
            <span key={b.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {b.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
