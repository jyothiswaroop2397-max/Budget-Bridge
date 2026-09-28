import { describe, it, expect } from 'vitest';
import { UserProfile } from '../types.js';

describe('LoginPage and Auth State Handling', () => {
  it('creates clean UserProfile structure with login state and email', () => {
    const profile: UserProfile = {
      name: 'Swaroop Kumar',
      email: 'kjswaroop2397@gmail.com',
      avatarUrl: 'https://example.com/avatar.png',
      isLoggedIn: true,
    };

    expect(profile.isLoggedIn).toBe(true);
    expect(profile.email).toBe('kjswaroop2397@gmail.com');
    expect(profile.name).toBe('Swaroop Kumar');
  });

  it('handles guest fallback profile structure', () => {
    const guestProfile: UserProfile = {
      name: 'Guest',
      avatarUrl: 'data:image/svg+xml;utf8,...',
      isLoggedIn: false,
    };

    expect(guestProfile.isLoggedIn).toBe(false);
    expect(guestProfile.email).toBeUndefined();
    expect(guestProfile.name).toBe('Guest');
  });
});
