
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
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

function normalizeUser(userData) {
  if (!userData) {
    return null;
  }

  return {
    ...userData,

    fullName:
      userData.fullName ||
      userData.full_name ||
      "",

    iin:
      userData.iin ||
      "",

    birthDate:
      userData.birthDate ||
      userData.birth_date ||
      null,

    gender:
      userData.gender ||
      null,

    email:
      userData.email ||
      "",

    preferredLanguage:
      userData.preferredLanguage ||
      userData.preferred_language ||
      "ru",

    organizationId:
      userData.organizationId ||
      userData.organization_id ||
      null,
  };
}

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const response =
          await api.get("/auth/me");

        if (
          isMounted &&
          response.data?.success &&
          response.data?.user
        ) {
          setUser(
            normalizeUser(
              response.data.user
            )
          );
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

  /*
   * Пациент входит по ИИН.
   * Сотрудники входят по логину.
   * Администратор входит по логину и БИН.
   */
  async function login(
    loginValue,
    password,
    organizationBin = null,
    loginType = "patient"
  ) {
    try {
      const normalizedLoginType =
        [
          "patient",
          "staff",
          "organization_admin",
        ].includes(loginType)
          ? loginType
          : "patient";

      const normalizedLogin =
        normalizedLoginType ===
        "patient"
          ? String(
              loginValue || ""
            )
              .replace(/\D/g, "")
              .slice(0, 12)
          : String(
              loginValue || ""
            ).trim();

      const response =
        await api.post(
          "/auth/login",
          {
            login:
              normalizedLogin,

            loginType:
              normalizedLoginType,

            password: String(
              password || ""
            ),

            organizationBin:
              normalizedLoginType ===
                "organization_admin" &&
              organizationBin
                ? String(
                    organizationBin
                  )
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

      const nextUser =
        normalizeUser(
          response.data.user
        );

      setUser(nextUser);

      return {
        success: true,
        user: nextUser,
        message:
          response.data.message,
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

  /*
   * При регистрации пациента логин больше
   * не передаётся. ИИН становится данными
   * для входа пациента.
   */
  async function requestRegistrationCode(
    registrationData
  ) {
    try {
      const response =
        await api.post(
          "/auth/register/request-code",
          {
            fullName: String(
              registrationData
                ?.fullName || ""
            )
              .trim()
              .replace(/\s+/g, " "),

            iin: String(
              registrationData?.iin ||
                ""
            )
              .replace(/\D/g, "")
              .slice(0, 12),

            birthDate: String(
              registrationData
                ?.birthDate || ""
            )
              .trim()
              .slice(0, 10),

            gender: String(
              registrationData
                ?.gender || ""
            )
              .trim()
              .toLowerCase(),

            email: String(
              registrationData
                ?.email || ""
            )
              .trim()
              .toLowerCase(),

            password:
              registrationData
                ?.password || "",

            confirmPassword:
              registrationData
                ?.confirmPassword ||
              "",

            preferredLanguage:
              registrationData
                ?.preferredLanguage ||
              "ru",
          }
        );

      if (
        !response.data?.success
      ) {
        throw new Error(
          response.data?.message ||
            "Не удалось отправить код."
        );
      }

      return {
        success: true,

        message:
          response.data.message,

        expiresInSeconds:
          response.data
            ?.expiresInSeconds ||
          600,
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
      const response =
        await api.post(
          "/auth/register/confirm",
          {
            email: String(
              email || ""
            )
              .trim()
              .toLowerCase(),

            code: String(
              code || ""
            ).trim(),
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

      const nextUser =
        normalizeUser(
          response.data.user
        );

      setUser(nextUser);

      return {
        success: true,
        user: nextUser,
        message:
          response.data.message,
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
      const response =
        await api.post(
          "/auth/register/resend-code",
          {
            email: String(
              email || ""
            )
              .trim()
              .toLowerCase(),
          }
        );

      if (
        !response.data?.success
      ) {
        throw new Error(
          response.data?.message ||
            "Не удалось отправить новый код."
        );
      }

      return {
        success: true,

        message:
          response.data.message,

        expiresInSeconds:
          response.data
            ?.expiresInSeconds ||
          600,
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

  async function refreshCurrentUser() {
    try {
      const response =
        await api.get("/auth/me");

      if (
        !response.data?.success ||
        !response.data?.user
      ) {
        throw new Error(
          response.data?.message ||
            "Не удалось обновить данные пользователя."
        );
      }

      const nextUser =
        normalizeUser(
          response.data.user
        );

      setUser(nextUser);

      return nextUser;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          error,
          "Не удалось обновить данные пользователя."
        )
      );
    }
  }

  function updateUserLocally(
    changes
  ) {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return normalizeUser({
        ...currentUser,
        ...changes,
      });
    });
  }

  async function logout() {
    try {
      await api.post(
        "/auth/logout"
      );
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

      isAuthenticated:
        Boolean(user),

      login,

      requestRegistrationCode,

      confirmRegistration,

      resendRegistrationCode,

      refreshCurrentUser,

      updateUserLocally,

      logout,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider."
    );
  }

  return context;
}
