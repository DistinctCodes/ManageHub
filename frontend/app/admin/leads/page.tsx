'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AlertTriangle } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const STAGES = ['NEW', 'CONTACTED', 'TOURED', 'NEGOTIATING', 'WON', 'LOST'] as const;
type Stage = typeof STAGES[number];

interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  stage: Stage;
}

// Narrow an unknown API payload into Lead[] instead of trusting r.json()
// blindly — an unexpected shape (e.g. an error object, or a stage value
// outside STAGES) would otherwise silently produce a broken board.
function isLead(value: unknown): value is Lead {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.email === 'string' &&
    typeof v.source === 'string' &&
    typeof v.stage === 'string' &&
    (STAGES as readonly string[]).includes(v.stage)
  );
}

function parseLeads(data: unknown): Lead[] {
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response shape from /leads');
  }
  return data.filter(isLead);
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Tracks which lead cards currently have an in-flight stage update, so a
  // second change can't be fired on the same card before the first resolves
  // and each card can show its own disabled/pending state.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fetchLeads = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${BASE_URL}/leads`, {
        credentials: 'include',
        signal,
      });
      if (!res.ok) {
        throw new Error(`Failed to load leads (status ${res.status})`);
      }
      const data = await res.json();
      setLeads(parseLeads(data));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load leads.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(controller.signal);
    return () => controller.abort();
  }, [fetchLeads, reloadToken]);

  const updateStage = async (id: string, stage: Stage) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage || pendingIds.has(id)) return;

    const previousStage = lead.stage;
    setActionError(null);
    setPendingIds((prev) => new Set(prev).add(id));

    // Optimistic update: reflect the change immediately, then roll back if
    // the request fails, instead of only updating state after a successful
    // response (which previously also meant a *failed* PATCH left the old,
    // correct value shown with no indication anything went wrong).
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage } : l))
    );

    try {
      const res = await fetch(`${BASE_URL}/leads/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update ${lead.name}'s stage (status ${res.status})`);
      }
    } catch (err) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, stage: previousStage } : l))
      );
      setActionError(
        err instanceof Error ? err.message : `Failed to update ${lead.name}'s stage.`
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
    );
  }, [leads, search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Leads CRM</h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or source…"
          aria-label="Search leads"
          className="border rounded-md text-sm px-3 py-1.5 w-64 max-w-full"
        />
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="ml-auto text-xs font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className="min-w-[200px] space-y-2">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-3" />
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl border border-gray-100 bg-gray-50 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-10 h-10 text-red-200 mb-4" />
          <p className="text-sm font-medium text-gray-700">Couldn&apos;t load leads</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadToken((t) => t + 1)}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            return (
              <div key={stage} className="min-w-[200px]">
                <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                  <span>{stage}</span>
                  <span className="text-xs font-normal text-gray-400">
                    {stageLeads.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {stageLeads.map((lead) => {
                    const isPending = pendingIds.has(lead.id);
                    return (
                      <Card key={lead.id} className="cursor-pointer">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-sm">{lead.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-1">
                          <p>{lead.email}</p>
                          <p className="italic">{lead.source}</p>
                          <select
                            className="w-full mt-1 border rounded text-xs p-1 disabled:opacity-50"
                            value={lead.stage}
                            disabled={isPending}
                            onChange={(e) => updateStage(lead.id, e.target.value as Stage)}
                            aria-label={`Change stage for ${lead.name}`}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {isPending && (
                            <p className="text-[10px] text-gray-400">Updating…</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {stageLeads.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      {search ? 'No matches' : 'Empty'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}