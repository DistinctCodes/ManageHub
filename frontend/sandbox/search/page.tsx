"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck2,
  Users,
  Search,
  ArrowRight,
} from "lucide-react";

type Category = "Workspaces" | "Bookings" | "Members";

interface SearchItem {
  id: string;
  category: Category;
  title: string;
  subtitle: string;
  href: string;
}

const MOCK_RESULTS: SearchItem[] = [
  {
    id: "w1",
    category: "Workspaces",
    title: "The Hive",
    subtitle: "Hot Desk - Downtown",
    href: "/sandbox/workspaces?q=The%20Hive",
  },
  {
    id: "w2",
    category: "Workspaces",
    title: "Focus Pod",
    subtitle: "Private Office - West Wing",
    href: "/sandbox/workspaces?q=Focus%20Pod",
  },
  {
    id: "w3",
    category: "Workspaces",
    title: "Collab Room",
    subtitle: "Meeting Room - Floor 2",
    href: "/sandbox/workspaces?q=Collab%20Room",
  },
  {
    id: "w4",
    category: "Workspaces",
    title: "Quiet Zone",
    subtitle: "Silent Workspace - Floor 1",
    href: "/sandbox/workspaces?q=Quiet%20Zone",
  },
  {
    id: "w5",
    category: "Workspaces",
    title: "Executive Suite",
    subtitle: "Private Suite - Floor 5",
    href: "/sandbox/workspaces?q=Executive%20Suite",
  },
  {
    id: "w6",
    category: "Workspaces",
    title: "Terrace Booth",
    subtitle: "Outdoor Booth - Terrace",
    href: "/sandbox/workspaces?q=Terrace%20Booth",
  },

  {
    id: "b1",
    category: "Bookings",
    title: "Booking BK-1042",
    subtitle: "The Hive - Today 4:30 PM",
    href: "/sandbox/bookings/new",
  },
  {
    id: "b2",
    category: "Bookings",
    title: "Booking BK-1077",
    subtitle: "Focus Pod - Tomorrow 9:00 AM",
    href: "/sandbox/bookings/new",
  },
  {
    id: "b3",
    category: "Bookings",
    title: "Booking BK-1112",
    subtitle: "Collab Room - Fri 11:00 AM",
    href: "/sandbox/bookings/new",
  },
  {
    id: "b4",
    category: "Bookings",
    title: "Booking BK-1148",
    subtitle: "Executive Suite - Mon 10:00 AM",
    href: "/sandbox/bookings/new",
  },
  {
    id: "b5",
    category: "Bookings",
    title: "Booking BK-1163",
    subtitle: "Quiet Zone - Mon 3:00 PM",
    href: "/sandbox/bookings/new",
  },
  {
    id: "b6",
    category: "Bookings",
    title: "Booking BK-1189",
    subtitle: "Terrace Booth - Tue 1:00 PM",
    href: "/sandbox/bookings/new",
  },

  {
    id: "m1",
    category: "Members",
    title: "Amina Yusuf",
    subtitle: "Product Designer",
    href: "/sandbox/members/amina-yusuf",
  },
  {
    id: "m2",
    category: "Members",
    title: "David Ojo",
    subtitle: "Software Engineer",
    href: "/sandbox/members/david-ojo",
  },
  {
    id: "m3",
    category: "Members",
    title: "Lara Mensah",
    subtitle: "Community Lead",
    href: "/sandbox/members/lara-mensah",
  },
  {
    id: "m4",
    category: "Members",
    title: "Kofi Nartey",
    subtitle: "Operations Manager",
    href: "/sandbox/members/kofi-nartey",
  },
  {
    id: "m5",
    category: "Members",
    title: "Ife Adeyemi",
    subtitle: "Marketing Specialist",
    href: "/sandbox/members/ife-adeyemi",
  },
  {
    id: "m6",
    category: "Members",
    title: "Simi Akpan",
    subtitle: "Finance Analyst",
    href: "/sandbox/members/simi-akpan",
  },
];

const GROUPS: Category[] = ["Workspaces", "Bookings", "Members"];

function getIcon(category: Category) {
  if (category === "Workspaces") return Building2;
  if (category === "Bookings") return CalendarCheck2;
  return Users;
}

export default function GlobalSearchSandboxPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      400,
    );
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debouncedQuery) {
      return MOCK_RESULTS;
    }

    const q = debouncedQuery.toLowerCase();
    return MOCK_RESULTS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    });
  }, [debouncedQuery]);

  const grouped = useMemo(() => {
    return {
      Workspaces: filtered
        .filter((item) => item.category === "Workspaces")
        .slice(0, 5),
      Bookings: filtered
        .filter((item) => item.category === "Bookings")
        .slice(0, 5),
      Members: filtered
        .filter((item) => item.category === "Members")
        .slice(0, 5),
    };
  }, [filtered]);

  const flatResults = useMemo(
    () => GROUPS.flatMap((group) => grouped[group]),
    [grouped],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  const navigateToActive = () => {
    const active = flatResults[activeIndex];
    if (active) {
      router.push(active.href);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flatResults.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + flatResults.length) % flatResults.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      navigateToActive();
    }
  };

  let cursor = -1;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <section>
        <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
        <p className="mt-1 text-sm text-gray-600">
          Search across workspaces, bookings, and members in one place.
        </p>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search workspaces, bookings, members..."
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none ring-0 transition focus:border-gray-900"
        />
      </div>

      <section className="space-y-4">
        {GROUPS.map((group) => {
          const rows = grouped[group];
          const Icon = getIcon(group);
          const seeAllHref = `/sandbox/${group.toLowerCase()}`;

          return (
            <div
              key={group}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">{group}</h2>
                <Link
                  href={seeAllHref}
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  See all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  No results in {group.toLowerCase()}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((item) => {
                    cursor += 1;
                    const rowIndex = cursor;
                    const isActive = rowIndex === activeIndex;

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onMouseEnter={() => setActiveIndex(rowIndex)}
                          className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition ${
                            isActive
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                          }`}
                        >
                          <span
                            className={`mt-0.5 rounded-md p-1 ${isActive ? "bg-white/20" : "bg-gray-100"}`}
                          >
                            <Icon
                              className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-600"}`}
                            />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">
                              {item.title}
                            </span>
                            <span
                              className={`block text-xs ${isActive ? "text-gray-200" : "text-gray-500"}`}
                            >
                              {item.subtitle}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
