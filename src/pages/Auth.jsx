import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { Church, Lock, Mail, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatError } from '@/utils';

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'usuario',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError('');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'login') {
        await signIn({ email: formData.email, password: formData.password });
      } else {
        if (!formData.full_name) {
          throw new Error('Informe o nome completo.');
        }
        const createdUser = await signUp(formData);
        if (!createdUser) {
          setError('Cadastro realizado. Confirme seu e-mail para acessar.');
        }
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const from = location.state?.from?.pathname || '/';

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-2xl">
                <Church className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">Igreja Conectada</p>
                <h1 className="text-3xl font-bold mt-1">Gestão e cuidado pastoral</h1>
              </div>
            </div>
            <p className="mt-8 text-white/80 leading-relaxed">
              Centralize o cadastro da sua igreja, acompanhe membros e mantenha o corpo organizado com uma experiência digital
              pensada para equipes administrativas e líderes voluntários.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm uppercase text-white/60 tracking-widest">Recursos principais</p>
            <ul className="space-y-2 text-white">
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4" /> Acesso seguro por níveis de permissão
              </li>
              <li className="flex items-center gap-2">
                <User className="w-4 h-4" /> Gestão completa de membros e líderes
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Configuração da identidade da igreja
              </li>
            </ul>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500">Bem-vindo(a) 👋</p>
              <h2 className="text-2xl font-bold text-slate-900">
                {mode === 'login' ? 'Acesse sua conta' : 'Crie seu acesso'}
              </h2>
            </div>
            <Button variant="outline" onClick={toggleMode}>
              {mode === 'login' ? 'Quero me cadastrar' : 'Já tenho conta'}
            </Button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <div className="mt-2 relative">
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(event) => handleChange('full_name', event.target.value)}
                    required
                  />
                  <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email">E-mail</Label>
              <div className="mt-2 relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  required
                />
                <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="mt-2 relative">
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  required
                />
                <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <Label htmlFor="role">Nível de acesso</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Processando...'
                : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
