const DEVICE_KEY = "proposalite:device-token";

/**
 * Anonymous, device-local identity. Generated once per browser and used as the
 * ownership key for every proposal this device creates. No account, no login.
 */
export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(DEVICE_KEY);
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    token = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, token);
  }
  return token;
}
