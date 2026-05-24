/**
 * Basic Authentication Example
 *
 * Demonstrates login, logout, and session management
 */

import { VaultwardenClient, AuthenticationError } from 'vaultwarden-client';

async function main() {
  // Create client
  const client = new VaultwardenClient({
    baseUrl: 'https://vault.example.com',
    debug: true,
  });

  // Set up event listeners
  client.on('ready', () => {
    console.log('✅ Client is ready!');
    console.log(`Uptime: ${client.uptime}ms`);
  });

  client.on('login', (token) => {
    console.log('✅ Logged in successfully');
    console.log(`Token expires in: ${token.expires_in}s`);
  });

  client.on('logout', () => {
    console.log('👋 Logged out');
  });

  client.on('sync', () => {
    console.log('🔄 Data synced');
  });

  try {
    // Login
    console.log('Logging in...');
    await client.login({
      username: 'user@example.com',
      password: 'your-password',
    });

    // Check authentication state
    console.log('Is authenticated:', client.isAuthenticated);
    console.log('Is ready:', client.isReady);

    // Sync data
    await client.sync();
    console.log(`Loaded ${client.ciphers.cache.size} ciphers`);
    console.log(`Loaded ${client.folders.cache.size} folders`);

    // Logout
    client.logout();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed:', error.message);
      console.error('Error code:', error.code);
    } else {
      console.error('Error:', error);
    }
  }
}

main().catch(console.error);
