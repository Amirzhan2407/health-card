import { createContext, useContext, useEffect, useState } from "react";
import api, { setInMemoryToken } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        // Try calling /me. The axios response interceptor will auto-attempt /refresh
        // if the inMemoryToken is empty but the httpOnly refresh cookie is valid.
        const res = await api.get("/auth/me");
        if (res.data?.success && res.data?.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        console.log("No active session found.");
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen for unauthorized events from api.js to auto-logout
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (loginVal, password) => {
    try {
      const res = await api.post("/auth/login", { login: loginVal, password });
      if (res.data?.success) {
        setInMemoryToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Ошибка входа в систему.");
    }
  };

  const loginEds = async (signature, payload) => {
    try {
      const res = await api.post("/auth/login-eds", { signature, payload });
      if (res.data?.success) {
        if (res.data.needRegister) {
          // Patient needs registration with this ECP cert details
          return { success: true, needRegister: true, details: res.data };
        }
        setInMemoryToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Ошибка авторизации по ЭЦП.");
    }
  };

  const registerPatient = async (data) => {
    try {
      const res = await api.post("/auth/register", data);
      if (res.data?.success) {
        setInMemoryToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Ошибка регистрации.");
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed, clearing client state anyway.");
    } finally {
      setInMemoryToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginEds,
    registerPatient,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
