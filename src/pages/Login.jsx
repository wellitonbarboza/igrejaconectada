import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/context/AuthContext.jsx';
import appLogo from '@/assets/church-logo.svg';

export default function Login() {
  const { user, signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      await signIn({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
    } catch (submitError) {
      setError(submitError?.message || 'Não foi possível entrar. Confira as credenciais e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-100 overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -right-24 h-96 w-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent 60%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-28 -left-20 h-96 w-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.20), transparent 60%)' }}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-9 shadow-2xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-100 bg-white shadow-lg overflow-hidden">
          <img src={appLogo} alt="Logo Igreja Conectada" className="h-16 w-16" />
        </div>

        <h1 className="ic-h1 text-center text-[26px] text-slate-900">Bem-vindo de volta</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Entre para gerenciar sua igreja e comunidade
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-700">
              E-mail
            </label>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="voce@igreja.com"
                className="h-full flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Senha
              </label>
              <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Esqueceu a senha?
              </a>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="h-full flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full h-12 text-[15px]" disabled={loading}>
            <Sparkles className="h-4 w-4" />
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3 w-3 text-green-600" />
            Conexão segura · Dados protegidos pela LGPD
          </div>
        </form>
      </div>
    </div>
  );
}
