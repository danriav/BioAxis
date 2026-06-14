import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { MobileApiError } from "@/lib/api/client";
import { getNutritionLogs, type NutritionDayLogs } from "@/lib/api/nutrition-logs";

export type NutritionLogsStatus =
  | "error"
  | "forbidden"
  | "loading"
  | "missing_session"
  | "network_error"
  | "not_found"
  | "session_expired"
  | "success"
  | "unexpected_error"
  | "validation_error";

type NutritionLogsState = {
  errorMessage: string | null;
  logs: NutritionDayLogs | null;
  status: NutritionLogsStatus;
};

function statusFromError(error: unknown): NutritionLogsState {
  if (error instanceof MobileApiError) {
    return {
      errorMessage: error.message,
      logs: null,
      status: error.code
    };
  }

  return {
    errorMessage: "No pudimos cargar tus alimentos del día.",
    logs: null,
    status: "error"
  };
}

export function useNutritionLogs(date: string) {
  const { session } = useAuth();
  const [state, setState] = useState<NutritionLogsState>({
    errorMessage: null,
    logs: null,
    status: "loading"
  });

  const loadLogs = useCallback(async () => {
    setState({ errorMessage: null, logs: null, status: "loading" });

    try {
      const logs = await getNutritionLogs(session, date);
      setState({ errorMessage: null, logs, status: "success" });
    } catch (error) {
      setState(statusFromError(error));
    }
  }, [date, session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadLogs]);

  return {
    ...state,
    reload: loadLogs
  };
}
