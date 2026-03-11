export type AppRole = 'admin' | 'seller' | 'user';

export interface Permissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
  canManageTeam: boolean;
  canManageCredentials: boolean;
  canManageIntegrations: boolean;
  canManagePreferences: boolean;
  canManagePipeline: boolean;
}

export const PERMISSIONS: Record<AppRole, Permissions> = {
  admin: {
    canViewDashboard: true,
    canViewReports: true,
    canManageTeam: true,
    canManageCredentials: true,
    canManageIntegrations: true,
    canManagePreferences: true,
    canManagePipeline: true,
  },
  seller: {
    canViewDashboard: false,
    canViewReports: false,
    canManageTeam: false,
    canManageCredentials: false,
    canManageIntegrations: false,
    canManagePreferences: false,
    canManagePipeline: false,
  },
  user: {
    canViewDashboard: false,
    canViewReports: false,
    canManageTeam: false,
    canManageCredentials: false,
    canManageIntegrations: false,
    canManagePreferences: false,
    canManagePipeline: false,
  },
};
