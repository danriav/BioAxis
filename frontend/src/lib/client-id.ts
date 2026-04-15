const CLIENT_ID_STORAGE_KEY = "health_app_client_id";

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "server-client";
  }

  const existingClientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existingClientId) {
    return existingClientId;
  }

  const generatedClientId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generatedClientId);
  return generatedClientId;
}
