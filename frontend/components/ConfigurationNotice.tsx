import React from 'react';
import { Database, Code, Link } from 'lucide-react';

const ConfigurationNotice: React.FC = () => {
    const codeSnippet = `
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// TODO: Replace with your project's credentials
const supabaseUrl = 'SUA_URL_AQUI'
const supabaseAnonKey = 'SUA_CHAVE_ANON_AQUI'

// ...
    `;

    return (
        <div className="flex items-center justify-center h-screen w-full bg-zinc-900 text-gray-300 p-4">
            <div className="w-full max-w-2xl bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-900/50 mb-4">
                    <Database className="h-6 w-6 text-violet-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Configuração do Backend Necessária</h1>
                <p className="text-zinc-400 mb-6">
                    Para que o CRM funcione, você precisa conectá-lo a um banco de dados Supabase.
                </p>

                <div className="text-left space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 text-white font-bold">1</div>
                        <div>
                            <h3 className="font-semibold text-white">Crie um projeto no Supabase</h3>
                            <p className="text-sm text-zinc-400">
                                Se você ainda não tem uma conta, crie uma em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">supabase.com</a>. É gratuito para começar.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 text-white font-bold">2</div>
                        <div>
                            <h3 className="font-semibold text-white">Encontre suas chaves de API</h3>
                            <p className="text-sm text-zinc-400">
                                No painel do seu projeto, vá para <span className="font-mono bg-zinc-700 px-1 rounded">Project Settings</span> &gt; <span className="font-mono bg-zinc-700 px-1 rounded">API</span>. Você precisará da <span className="font-bold text-white">URL do Projeto</span> e da Chave Pública <span className="font-bold text-white">(anon key)</span>.
                            </p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 text-white font-bold">3</div>
                        <div>
                            <h3 className="font-semibold text-white">Adicione as credenciais ao código</h3>
                            <p className="text-sm text-zinc-400 mb-3">
                                Abra o seguinte arquivo no seu editor de código e cole os valores que você copiou:
                            </p>
                            <code className="block w-full text-left p-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-violet-300">
                                services/supabaseClient.ts
                            </code>
                            <pre className="mt-2 w-full text-left p-4 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 overflow-x-auto">
                                <code>
                                    {codeSnippet.trim()}
                                </code>
                            </pre>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-zinc-500">
                    Após salvar o arquivo, a aplicação será recarregada automaticamente.
                </p>
            </div>
        </div>
    );
};

export default ConfigurationNotice;