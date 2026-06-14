import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { MobileApiError } from "@/lib/api/client";
import { getNutritionTargets, type NutritionTargets } from "@/lib/api/nutrition-targets";

export type NutritionTargetsStatus =
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

type NutritionTargetsState = {
  errorMessage: string | null;
  status: NutritionTargetsStatus;
  targets: NutritionTargets | null;
};

function statusFromError(error: unknown): NutritionTargetsState {
  if (error instanceof MobileApiError) {
    return {
      errorMessage: error.message,
      status: error.code,
      targets: null
    };
  }

  return {
    errorMessage: "No pudimos cargar tus objetivos nutricionales.",
    status: "error",
    targets: null
  };
}

export function useNutritionTargets() {
  const { session } = useAuth();
  const [state, setState] = useState<NutritionTargetsState>({
    errorMessage: null,
    status: "loading",
    targets: null
  });

  const loadTargets = useCallback(async () => {
    setState({ errorMessage: null, status: "loading", targets: null });

    try {
      const targets = await getNutritionTargets(session);
      setState({ errorMessage: null, status: "success", targets });
    } catch (error) {
      setState(statusFromError(error));
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTargets();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTargets]);

  return {
    ...state,
    reload: loadTargets
  };
}
