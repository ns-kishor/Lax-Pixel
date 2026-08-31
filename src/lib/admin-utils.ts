export function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': typeof window !== 'undefined' ? (localStorage.getItem('admin-token') || '') : '',
  };
}
