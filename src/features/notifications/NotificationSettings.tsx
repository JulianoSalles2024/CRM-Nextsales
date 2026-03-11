import { safeError } from '@/src/utils/logger';
import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Send } from 'lucide-react';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yQv4Q2ECjmyQ2av4h8pI3yEXcyaebrzLz8Yp6IOvSAbD0jSoT5T4d9wX0U2y1bYaT_O1k';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const NotificationSettings: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSubscription = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    setIsSubscribed(!!subscription);
                } catch (e) {
                    safeError('Error checking for SW registration:', e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        setPermission(Notification.permission);
        checkSubscription();
    }, []);

    const handleSubscribe = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('As notificações Push não são suportadas por este navegador.');
            return;
        }

        const currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);

        if (currentPermission === 'granted') {
            setIsLoading(true);
            try {
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();
                if (existingSubscription) {
                    setIsSubscribed(true);
                    alert('As notificações push já estão ativadas.');
                    return;
                }

                await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });

                setIsSubscribed(true);
                alert('Notificações push ativadas com sucesso!');
            } catch (error) {
                safeError('Failed to subscribe to push notifications:', error);
                alert('Falha ao ativar notificações push.');
                setIsSubscribed(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleTestNotification = async () => {
        if (!isSubscribed) {
            alert('Você precisa ativar as notificações primeiro.');
            return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            registration.showNotification('Notificação de Teste CRM', {
                body: 'Se você pode ver isso, as notificações estão funcionando!',
            });
        }
    };

    const renderStatus = () => {
        if (isLoading) {
            return <p className="text-sm text-zinc-400">Verificando status...</p>;
        }
        if (permission === 'granted' && isSubscribed) {
            return <p className="text-sm text-green-400">As notificações push estão ativas.</p>;
        }
        if (permission === 'denied') {
            return <p className="text-sm text-red-400">As notificações foram bloqueadas. Você precisa habilitá-las nas configurações do seu navegador.</p>;
        }
        return <p className="text-sm text-zinc-400">As notificações push não estão ativas.</p>;
    };

    return (
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="p-6 border-b border-zinc-700">
                <h2 className="text-lg font-semibold text-white">Notificações Push</h2>
                <p className="text-sm text-zinc-400 mt-1">Receba alertas sobre tarefas e atualizações importantes.</p>
            </div>
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="font-medium text-white mb-2">Status Atual</h3>
                    {renderStatus()}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleSubscribe}
                        disabled={permission !== 'default' || isLoading || isSubscribed}
                        className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        <span>Ativar Notificações</span>
                    </button>
                    <button
                        onClick={handleTestNotification}
                        disabled={!isSubscribed || permission !== 'granted'}
                        className="flex-1 flex justify-center items-center gap-2 bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                        <span>Enviar Notificação de Teste</span>
                    </button>
                </div>
                {permission === 'denied' && (
                    <div className="p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm">
                        <p><strong>Ação necessária:</strong> Para reativar as notificações, você precisa acessar as configurações de site do seu navegador e permitir as notificações para esta página.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationSettings;
