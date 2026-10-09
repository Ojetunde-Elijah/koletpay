'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, MapPin, Building2, BadgeCheck } from 'lucide-react';
import { useKoletPay } from '@/lib/store';
import { errorMessage } from '@/lib/api';
import { useMeta } from '@/lib/meta';

function Field({ id, label, hint, icon, children, wide }: { id: string; label: string; hint?: string; icon?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`form-group${wide ? ' span-2' : ''}`}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="auth-input">
        {icon}
        {children}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useKoletPay();
  const meta = useMeta();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || '').trim();
    const password = String(f.get('password') || '');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setMessage('Password must be at least 8 characters with a letter and a number.');
      return;
    }
    if (password !== String(f.get('confirmPassword') || '')) {
      setMessage('Passwords do not match.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await register({
        ownerName: get('ownerName'),
        email: get('email'),
        phone: get('phone'),
        whatsapp: get('whatsapp'),
        password,
        businessName: get('businessName'),
        businessType: get('businessType'),
        category: get('category'),
        rcNumber: get('rcNumber'),
        state: get('state'),
        city: get('city'),
        address: get('address'),
      });
    } catch (err) {
      setMessage(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-inner">
          <Link href="/" className="auth-brand">
            <span className="brand-symbol">K</span>
            <span>KoletPay</span>
          </Link>

          <div className="auth-copy">
            <span className="auth-kicker">Business made simpler</span>
            <h1>Everything your business needs in one place.</h1>
            <p>
              Create invoices, send payment links, collect money into your own KoletPay account and track every
              customer from one simple workspace.
            </p>
          </div>

          <div className="auth-proof">
            <div className="auth-proof-card">
              <span>Your KoletPay account</span>
              <strong>A virtual account number for your business</strong>
              <small>Customer payments land in your KoletPay wallet and you withdraw to your bank.</small>
            </div>
            <div className="auth-proof-card">
              <span>Payment links</span>
              <strong>Send a link, get paid</strong>
              <small>Customers fill in their details, pay, and everything shows up on your side.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Link href="/" className="auth-brand">
              <span className="brand-symbol">K</span>
              <span>KoletPay</span>
            </Link>
          </div>

          <div className="auth-heading">
            <span className="eyebrow">Create account</span>
            <h2>Set up your business</h2>
            <p>It takes about two minutes. You get your KoletPay account number straight away.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-grid">
              <div className="auth-section">About you</div>
              <Field id="ownerName" label="Full name" icon={<UserRound size={17} />}>
                <input id="ownerName" name="ownerName" type="text" autoComplete="name" placeholder="Your full name" required />
              </Field>
              <Field id="phone" label="Phone number" hint="Nigerian mobile, e.g. 0803 123 4567" icon={<Phone size={17} />}>
                <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" required />
              </Field>
              <Field id="email" label="Email address" icon={<Mail size={17} />}>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              </Field>
              <Field id="whatsapp" label="WhatsApp number (optional)" icon={<Phone size={17} />}>
                <input id="whatsapp" name="whatsapp" type="tel" placeholder="Same as phone if blank" />
              </Field>

              <div className="auth-section">About your business</div>
              <Field id="businessName" label="Business name" icon={<span className="auth-input-letter">K</span>}>
                <input id="businessName" name="businessName" type="text" autoComplete="organization" placeholder="Your business name" required />
              </Field>
              <Field id="businessType" label="Business type" icon={<Building2 size={17} />}>
                <select id="businessType" name="businessType" required defaultValue="">
                  <option value="" disabled>{meta ? 'Choose a type' : 'Loading…'}</option>
                  {meta?.businessTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="category" label="What do you sell?" icon={<Building2 size={17} />}>
                <select id="category" name="category" required defaultValue="">
                  <option value="" disabled>{meta ? 'Choose a category' : 'Loading…'}</option>
                  {meta?.categories.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="rcNumber" label="CAC number (optional)" hint="RC / BN number if registered" icon={<BadgeCheck size={17} />}>
                <input id="rcNumber" name="rcNumber" type="text" placeholder="RC1234567" />
              </Field>
              <Field id="state" label="State" icon={<MapPin size={17} />}>
                <select id="state" name="state" required defaultValue="">
                  <option value="" disabled>{meta ? 'Choose your state' : 'Loading…'}</option>
                  {meta?.states.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="city" label="City / town" icon={<MapPin size={17} />}>
                <input id="city" name="city" type="text" placeholder="e.g. Ibadan" required />
              </Field>
              <Field id="address" label="Business address" icon={<MapPin size={17} />} wide>
                <input id="address" name="address" type="text" autoComplete="street-address" placeholder="Street, area" required />
              </Field>

              <div className="auth-section">Security</div>
              <Field id="password" label="Password" icon={<LockKeyhole size={17} />}>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="8+ characters, letter and number" required />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </Field>
              <Field id="confirmPassword" label="Confirm password" icon={<LockKeyhole size={17} />}>
                <input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat your password" required />
                <button type="button" className="auth-eye" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle password visibility">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </Field>
            </div>

            <label className="auth-terms">
              <input type="checkbox" required />
              <span>I agree to the KoletPay terms and privacy policy.</span>
            </label>

            <button type="submit" className="btn blue auth-submit" disabled={busy}>
              {busy ? 'Creating your account…' : 'Create account'}
              <ArrowRight size={16} />
            </button>

            {message && <p className="form-error" role="alert">{message}</p>}
          </form>

          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
