export const INSTALL_KEY = 'crm_install_state';

export function saveInstallState(data: unknown) {
  localStorage.setItem(INSTALL_KEY, JSON.stringify(data));
}

export function loadInstallState() {
  const raw = localStorage.getItem(INSTALL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearInstallState() {
  localStorage.removeItem(INSTALL_KEY);
}
