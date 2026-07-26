'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const STAGES = ['NEW', 'CONTACTED', 'TOURED', 'NEGOTIATING', 'WON', 'LOST'] as const;
type Stage = typeof STAGES[number];

interface Lead {
  id: string; name: string; email: string; source: string; stage: Stage;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/leads`, { credentials: 'include' })
      .then(r => r.json()).then(setLeads).finally(() => setLoading(false));
  }, []);

  const updateStage = async (id: string, stage: Stage) => {
    await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
  };

  if (loading) return <p className="p-8">Loading leads…</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Leads CRM</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage} className="min-w-[200px]">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">{stage}</h2>
            <div className="space-y-2">
              {leads.filter(l => l.stage === stage).map(lead => (
                <Card key={lead.id} className="cursor-pointer">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">{lead.name}</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-1">
                    <p>{lead.email}</p>
                    <p className="italic">{lead.source}</p>
                    <select
                      className="w-full mt-1 border rounded text-xs p-1"
                      value={lead.stage}
                      onChange={e => updateStage(lead.id, e.target.value as Stage)}
                      aria-label={`Change stage for ${lead.name}`}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </CardContent>
                </Card>
              ))}
              {leads.filter(l => l.stage === stage).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}