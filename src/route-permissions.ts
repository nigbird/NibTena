// Map of route prefixes to the permission key required to view them.
// Keep this file small and declarative so it can be extended easily.
export const routePermissions: Array<{ prefix: string; permission: string }> = [
  { prefix: '/hospital-admin/queue', permission: 'Queue:View' },
  { prefix: '/hospital-admin/appointments', permission: 'Appointments:View' },
  { prefix: '/hospital-admin/doctors', permission: 'Doctors:View' },
  { prefix: '/hospital-admin/schedule', permission: 'Schedules:View' },
  { prefix: '/hospital-admin/roles', permission: 'Users:View' },
  { prefix: '/hospital-admin/reports', permission: 'Reports:View' },
  { prefix: '/hospital-admin/settings', permission: 'Settings:View' },
  // Add additional route -> permission mappings here as needed.
];

export default routePermissions;
