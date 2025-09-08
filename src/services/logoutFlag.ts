export const LOGOUT_FLAG = "app.logoutInProgress";

export function setLogoutFlag() {
  try {
    sessionStorage.setItem(LOGOUT_FLAG, "1");
  } catch {}
}
export function clearLogoutFlag() {
  try {
    sessionStorage.removeItem(LOGOUT_FLAG);
  } catch {}
}
export function isLogoutFlagSet() {
  try {
    return sessionStorage.getItem(LOGOUT_FLAG) === "1";
  } catch {
    return false;
  }
}