import type { Session } from "@supabase/supabase-js";

import { mobileEnv } from "@/lib/env/env";

export type ApiClientConfig = {
  fetcher?: typeof fetch;
  session?: Pick<Session, "access_token"> | null;
};

export class MobileApiError extends Error {
  constructor(
    readonly code:
      | "forbidden"
      | "missing_session"
      | "network_error"
      | "not_found"
      | "session_expired"
      | "unexpected_error"
      | "validation_error",
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

export function getAuthorizationHeader(session?: Pick<Session, "access_token"> | null) {
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

function toMobileApiError(error: unknown) {
  if (error instanceof MobileApiError) {
    return error;
  }
  return new MobileApiError("network_error", "No pudimos conectar con el backend.");
}

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (response.status === 401) {
    throw new MobileApiError("session_expired", "Tu sesión expiró. Inicia sesión otra vez.", 401);
  }

  if (response.status === 403) {
    throw new MobileApiError("forbidden", "No tienes permiso para ver esta información.", 403);
  }

  if (response.status === 404) {
    throw new MobileApiError("not_found", "No encontramos el alimento registrado.", 404);
  }

  if (response.status === 422) {
    throw new MobileApiError("validation_error", "El backend rechazo la solicitud.", 422);
  }

  if (!response.ok) {
    throw new MobileApiError("unexpected_error", "No pudimos cargar la información solicitada.", response.status);
  }

  return response.json() as Promise<TResponse>;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const fetcher = config.fetcher ?? fetch;

  return {
    getBaseUrl() {
      return mobileEnv.apiUrl;
    },
    getAuthHeader() {
      return getAuthorizationHeader(config.session);
    },
    async getJson<TResponse>(path: string): Promise<TResponse> {
      const authHeader = getAuthorizationHeader(config.session);
      if (!authHeader) {
        throw new MobileApiError("missing_session", "La sesión local no está disponible.");
      }

      let response: Response;
      try {
        response = await fetcher(`${mobileEnv.apiUrl}${path}`, {
          headers: {
            Accept: "application/json",
            Authorization: authHeader
          },
          method: "GET"
        });
      } catch (error) {
        throw toMobileApiError(error);
      }

      return parseJsonResponse<TResponse>(response);
    },
    async postJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
      const authHeader = getAuthorizationHeader(config.session);
      if (!authHeader) {
        throw new MobileApiError("missing_session", "La sesión local no está disponible.");
      }

      let response: Response;
      try {
        response = await fetcher(`${mobileEnv.apiUrl}${path}`, {
          body: JSON.stringify(body),
          headers: {
            Accept: "application/json",
            Authorization: authHeader,
            "Content-Type": "application/json"
          },
          method: "POST"
        });
      } catch (error) {
        throw toMobileApiError(error);
      }

      return parseJsonResponse<TResponse>(response);
    },
    async patchJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
      const authHeader = getAuthorizationHeader(config.session);
      if (!authHeader) {
        throw new MobileApiError("missing_session", "La sesión local no está disponible.");
      }

      let response: Response;
      try {
        response = await fetcher(`${mobileEnv.apiUrl}${path}`, {
          body: JSON.stringify(body),
          headers: {
            Accept: "application/json",
            Authorization: authHeader,
            "Content-Type": "application/json"
          },
          method: "PATCH"
        });
      } catch (error) {
        throw toMobileApiError(error);
      }

      return parseJsonResponse<TResponse>(response);
    },
    async deleteJson<TResponse>(path: string): Promise<TResponse> {
      const authHeader = getAuthorizationHeader(config.session);
      if (!authHeader) {
        throw new MobileApiError("missing_session", "La sesión local no está disponible.");
      }

      let response: Response;
      try {
        response = await fetcher(`${mobileEnv.apiUrl}${path}`, {
          headers: {
            Accept: "application/json",
            Authorization: authHeader
          },
          method: "DELETE"
        });
      } catch (error) {
        throw toMobileApiError(error);
      }

      return parseJsonResponse<TResponse>(response);
    }
  };
}
