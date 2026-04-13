'use client'

import { useState } from 'react'
import { Plus, Radio } from 'lucide-react'

interface Props {
  farms: any[]
  mills: any[]
  contacts: any[]
  shared: any[]
  messages: any[]
}

export function HubView({ farms, mills, contacts, shared, messages }: Props) {
  const [tab, setTab] = useState<'farms' | 'mills' | 'shared'>('farms')
  const [selectedFarm, setSelectedFarm] = useState(0)
  const [selectedMill, setSelectedMill] = useState(0)

  const connectedFarms = farms.filter((f) => f.feedflow_client_id)
  const disconnectedFarms = farms.filter((f) => !f.feedflow_client_id)

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text">Hub</h1>
          <p className="text-base text-text-faint mt-1">Share formulas, communicate with farms and mills</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm"><Plus size={14} /> Add Contact</button>
          <button className="btn btn-primary btn-sm">Share Formula</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4">
        {[
          { key: 'farms', label: '🏠 Farms' },
          { key: 'mills', label: '🏭 Mills' },
          { key: 'shared', label: '📤 Shared Formulas' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all
              ${tab === t.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shared' && (
        <div>
          {shared.length > 0 ? shared.map((s) => (
            <div key={s.id} className="card p-4 mb-2.5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-base font-bold text-text-dim">{s.formula?.name || 'Formula'}</span>
                <span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">v{s.formula_version}</span>
              </div>
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-surface-deep rounded-md">
                <span className="text-base">{s.shared_with_type === 'farm' ? '🏠' : '🏭'}</span>
                <span className="text-sm text-text-dim font-semibold">{s.shared_with_contact}</span>
                <span className="text-xs text-text-ghost">· {new Date(s.shared_at).toLocaleDateString()}</span>
                <span className={`ml-auto text-2xs px-1.5 py-0.5 rounded font-bold font-mono
                  ${s.status === 'viewed' ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            </div>
          )) : (
            <div className="card p-12 text-center text-sm text-text-ghost">
              No formulas shared yet. Select a formula and share it with a farm or mill contact.
            </div>
          )}
        </div>
      )}

      {tab === 'farms' && (
        <div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{ height: 'calc(100vh - 240px)' }}>
          <div className="bg-surface-card border-r border-border overflow-auto">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Connected Farms</span>
            </div>
            {connectedFarms.map((f, i) => (
              <div
                key={f.id}
                onClick={() => setSelectedFarm(i)}
                className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors
                  ${selectedFarm === i ? 'bg-brand/5 border-l-[3px] border-l-brand' : 'hover:bg-[#253442]'}`}
              >
                <div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]" />
                <div>
                  <div className="text-base font-semibold text-text-dim">{f.name}</div>
                  <div className="text-2xs text-text-ghost">{f.location}</div>
                </div>
              </div>
            ))}
            {disconnectedFarms.length > 0 && (
              <>
                <div className="px-4 py-3 border-t border-border">
                  <span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Not Connected</span>
                </div>
                {disconnectedFarms.map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5 px-4 py-3 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-text-ghost" />
                    <div>
                      <div className="text-base font-semibold text-text-dim">{f.name}</div>
                      <div className="text-2xs text-text-ghost">{f.location}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="bg-surface-bg overflow-auto p-5">
            {connectedFarms.length > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]" />
                  <div>
                    <div className="text-xl font-bold text-text">{connectedFarms[selectedFarm]?.name}</div>
                    <div className="text-xs text-text-ghost">{connectedFarms[selectedFarm]?.contact_name} · {connectedFarms[selectedFarm]?.location}</div>
                  </div>
                </div>
                <div className="card p-8 text-center text-sm text-text-ghost">
                  Farm detail view — consumption data, shared formulas, and messages will appear here when FeedFlow is connected.
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-text-ghost">
                No connected farms. Connect a farm via FeedFlow to start sharing.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'mills' && (
        <div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{ height: 'calc(100vh - 240px)' }}>
          <div className="bg-surface-card border-r border-border overflow-auto">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Feed Mills</span>
            </div>
            {mills.length > 0 ? mills.map((m, i) => (
              <div
                key={m.id}
                onClick={() => setSelectedMill(i)}
                className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors
                  ${selectedMill === i ? 'bg-brand/5 border-l-[3px] border-l-brand' : 'hover:bg-[#253442]'}`}
              >
                <div className={`w-2 h-2 rounded-full ${m.connected ? 'bg-brand shadow-[0_0_6px_#4CAF7D60]' : 'bg-status-amber shadow-[0_0_6px_#D4A84360]'}`} />
                <div>
                  <div className="text-base font-semibold text-text-dim">{m.name}</div>
                  <div className="text-2xs text-text-ghost">{m.location}</div>
                </div>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-text-ghost">No mills added yet.</div>
            )}
          </div>
          <div className="bg-surface-bg overflow-auto p-5">
            {mills.length > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]" />
                  <div>
                    <div className="text-xl font-bold text-text">{mills[selectedMill]?.name}</div>
                    <div className="text-xs text-text-ghost">{mills[selectedMill]?.location}</div>
                  </div>
                </div>
                <div className="card p-8 text-center text-sm text-text-ghost">
                  Mill contacts, shared formulas, and messaging will appear here.
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">🏭</div>
                <div className="text-base font-bold text-text-dim mb-2">Add your first mill</div>
                <div className="text-sm text-text-ghost mb-4 max-w-sm mx-auto">Connect with feed mills to share formula specs and communicate with sales reps.</div>
                <button className="btn btn-primary">Add Mill</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
