import React, { useState } from 'react';
import { Church, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatError } from '@/utils';

export default function AdminAccess() {
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signIn({ password });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-2xl">
                <Church className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">Igreja Conectada</p>
                <h1 className="text-3xl font-bold mt-1">Acesso administrativo</h1>
              </div>
            </div>
            <p className="mt-8 text-white/80 leading-relaxed">
              Entrada exclusiva do administrador geral para manter o controle da plataforma e gerenciar todos os recursos.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm uppercase text-white/60 tracking-widest">Credencial padrão</p>
            <p className="text-white text-lg font-semibold">Senha 123456</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div>
            <p className="text-sm text-slate-500">Bem-vindo(a) 👋</p>
            <h2 className="text-2xl font-bold text-slate-900">Administrador geral</h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4 text-blue-500" />
              Acesso fixo para gestão completa.
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="admin_password">Senha</Label>
              <div className="mt-2 relative">
                <Input
                  id="admin_password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar como administrador'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
