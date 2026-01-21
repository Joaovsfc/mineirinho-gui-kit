import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';

interface User {
  id: number;
  username: string;
  email?: string;
  created_at?: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário do sessionStorage ao iniciar (não persiste após fechar)
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erro ao carregar usuário do sessionStorage:', error);
        sessionStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiService.login(username, password);
      if (response.success && response.user) {
        setUser(response.user);
        // Usar sessionStorage ao invés de localStorage para não persistir após fechar
        sessionStorage.setItem('user', JSON.stringify(response.user));
      } else {
        throw new Error('Login falhou');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    // Limpar também localStorage caso tenha algo antigo
    localStorage.removeItem('user');
  };

  const register = async (username: string, password: string, email?: string) => {
    try {
      const response = await apiService.register(username, password, email);
      if (response.success && response.user) {
        setUser(response.user);
        // Usar sessionStorage ao invés de localStorage para não persistir após fechar
        sessionStorage.setItem('user', JSON.stringify(response.user));
      } else {
        throw new Error('Registro falhou');
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

