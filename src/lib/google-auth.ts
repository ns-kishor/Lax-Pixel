export function simulateGoogleAuth(idToken: string): { email: string; name: string; avatar: string } {
  if (idToken.includes('@')) {
    const email = idToken.trim();
    const name = email.split('@')[0] || 'Google User';
    return { email, name, avatar: '' };
  }

  const random = Math.floor(Math.random() * 100000);
  const email = `user_${random}@gmail.com`;
  return { email, name: 'Google User', avatar: '' };
}
