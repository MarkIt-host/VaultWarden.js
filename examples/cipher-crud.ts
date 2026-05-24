/**
 * Cipher CRUD Operations Example
 *
 * Demonstrates creating, reading, updating, and deleting ciphers
 */

import { VaultwardenClient } from 'vaultwarden.js';

async function main() {
  const client = new VaultwardenClient({
    baseUrl: 'https://vault.example.com',
  });

  await client.login({
    username: 'user@example.com',
    password: 'your-password',
  });

  await client.sync();

  // ========== CREATE ==========
  console.log('Creating ciphers...');

  // Create a login
  const login = await client.createLogin({
    name: 'GitHub',
    username: 'myuser',
    password: client.generatePassword({ length: 20 }),
    uri: 'https://github.com',
    favorite: true,
  });
  console.log('Created login:', login.name);
  console.log('Masked password:', login.maskedPassword);
  console.log('Domain:', login.domain);

  // Create a card
  const card = await client.createCard({
    name: 'My Credit Card',
    cardholderName: 'John Doe',
    brand: 'visa',
    number: '4111111111111111',
    expMonth: '12',
    expYear: '2028',
    code: '123',
  });
  console.log('Created card:', card.name);
  console.log('Masked number:', card.maskedNumber);
  console.log('Is expired:', card.isExpired);

  // Create a secure note
  const note = await client.createSecureNote({
    name: 'Important Note',
    content: 'This is a secure note with important information.\nIt can have multiple lines.',
  });
  console.log('Created note:', note.name);
  console.log('Preview:', note.preview);
  console.log('Line count:', note.lineCount);

  // Create an identity
  const identity = await client.createIdentity({
    name: 'Work Identity',
    title: 'Mr.',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '+1-555-0123',
    address1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  });
  console.log('Created identity:', identity.name);
  console.log('Full name:', identity.fullName);
  console.log('Address:', identity.address);

  // ========== READ ==========
  console.log('\nReading ciphers...');

  // Fetch by ID
  const fetchedLogin = await client.ciphers.fetch(login.id);
  if (fetchedLogin) {
    console.log('Fetched:', fetchedLogin.name);
  }

  // Search
  const results = client.ciphers.search('github');
  console.log(`Found ${results.size} results for "github"`);

  // Access cached data
  console.log(`Total logins: ${client.logins.size}`);
  console.log(`Total cards: ${client.cards.size}`);
  console.log(`Favorites: ${client.favorites.size}`);

  // ========== UPDATE ==========
  console.log('\nUpdating ciphers...');

  // Update login
  await login.update({
    password: client.generatePassword(),
  });
  console.log('Updated password for:', login.name);

  // Regenerate password
  const newPassword = await login.regeneratePassword(24);
  console.log('Regenerated password:', newPassword);

  // Add URI
  await login.addUri('https://gist.github.com');
  console.log('Added URI to login');

  // Update card
  await card.update({
    expYear: '2029',
  });
  console.log('Updated card expiration');

  // Update note
  await note.append('Additional line added later');
  console.log('Appended to note');

  // Update identity
  await identity.update({
    city: 'Brooklyn',
  });
  console.log('Updated identity city');

  // ========== DELETE ==========
  console.log('\nDeleting ciphers...');

  // Soft delete (move to trash)
  await login.softDelete();
  console.log('Soft deleted login (moved to trash)');

  // Restore from trash
  await login.restore();
  console.log('Restored login from trash');

  // Permanently delete
  await card.delete();
  console.log('Permanently deleted card');

  // Delete by ID through manager
  await client.ciphers.delete(note.id);
  console.log('Deleted note through manager');

  console.log('\nDone!');
  client.logout();
}

main().catch(console.error);
