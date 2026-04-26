import React, { useState } from 'react';
import { Heart, Briefcase, Users, Plus, Phone, Mail, Calendar, MessageCircle, ChevronRight, Star, Clock, X } from 'lucide-react';

const MODES = {
  family: { label: 'Family', icon: Heart, color: '#E8636F', glow: 'rgba(232,99,111,0.15)' },
  business: { label: 'Business', icon: Briefcase, color: '#2A9D8F', glow: 'rgba(42,157,143,0.15)' },
  friends: { label: 'Friends', icon: Users, color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
};

const INITIAL_CONTACTS = {
  family: [
    { id: 1, name: 'S.J.', initials: 'SJ', role: 'Son', birthday: '03/10/2016', lastContact: '2 calls/week (court ordered)', notes: 'Turning 10. Loves BONDING. Sprout difficulty mode.', priority: 'core', status: 'limited' },
    { id: 2, name: 'W.J.', initials: 'WJ', role: 'Daughter', birthday: '08/08/2019', lastContact: '2 calls/week (court ordered)', notes: 'Age 6. Encopresis. Needs big visual feedback, fast wins. Seed mode.', priority: 'core', status: 'limited' },
    { id: 3, name: 'Brenda O\'Dell', initials: 'BO', role: 'Mother — ADA Support', email: 'brendaodell54@gmail.com', lastContact: 'Active', notes: 'Designated ADA support person for court. CC on all legal correspondence.', priority: 'core', status: 'active' },
  ],
  business: [
    { id: 10, name: 'Hunter McFeron', initials: 'HM', role: 'GA Tools for Life', email: 'hunter.mcferon@gatfl.gatech.edu', lastContact: 'Introduced', notes: 'Georgia Tech. AT resource. Potential NIDILRR connection.', priority: 'high', status: 'warm' },
    { id: 11, name: 'Linda Vo', initials: 'LV', role: 'NIDILRR — Switzer $80K', email: 'linda.vo@acl.hhs.gov', lastContact: 'Inquiry sent, no response', notes: 'Switzer Research Fellowship. Sent intro email.', priority: 'high', status: 'cold' },
    { id: 12, name: 'Dr. Holavanahalli', initials: 'RH', role: 'NIDILRR — FIP $250K/yr', email: 'radha.holavanahalli@acl.hhs.gov', lastContact: 'Inquiry sent, no response', notes: 'Field Initiated Projects. $250K/yr × 3. Sent intro.', priority: 'high', status: 'cold' },
    { id: 13, name: 'Robby Allen', initials: 'RA', role: 'Former Supervisor', lastContact: 'SF-3112B signed', notes: 'TRIREFFAC Kings Bay. Signed supervisor statement for FERS disability.', priority: 'medium', status: 'complete' },
  ],
  friends: [
    { id: 20, name: 'Tyler', initials: 'TY', role: 'Beta Tester — Mesh', lastContact: 'Active', notes: 'Tailscale mesh. Family: Ashley, Link, Judah. BONDING multiplayer testing partner.', priority: 'core', status: 'active' },
  ],
};

function StatusDot({ status }) {
  const colors = {
    active: '#22c55e', warm: '#eab308', cold: '#6b7280',
    limited: '#E8636F', complete: '#2A9D8F'
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[status] || '#6b7280' }} />
      <span className="text-[10px] uppercase tracking-wider" style={{ color: colors[status] || '#6b7280' }}>{status}</span>
    </div>
  );
}

function ContactCard({ contact, modeColor }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border transition-all cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: expanded ? `${modeColor}40` : 'rgba(255,255,255,0.06)' }}
      onClick={() => setExpanded(!expanded)}>
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: `${modeColor}20`, border: `1px solid ${modeColor}30` }}>
          {contact.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{contact.name}</span>
            {contact.priority === 'core' && <Star className="w-3 h-3 flex-shrink-0" style={{ color: modeColor }} />}
          </div>
          <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{contact.role}</div>
        </div>
        <StatusDot status={contact.status} />
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Mail className="w-3 h-3" /> {contact.email}
            </a>
          )}
          {contact.birthday && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Calendar className="w-3 h-3" /> {contact.birthday}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Clock className="w-3 h-3" /> {contact.lastContact}
          </div>
          {contact.notes && (
            <div className="text-xs leading-relaxed p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)' }}>
              {contact.notes}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all hover:brightness-110"
                style={{ background: `${modeColor}15`, color: modeColor, border: `1px solid ${modeColor}30` }}>
                <Mail className="w-3 h-3" /> Email
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function P31Connect() {
  const [mode, setMode] = useState('family');
  const modeConfig = MODES[mode];
  const contacts = INITIAL_CONTACTS[mode] || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080810', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 flex items-center justify-between"
        style={{ background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: modeConfig.color, boxShadow: `0 0 10px ${modeConfig.glow}` }} />
          <span className="font-extrabold text-sm text-white tracking-tight">P31 CONNECT</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {contacts.length} contacts
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="flex gap-2 p-4 pb-0">
        {Object.entries(MODES).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const active = mode === key;
          return (
            <button key={key} onClick={() => setMode(key)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: active ? `${cfg.color}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? `${cfg.color}40` : 'rgba(255,255,255,0.06)'}`,
                color: active ? cfg.color : 'rgba(255,255,255,0.3)',
              }}>
              <Icon className="w-4 h-4" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Contact List */}
      <div className="flex-1 p-4 space-y-2">
        {contacts.map(c => (
          <ContactCard key={c.id} contact={c} modeColor={modeConfig.color} />
        ))}

        {contacts.length === 0 && (
          <div className="text-center py-16 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No contacts in this category yet.
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="text-lg font-black text-white">{INITIAL_CONTACTS.family.length}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: MODES.family.color }}>Family</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="text-lg font-black text-white">{INITIAL_CONTACTS.business.length}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: MODES.business.color }}>Business</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="text-lg font-black text-white">{INITIAL_CONTACTS.friends.length}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: MODES.friends.color }}>Friends</div>
          </div>
        </div>
      </div>

      <style>{`
        html, body, #root, [data-artifact] { background: #080810 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
