import { memo, useState, type ChangeEvent, type FormEvent } from 'react';
import { sx } from '../lib/css';
import type { Profile } from '../content/types';
import { sendContact, type ContactForm } from '../lib/api';

interface Props {
  profile: Profile;
  copied: boolean;
  onCopy: () => void;
}

const year = new Date().getFullYear();
const EMPTY: ContactForm = { name: '', contact: '', message: '', website: '' };
const WA_TEXT = 'Hi Yongky, I’d like to talk about a project.';

export const Contact = memo(function Contact({ profile, copied, onCopy }: Props) {
  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const field = (k: keyof ContactForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    const problem = await sendContact(form);
    if (problem) {
      setError(problem);
      setState('idle');
    } else setState('sent');
  };
  const again = () => {
    setForm(EMPTY);
    setState('idle');
  };

  const copyLabel = copied ? 'COPIED ✓' : 'COPY';
  const firstName = form.name.trim().split(/\s+/)[0];
  const wa = profile.whatsapp ? `https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(WA_TEXT)}` : '';

  return (
    <section id="contact" style={sx(`position: relative; padding: 96px 0 40px; border-top: 1px solid #1C1C1C; display: flex; flex-direction: column; gap: 32px`)}>
    <span aria-hidden="true" className="dk-secret" style={sx(`position: absolute; left: 0; bottom: 120px; font-family: var(--mono); font-size: 12px`)}>{profile.secrets[2]}</span>
    <span className="dk-reveal" style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>05 · contact</span>
    <div style={sx(`display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 40px`)}>
    <div style={sx(`flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 32px`)}>
    <h2 className="dk-reveal" style={sx(`margin: 0; font-weight: 500; font-size: clamp(44px, 7vw, 96px); letter-spacing: -0.05em; line-height: 0.95`)}>{profile.contactHeadline[0]}<br /><span className="dk-sheen">{profile.contactHeadline[1]}</span></h2>
    <p style={sx(`margin: 0; max-width: 460px; font-size: 16px; line-height: 1.6; color: #A8A8A8`)}>{profile.availability}. Send a short brief with the form, or reach me directly.</p>
    <div style={sx(`display: flex; flex-wrap: wrap; gap: 10px`)}>
    <button type="button" onClick={onCopy} data-cursor="Copy" className="dk-solid dk-shine dk-mag" style={sx(`min-height: 52px; padding: 0 20px; border: 0; border-radius: 14px; background: #EDEDED; color: #070707; display: inline-flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500`)}>{profile.email} <span style={sx(`font-family: var(--mono); font-size: 12px; border-left: 1px solid #BDBDBD; padding-left: 12px`)}>{copyLabel}</span></button>
    {wa && (
    <a href={wa} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 1px solid #262626; font-size: 15px; text-decoration: none`)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7L4 20z"/><path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1-1.2 2 .9-.4 1.6c-3.8.3-7.7-3.6-7.4-7.4l1.6-.4.9 2-1.2 1z"/></svg>WhatsApp</a>
    )}
    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 1px solid #262626; font-size: 15px; text-decoration: none`)}>LinkedIn</a>
    <a href={profile.github} target="_blank" rel="noreferrer" className="dk-ghost dk-shine dk-mag" style={sx(`display: inline-flex; align-items: center; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 1px solid #262626; font-size: 15px; text-decoration: none`)}>GitHub</a>
    </div>
    </div>

    <div style={sx(`flex: 1 1 360px; min-width: 0`)}>
    {state === 'sent' ? (
    <div className="dk-form dk-form-done" role="status">
    <span style={sx(`font-family: var(--mono); font-size: 11px; letter-spacing: .04em; color: #8A8A8A`)}>MESSAGE SENT ✓</span>
    <p style={sx(`margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.3`)}>Thanks{firstName ? `, ${firstName}` : ''}. I’ll reply to {form.contact.trim()} within a day.</p>
    <button type="button" onClick={again} className="dk-ghost" style={sx(`align-self: flex-start; min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #262626; background: transparent; color: #EDEDED; font-size: 14px`)}>Send another</button>
    </div>
    ) : (
    <form className="dk-form" onSubmit={submit} aria-label="Start a project">
    <div style={sx(`display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px`)}>
    <span style={sx(`font-size: 20px; font-weight: 600; letter-spacing: -0.02em`)}>Start a project</span>
    <span style={sx(`font-size: 14px; color: #9A9A9A`)}>Tell me what you’re building. I usually reply within a day.</span>
    </div>
    <label>NAME<input name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={field('name')} placeholder="Your name" /></label>
    <label>EMAIL OR WHATSAPP<input name="contact" autoComplete="email" required maxLength={160} value={form.contact} onChange={field('contact')} placeholder="you@company.com or +62…" /></label>
    <label>WHAT DO YOU WANT TO BUILD?<textarea name="message" required minLength={10} maxLength={4000} value={form.message} onChange={field('message')} placeholder="A short brief: the problem, who it’s for, any deadline." /></label>
    {/* Hidden from people; bots that fill every field give themselves away here. */}
    <div className="dk-trap" aria-hidden="true"><label>WEBSITE<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={field('website')} /></label></div>
    {error && (<p role="alert" style={sx(`margin: 0; font-size: 14px; line-height: 1.5; color: #FFFFFF`)}>{error} You can also email <a href={`mailto:${profile.email}`} style={sx(`color: #EDEDED`)}>{profile.email}</a>.</p>)}
    <button type="submit" disabled={state === 'sending'} className="dk-solid dk-shine" style={sx(`min-height: 52px; border: 0; border-radius: 14px; background: #EDEDED; color: #070707; font-size: 15px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 8px; opacity: ${state === 'sending' ? 0.6 : 1}`)}>{state === 'sending' ? 'Sending…' : 'Send message'}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    </form>
    )}
    </div>
    </div>
    <footer style={sx(`margin-top: 48px; padding-top: 20px; border-top: 1px solid #1C1C1C; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>
    <span>© {year} {profile.name}</span><span>⌘K to search · ` for terminal · pull the cord</span>
    </footer>
    </section>
  );
});
