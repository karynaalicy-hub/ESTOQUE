import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { Warehouse, Mail, KeyRound } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthError = (err: any) => {
    console.error("Authentication Error:", err);
    let message = 'Ocorreu um erro inesperado. Tente novamente.';
    switch (err.code) {
      case 'auth/operation-not-allowed':
        message = 'Cadastro por e-mail/senha desativado. Por favor, ative-o no Console do Firebase em: Authentication > Sign-in method.';
        break;
      case 'auth/invalid-email':
        message = 'O formato do e-mail é inválido.';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = 'E-mail ou senha incorretos.';
        break;
      case 'auth/email-already-in-use':
        message = 'Este e-mail já está cadastrado.';
        break;
      case 'auth/weak-password':
        message = 'A senha deve ter no mínimo 6 caracteres.';
        break;
    }
    setNotification({ type: 'error', message });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification({ type: '', message: '' });
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
            handleAuthError(err);
        } else if (err instanceof Error) {
            const errorMessage = err.message.toLowerCase();
            if (errorMessage.includes('api key') || errorMessage.includes('invalid-api-key')) {
                setNotification({ type: 'error', message: 'Erro de configuração: Sua chave de API do Firebase parece ser inválida. Verifique o arquivo firebaseConfig.ts.'});
            } else if (errorMessage.includes('network')) {
                setNotification({ type: 'error', message: 'Erro de rede. Verifique sua conexão com a internet e tente novamente.'});
            } else {
                setNotification({ type: 'error', message: `Ocorreu um erro: ${err.message}`});
            }
            console.error("Generic Error:", err);
        } else {
            setNotification({ type: 'error', message: 'Ocorreu um erro desconhecido.'});
            console.error("Unknown error object:", err);
        }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setNotification({ type: 'error', message: 'Por favor, digite seu e-mail para redefinir a senha.' });
      return;
    }
    setIsLoading(true);
    setNotification({ type: '', message: '' });
    try {
      await sendPasswordResetEmail(auth, email);
      setNotification({ type: 'success', message: 'Link para redefinição de senha enviado! Verifique seu e-mail.' });
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      if (error.code === 'auth/invalid-email') {
          setNotification({ type: 'error', message: 'O formato do e-mail é inválido.'});
      } else {
          setNotification({ type: 'error', message: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.'});
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const notificationColor = notification.type === 'error' ? 'text-red-600' : 'text-green-600';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center items-center mb-6">
          <Warehouse className="h-10 w-10 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-3">
            CONTEMPSICO
          </h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {isLogin ? 'Acessar Estoque' : 'Criar Conta'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
                <div className="flex items-center justify-between">
                    <label htmlFor="password"  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Senha
                    </label>
                     {isLogin && (
                        <button type="button" onClick={handlePasswordReset} className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300 focus:outline-none">
                           Esqueci minha senha?
                        </button>
                    )}
                </div>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {notification.message && <p className={`text-sm ${notificationColor} text-center`}>{notification.message}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
              >
                {isLoading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setNotification({ type: '', message: '' });
              }}
              className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
