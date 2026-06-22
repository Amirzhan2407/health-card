
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, {
  setInMemoryToken,
} from "../api/api";

const AuthContext = createContext(null);

function getErrorMessage(
  error,
  fallbackMessage
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const response = await api.get(
          "/auth/me"
        );

        if (
          isMounted &&
          response.data?.success &&
          response.data?.user
        ) {
          setUser(response.data.user);
        }
      } catch {
        if (isMounted) {
          setInMemoryToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    function handleUnauthorized() {
      setInMemoryToken(null);
      setUser(null);
    }

    restoreSession();

    window.addEventListener(
      "unauthorized",
      handleUnauthorized
    );

    return () => {
      isMounted = false;

      window.removeEventListener(
        "unauthorized",
        handleUnauthorized
      );
    };
  }, []);


async function login(
  loginValue,
  password,
  organizationBin = null
) {
  try {
    const response = await api.post(
      "/auth/login",
      {
        login: String(loginValue || "").trim(),

        password: String(password || ""),

        organizationBin: organizationBin
          ? String(organizationBin)
              .replace(/\D/g, "")
              .slice(0, 12)
          : null,
      }
    );

    if (
      !response.data?.success ||
      !response.data?.accessToken ||
      !response.data?.user
    ) {
      throw new Error(
        response.data?.message ||
          "Не удалось выполнить вход."
      );
    }

    setInMemoryToken(
      response.data.accessToken
    );

    setUser(response.data.user);

    return {
      success: true,
      user: response.data.user,
      message: response.data.message,
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Ошибка входа в систему."
      )
    );
  }
}



  async function requestRegistrationCode(
    registrationData
  ) {
    try {
      const response = await api.post(
        "/auth/register/request-code",
        {
          username: String(
            registrationData?.username || ""
          ).trim(),

          email: String(
            registrationData?.email || ""
          )
            .trim()
            .toLowerCase(),

          fullName: String(
            registrationData?.fullName || ""
          ).trim(),

          password:
            registrationData?.password || "",

          confirmPassword:
            registrationData?.confirmPassword ||
            "",

          preferredLanguage:
            registrationData
              ?.preferredLanguage || "ru",
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Не удалось отправить код."
        );
      }

      return {
        success: true,
        message: response.data.message,
        expiresInSeconds:
          response.data
            .expiresInSeconds || 600,
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          error,
          "Не удалось отправить код подтверждения."
        )
      );
    }
  }

  async function confirmRegistration(
    email,
    code
  ) {
    try {
      const response = await api.post(
        "/auth/register/confirm",
        {
          email: String(email || "")
            .trim()
            .toLowerCase(),

          code: String(code || "").trim(),
        }
      );

      if (
        !response.data?.success ||
        !response.data?.accessToken ||
        !response.data?.user
      ) {
        throw new Error(
          response.data?.message ||
            "Не удалось завершить регистрацию."
        );
      }

      setInMemoryToken(
        response.data.accessToken
      );

      setUser(response.data.user);

      return {
        success: true,
        user: response.data.user,
        message: response.data.message,
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          error,
          "Ошибка подтверждения регистрации."
        )
      );
    }
  }

  async function resendRegistrationCode(
    email
  ) {
    try {
      const response = await api.post(
        "/auth/register/resend-code",
        {
          email: String(email || "")
            .trim()
            .toLowerCase(),
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Не удалось отправить новый код."
        );
      }

      return {
        success: true,
        message: response.data.message,
        expiresInSeconds:
          response.data
            .expiresInSeconds || 600,
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          error,
          "Не удалось повторно отправить код."
        )
      );
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      console.warn(
        "Сервер не подтвердил выход. Локальная сессия очищена."
      );
    } finally {
      setInMemoryToken(null);
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      requestRegistrationCode,
      confirmRegistration,
      resendRegistrationCode,
      logout,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider."
    );
  }

  return context;
}

