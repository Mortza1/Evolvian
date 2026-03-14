'use client';

import { useState, useCallback } from 'react';
import { agentService } from '@/lib/services/agents/agent.service';
import type { Agent, AgentCreateRequest, KnowledgeEntry, SeniorityLevel } from '@/lib/services/agents/types';

// ─── Available models ────────────────────────────────────────────────────────
const MODELS = [
  { id: '', label: 'Default (team setting)', group: 'Default' },
  { id: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6', group: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6', group: 'Anthropic' },
  { id: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5', group: 'Anthropic' },
  { id: 'openai/gpt-4o', label: 'GPT-4o', group: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', group: 'OpenAI' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', group: 'DeepSeek' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', group: 'Google' },
];

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string; description: string; color: string }[] = [
  {
    value: 'specialist',
    label: 'Specialist',
    description: 'Deep domain knowledge. Called for authoritative answers in their field. Never delegates — they are the final word.',
    color: '#BF8A52',
  },
  {
    value: 'practitioner',
    label: 'Practitioner',
    description: 'Executes tasks end-to-end. Can use tools, asks clarifying questions when needed, stays in their lane.',
    color: '#5A9E8F',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Orchestrates work across agents. Delegates sub-tasks, asks the right questions, and ensures quality across the team.',
    color: '#9E7ABF',
  },
];

// ─── Tab definitions ─────────────────────────────────────────────────────────
type Tab = 'identity' | 'intelligence' | 'knowledge' | 'delegation';

const TABS: { id: Tab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'delegation', label: 'Delegation' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface AgentDevModalProps {
  teamId: number;
  teamAgents: Agent[];       // other agents on team — for delegation selection
  agent?: Agent;             // if editing an existing agent
  onClose: () => void;
  onSaved: (agent: Agent) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AgentDevModal({
  teamId,
  teamAgents,
  agent,
  onClose,
  onSaved,
}: AgentDevModalProps) {
  const isEditing = !!agent;

  // ── Form state ──
  const [tab, setTab] = useState<Tab>('identity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Identity
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [specialty, setSpecialty] = useState(agent?.specialty ?? '');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? []);
  const [traitInput, setTraitInput] = useState('');
  const [traits, setTraits] = useState<string[]>(agent?.personality_traits ?? []);
  const [costPerHour, setCostPerHour] = useState(String(agent?.cost_per_hour ?? '12'));

  // Intelligence
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '');
  const [modelId, setModelId] = useState(agent?.model_id ?? '');
  const [seniority, setSeniority] = useState<SeniorityLevel>(agent?.seniority_level ?? 'practitioner');
  const [canAskQuestions, setCanAskQuestions] = useState(agent?.can_ask_questions ?? false);

  // Knowledge Base
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>(agent?.knowledge_base ?? []);
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');

  // Delegation
  const [canDelegate, setCanDelegate] = useState(agent?.can_delegate ?? false);
  const [delegatesTo, setDelegatesTo] = useState<number[]>(agent?.delegates_to ?? []);

  // ── Helpers ──
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const addTrait = () => {
    const t = traitInput.trim();
    if (t && !traits.includes(t)) setTraits([...traits, t]);
    setTraitInput('');
  };
  const removeTrait = (t: string) => setTraits(traits.filter((x) => x !== t));

  const addKbEntry = () => {
    if (!kbTitle.trim() || !kbContent.trim()) return;
    const entry: KnowledgeEntry = {
      id: Date.now().toString(),
      title: kbTitle.trim(),
      content: kbContent.trim(),
      type: 'text',
    };
    setKbEntries([...kbEntries, entry]);
    setKbTitle('');
    setKbContent('');
  };
  const removeKbEntry = (id: string) => setKbEntries(kbEntries.filter((e) => e.id !== id));

  const toggleDelegate = (agentId: number) => {
    setDelegatesTo((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!name.trim() || !role.trim()) {
      setError('Name and Role are required.');
      setTab('identity');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: AgentCreateRequest = {
        team_id: teamId,
        name: name.trim(),
        role: role.trim(),
        specialty: specialty.trim(),
        cost_per_hour: parseFloat(costPerHour) || 12,
        skills,
        personality_traits: traits,
        system_prompt: systemPrompt.trim() || undefined,
        model_id: modelId || undefined,
        seniority_level: seniority,
        can_ask_questions: canAskQuestions,
        can_delegate: canDelegate,
        delegates_to: delegatesTo,
        knowledge_base: kbEntries,
      };

      let saved: Agent;
      if (isEditing && agent) {
        saved = await agentService.updateAgent(agent.id, payload as Partial<Agent>);
      } else {
        saved = await agentService.createAgent(payload);
      }
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save agent.');
    } finally {
      setSaving(false);
    }
  }, [
    teamId, name, role, specialty, costPerHour, skills, traits,
    systemPrompt, modelId, seniority, canAskQuestions,
    canDelegate, delegatesTo, kbEntries, isEditing, agent, onSaved,
  ]);

  const otherAgents = teamAgents.filter((a) => a.id !== agent?.id);
  const selectedSeniority = SENIORITY_OPTIONS.find((s) => s.value === seniority)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,14,17,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex h-[680px] w-full max-w-[820px] flex-col overflow-hidden rounded-xl border"
        style={{ background: '#0B1215', borderColor: '#162025', fontFamily: "'Syne', sans-serif" }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-7 py-5"
          style={{ borderColor: '#162025' }}
        >
          <div>
            <p
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="mb-0.5 text-[10px] uppercase tracking-widest text-[#3A5056]"
            >
              {isEditing ? 'edit agent' : 'new agent'}
            </p>
            <h2
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
              className="text-[18px] text-[#EAE6DF]"
            >
              {isEditing ? agent.name : 'Configure Agent'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border text-[#3A5056] transition-colors hover:text-[#EAE6DF]"
            style={{ borderColor: '#1E2D30' }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center gap-1 border-b px-7 pt-3"
          style={{ borderColor: '#162025' }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="mb-[-1px] px-3 pb-3 text-[12px] transition-colors"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: tab === t.id ? '#5A9E8F' : '#3A5056',
                borderBottom: tab === t.id ? '2px solid #5A9E8F' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 py-6 scrollbar-hide">

          {/* ── IDENTITY ── */}
          {tab === 'identity' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name *">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Brand Strategist"
                    className="input-base"
                  />
                </Field>
                <Field label="Role *">
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Brand Strategist"
                    className="input-base"
                  />
                </Field>
              </div>

              <Field label="Specialty">
                <input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Value Proposition & Brand Voice"
                  className="input-base"
                />
              </Field>

              <Field label="Cost per hour ($)">
                <input
                  type="number"
                  value={costPerHour}
                  onChange={(e) => setCostPerHour(e.target.value)}
                  placeholder="12"
                  className="input-base w-32"
                />
              </Field>

              <Field label="Skills">
                <div className="flex gap-2">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Add a skill and press Enter"
                    className="input-base flex-1"
                  />
                  <button onClick={addSkill} className="btn-ghost px-3 text-[11px]">Add</button>
                </div>
                <TagList tags={skills} onRemove={removeSkill} color="#5A9E8F" />
              </Field>

              <Field label="Personality Traits">
                <div className="flex gap-2">
                  <input
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrait(); } }}
                    placeholder="e.g. strategic, direct, data-driven"
                    className="input-base flex-1"
                  />
                  <button onClick={addTrait} className="btn-ghost px-3 text-[11px]">Add</button>
                </div>
                <TagList tags={traits} onRemove={removeTrait} color="#BF8A52" />
              </Field>
            </div>
          )}

          {/* ── INTELLIGENCE ── */}
          {tab === 'intelligence' && (
            <div className="space-y-6">

              {/* Seniority Level */}
              <Field label="Seniority Level">
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {SENIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSeniority(opt.value);
                        if (opt.value === 'specialist') { setCanDelegate(false); setCanAskQuestions(false); }
                        if (opt.value === 'manager') { setCanDelegate(true); setCanAskQuestions(true); }
                      }}
                      className="relative rounded-lg border p-4 text-left transition-all"
                      style={{
                        background: seniority === opt.value ? `${opt.color}10` : '#0F1A1D',
                        borderColor: seniority === opt.value ? `${opt.color}50` : '#1E2D30',
                      }}
                    >
                      <div
                        className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: opt.color }}
                      >
                        {opt.label}
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#4A6A72' }}>
                        {opt.description}
                      </p>
                      {seniority === opt.value && (
                        <div
                          className="absolute right-3 top-3 h-2 w-2 rounded-full"
                          style={{ background: opt.color }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </Field>

              {/* System Prompt */}
              <Field label="System Prompt">
                <p className="mb-2 text-[11px]" style={{ color: '#3A5056', fontFamily: "'IBM Plex Mono', monospace" }}>
                  This is injected directly into every LLM call this agent makes. Be explicit about expertise, reasoning style, and constraints.
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={8}
                  placeholder={`You are a Brand Strategist specialising in B2B SaaS positioning.\n\nYour expertise:\n- Defining value propositions for technical products\n- Competitive differentiation in crowded markets\n- Translating complex features into buyer language\n\nAlways ground recommendations in market evidence. Be direct and opinionated.`}
                  className="input-base w-full resize-none"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: '1.6' }}
                />
              </Field>

              {/* Model */}
              <Field label="Model">
                <p className="mb-2 text-[11px]" style={{ color: '#3A5056', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Choose a specific LLM for this agent. Specialists benefit from more capable models; high-volume agents can use cheaper ones.
                </p>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="input-base w-full"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </Field>

              {/* Flags */}
              <div className="flex flex-col gap-3">
                <Toggle
                  label="Can ask clarifying questions"
                  description="Before a workflow starts, this agent surfaces questions it needs answered to do its job well."
                  checked={canAskQuestions}
                  onChange={setCanAskQuestions}
                  disabled={seniority === 'specialist'}
                />
              </div>
            </div>
          )}

          {/* ── KNOWLEDGE BASE ── */}
          {tab === 'knowledge' && (
            <div className="space-y-5">
              <div
                className="rounded-lg border p-4"
                style={{ background: '#0F1A1D', borderColor: '#1E2D30' }}
              >
                <p
                  className="mb-4 text-[11px] leading-relaxed"
                  style={{ color: '#4A6A72', fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Knowledge entries are retrieved and injected into this agent's prompt at execution time.
                  Add company information, domain guidelines, reference material, or any context this agent
                  needs to do great work.
                </p>

                <div className="space-y-3">
                  <Field label="Entry Title">
                    <input
                      value={kbTitle}
                      onChange={(e) => setKbTitle(e.target.value)}
                      placeholder="e.g. Company Overview, Brand Guidelines, Target Market"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Content">
                    <textarea
                      value={kbContent}
                      onChange={(e) => setKbContent(e.target.value)}
                      rows={5}
                      placeholder="Paste or write the content here…"
                      className="input-base w-full resize-none"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: '1.6' }}
                    />
                  </Field>
                  <button
                    onClick={addKbEntry}
                    disabled={!kbTitle.trim() || !kbContent.trim()}
                    className="btn-primary text-[12px] disabled:opacity-40"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>

              {kbEntries.length > 0 && (
                <div className="space-y-2">
                  <p
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="text-[10px] uppercase tracking-widest text-[#3A5056]"
                  >
                    {kbEntries.length} {kbEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
                  {kbEntries.map((entry, idx) => (
                    <div
                      key={entry.id ?? idx}
                      className="flex items-start gap-3 rounded-lg border p-4"
                      style={{ background: '#0B1215', borderColor: '#1E2D30' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                          className="text-[13px] text-[#EAE6DF]"
                        >
                          {entry.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#3A5056]">
                          {entry.content}
                        </p>
                      </div>
                      <button
                        onClick={() => removeKbEntry(entry.id)}
                        className="shrink-0 text-[#2E4248] transition-colors hover:text-[#9E5A5A]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {kbEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border"
                    style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                  >
                    <svg className="h-5 w-5 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[13px] text-[#3A5056]">
                    No knowledge entries yet
                  </p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 text-[11px] text-[#2A3E44]">
                    Add context this agent needs to do great work
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── DELEGATION ── */}
          {tab === 'delegation' && (
            <div className="space-y-5">
              <div
                className="rounded-lg border p-4"
                style={{ background: '#0F1A1D', borderColor: '#1E2D30' }}
              >
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: '#4A6A72', fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Delegation lets this agent spin up sub-tasks handled by other agents on your team.
                  Only <span style={{ color: '#9E7ABF' }}>Manager</span>-level agents should delegate.
                  <span style={{ color: '#BF8A52' }}> Specialists</span> should never delegate — they're called for focused knowledge.
                </p>
              </div>

              <Toggle
                label="Can delegate to other agents"
                description="This agent can assign work to agents listed below during execution."
                checked={canDelegate}
                onChange={(v) => {
                  setCanDelegate(v);
                  if (!v) setDelegatesTo([]);
                }}
                disabled={seniority === 'specialist'}
                disabledReason="Specialists cannot delegate."
              />

              {canDelegate && (
                <div className="space-y-2">
                  <p
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="text-[10px] uppercase tracking-widest text-[#3A5056]"
                  >
                    Agents this agent may call
                  </p>

                  {otherAgents.length === 0 ? (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#2A3E44]">
                      No other agents on the team yet. Add more agents first.
                    </p>
                  ) : (
                    otherAgents.map((a) => {
                      const selected = delegatesTo.includes(a.id);
                      const senOpt = SENIORITY_OPTIONS.find((s) => s.value === (a.seniority_level ?? 'practitioner'));
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleDelegate(a.id)}
                          className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all"
                          style={{
                            background: selected ? '#0F1E1B' : '#0B1215',
                            borderColor: selected ? '#5A9E8F30' : '#1E2D30',
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                            style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                          >
                            <span
                              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5A9E8F' }}
                              className="text-[14px]"
                            >
                              {a.name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[13px] text-[#EAE6DF]">
                                {a.name}
                              </p>
                              {senOpt && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    color: senOpt.color,
                                    background: `${senOpt.color}15`,
                                  }}
                                >
                                  {senOpt.label}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#3A5056]">{a.role}</p>
                          </div>

                          <div
                            className="h-4 w-4 shrink-0 rounded border flex items-center justify-center"
                            style={{
                              background: selected ? '#5A9E8F' : 'transparent',
                              borderColor: selected ? '#5A9E8F' : '#2E4248',
                            }}
                          >
                            {selected && (
                              <svg className="h-2.5 w-2.5 text-[#0B1215]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between border-t px-7 py-4"
          style={{ borderColor: '#162025' }}
        >
          <div className="flex-1">
            {error && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#9E5A5A]">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-ghost text-[12px] px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-[12px] px-5 py-2 disabled:opacity-40 flex items-center gap-2"
            >
              {saving && (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </div>
      </div>

      {/* Shared CSS-in-JS via style tag */}
      <style>{`
        .input-base {
          width: 100%;
          border-radius: 6px;
          border: 1px solid #1E2D30;
          background: #0F1A1D;
          padding: 8px 12px;
          font-size: 13px;
          color: #D8D4CC;
          outline: none;
          transition: border-color 0.15s;
          font-family: 'Syne', sans-serif;
        }
        .input-base:focus { border-color: #5A9E8F50; }
        .input-base::placeholder { color: #2E4248; }
        .btn-ghost {
          border-radius: 6px;
          border: 1px solid #1E2D30;
          background: transparent;
          color: #4A6A72;
          transition: all 0.15s;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
        }
        .btn-ghost:hover { background: #111A1D; color: #EAE6DF; }
        .btn-primary {
          border-radius: 6px;
          border: 1px solid #5A9E8F40;
          background: #5A9E8F18;
          color: #5A9E8F;
          transition: all 0.15s;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
        }
        .btn-primary:hover { background: #5A9E8F28; border-color: #5A9E8F70; }
        select.input-base option { background: #0F1A1D; color: #D8D4CC; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#3A5056]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TagList({ tags, onRemove, color }: { tags: string[]; onRemove: (t: string) => void; color: string }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px]"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            borderColor: `${color}30`,
            color,
            background: `${color}10`,
          }}
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 transition-all ${disabled ? 'opacity-40' : ''}`}
      style={{ background: '#0F1A1D', borderColor: '#1E2D30' }}
    >
      <div className="flex-1">
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[13px] text-[#EAE6DF]">
          {label}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 text-[11px] text-[#3A5056]">
          {disabled && disabledReason ? disabledReason : description}
        </p>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative mt-0.5 shrink-0 h-5 w-9 rounded-full transition-all"
        style={{ background: checked && !disabled ? '#5A9E8F' : '#1E2D30' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
          style={{
            background: '#EAE6DF',
            left: checked && !disabled ? '18px' : '2px',
          }}
        />
      </button>
    </div>
  );
}
