import React, { useState, FormEvent } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';

interface RegisterProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onNavigateToLogin: () => void;
  error: string | null;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onNavigateToLogin, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    await onRegister(name, email, password);
    setIsRegistering(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center items-center gap-3 mb-8">
            <PanelLeft className="w-8 h-8 text-violet-500" />
            <h1 className="text-3xl font-bold text-gray-100">CRM <span className="text-violet-400">Fity AI</span></h1>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center text-white mb-2">Crie sua conta</h2>
          <p className="text-center text-zinc-400 mb-6 text-sm">Preencha os dados para começar.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
             <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
                Nome Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="password"className="block text-sm font-medium text-zinc-300 mb-1">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={isRegistering}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRegistering ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center text-sm text-zinc-400">
            <p>
                Já tem uma conta?{' '}
                <button onClick={onNavigateToLogin} className="font-semibold text-violet-400 hover:text-violet-300">
                    Faça login
                </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;