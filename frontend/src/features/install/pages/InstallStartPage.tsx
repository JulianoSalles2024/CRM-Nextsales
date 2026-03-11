import React, { useState } from 'react';
import { User, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { useInstall } from '../context/InstallContext';

const generatePassword = (): string => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let p = '';
  for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 2; i++) p += nums[Math.floor(Math.random() * nums.length)];
  return p;
};

const inputClass =
  'w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

const inputErrorClass =
  'w-full bg-slate-700/50 border border-red-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200';

const inputOkClass =
  'w-full bg-slate-700/50 border border-green-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200';

const CSS = `
  @keyframes iz-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .iz-fade-in { animation: iz-fade-in 0.45s ease-out both; }
`;

export default function InstallStartPage() {
  const { setState } = useInstall();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const rules = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: '1 letra', ok: /[A-Za-z]/.test(password) },
    { label: '1 número', ok: /\d/.test(password) },
  ];
  const passwordValid = rules.every(r => r.ok);
  const confirmValid = confirm === password && password.length > 0;
  const canSubmit = nameValid && emailValid && passwordValid && confirmValid;

  const handleSuggest = () => {
    const p = generatePassword();
    setPassword(p);
    setConfirm(p);
    setShowPassword(true);
    setShowConfirm(true);
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ adminName: name.trim(), adminEmail: email.trim(), adminPassword: password });
    window.location.href = '/install/vercel';
  };

  const confirmInputClass =
    confirm.length === 0 ? inputClass : confirmValid ? inputOkClass : inputErrorClass;

  return (
    <>
      <style>{CSS}</style>

      {/* Full-screen container — igual às outras telas do wizard */}
      <div
        className="min-h-screen w-full relative flex flex-col items-center justify-center px-4 py-12 overflow-hidden"
        style={{ background: '#020617' }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(0,140,255,0.2) 0%, transparent 58%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 iz-fade-in flex flex-col items-center text-center w-full max-w-md mx-auto">

          {/* Badge */}
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-8">
            Capítulo 1 de 4
          </span>

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6">
            <User className="w-8 h-8 text-blue-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Quem é você?</h1>
          <p className="text-sm text-slate-400 mb-10">
            Crie a conta do administrador principal do CRM Zenius.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4 text-left" noValidate>

            {/* Name */}
            <div>
              <label htmlFor="install-name" className="block text-sm font-medium text-slate-300 mb-1.5">
                Nome completo
              </label>
              <input
                id="install-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="install-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                E-mail
              </label>
              <input
                id="install-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@suaempresa.com"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="install-password" className="text-sm font-medium text-slate-300">
                  Senha
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSuggest}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sugerir
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!password}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  id="install-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password rules */}
              <div className="flex gap-4 mt-2">
                {rules.map(r => (
                  <span key={r.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.ok ? 'bg-green-400' : 'bg-slate-600'}`} />
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="install-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="install-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className={confirmInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm.length > 0 && !confirmValid && (
                <div className="mt-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  As senhas não coincidem.
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Continuar →
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
