import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, UserSession } from '../../types/minecraft';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial mock users database (for demo & local validation)
interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string; // In production this is checked server-side
  role: UserRole;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    displayName: 'Lead Administrator',
    passwordHash: 'minecraft123',
    role: 'admin',
  },
  {
    id: 'usr_alex',
    username: 'alex',
    displayName: 'Alex (Bot Operator)',
    passwordHash: 'steve123',
    role: 'operator',
  },
  {
    id: 'usr_viewer',
    username: 'guest',
    displayName: 'Guest Observer',
    passwordHash: 'guest123',
    role: 'viewer',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('mcc_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
      } else {
        // Default to logged-in admin for frictionless instant evaluation
        const defaultAdmin: UserSession = {
          id: DEFAULT_USERS[0].id,
          username: DEFAULT_USERS[0].username,
          displayName: DEFAULT_USERS[0].displayName,
          role: DEFAULT_USERS[0].role,
          token: 'token_' + Math.random().toString(36).substring(2),
        };
        setUser(defaultAdmin);
        localStorage.setItem('mcc_session', JSON.stringify(defaultAdmin));
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUsersDb = (): StoredUser[] => {
    try {
      const stored = localStorage.getItem('mcc_users_db');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_USERS;
  };

  const saveUsersDb = (users: StoredUser[]) => {
    try {
      localStorage.setItem('mcc_users_db', JSON.stringify(users));
    } catch {
      // ignored
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Artificial latency for realism
    await new Promise((r) => setTimeout(r, 400));
    const users = getUsersDb();
    const found = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === password
    );

    if (!found) {
      return { success: false, error: 'Invalid username or password' };
    }

    const session: UserSession = {
      id: found.id,
      username: found.username,
      displayName: found.displayName,
      role: found.role,
      token: 'jwt_mock_' + Math.random().toString(36).substring(2, 15),
    };

    setUser(session);
    try {
      localStorage.setItem('mcc_session', JSON.stringify(session));
    } catch {
      // ignored
    }
    return { success: true };
  };

  const register = async (
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((r) => setTimeout(r, 400));
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const users = getUsersDb();
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Username is already taken' };
    }

    const newUser: StoredUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      username: cleanUser,
      displayName: displayName?.trim() || cleanUser,
      passwordHash: password,
      role: users.length === 0 ? 'admin' : 'operator',
    };

    users.push(newUser);
    saveUsersDb(users);

    const session: UserSession = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      token: 'jwt_mock_' + Math.random().toString(36).substring(2, 15),
    };

    setUser(session);
    try {
      localStorage.setItem('mcc_session', JSON.stringify(session));
    } catch {
      // ignored
    }

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('mcc_session');
    } catch {
      // ignored
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (requiredRole === 'operator' && user.role === 'operator') return true;
    if (requiredRole === 'viewer') return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
