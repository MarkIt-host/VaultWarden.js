/**
 * Folder Management Example
 *
 * Demonstrates organizing ciphers into folders
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

  // ========== CREATE FOLDERS ==========
  console.log('Creating folders...');

  const workFolder = await client.createFolder('Work');
  const personalFolder = await client.createFolder('Personal');
  const socialFolder = await client.createFolder('Social Media');

  console.log(`Created folders: ${workFolder.name}, ${personalFolder.name}, ${socialFolder.name}`);

  // ========== CREATE CIPHERS IN FOLDERS ==========
  console.log('\nCreating ciphers in folders...');

  // Create login in work folder
  const workLogin = await client.createLogin({
    name: 'Company VPN',
    username: 'john.doe',
    password: client.generatePassword(),
    folder: workFolder,
  });
  console.log(`Created "${workLogin.name}" in folder "${workLogin.folder?.name}"`);

  // Create login in personal folder
  const personalLogin = await client.createLogin({
    name: 'Bank',
    username: 'john.doe',
    password: client.generatePassword(),
    folder: personalFolder,
  });
  console.log(`Created "${personalLogin.name}" in folder "${personalLogin.folder?.name}"`);

  // Create multiple social media logins
  const socialSites = [
    { name: 'Twitter', uri: 'https://twitter.com' },
    { name: 'Instagram', uri: 'https://instagram.com' },
    { name: 'Facebook', uri: 'https://facebook.com' },
  ];

  for (const site of socialSites) {
    const login = await client.createLogin({
      name: site.name,
      username: 'johndoe',
      password: client.generatePassword(),
      uri: site.uri,
      folder: socialFolder,
    });
    console.log(`Created "${login.name}" in folder "${login.folder?.name}"`);
  }

  // ========== ACCESS FOLDER CONTENTS ==========
  console.log('\nFolder contents:');

  for (const [, folder] of client.folders.cache) {
    console.log(`\n📁 ${folder.name} (${folder.size} items):`);
    for (const [, cipher] of folder.ciphers) {
      console.log(`  - ${cipher.name}`);
    }
  }

  // ========== FOLDER OPERATIONS ==========
  console.log('\nFolder operations:');

  // Get logins only from a folder
  console.log(`\nLogins in "${workFolder.name}":`);
  for (const [, login] of workFolder.logins) {
    console.log(`  - ${login.name}: ${login.username}`);
  }

  // Search within a folder
  const socialResults = socialFolder.search('insta');
  console.log(`\nSearch "insta" in Social Media: ${socialResults.size} results`);

  // ========== MOVE CIPHERS BETWEEN FOLDERS ==========
  console.log('\nMoving ciphers between folders...');

  // Move a cipher to a different folder
  await personalLogin.moveToFolder(socialFolder.id);
  console.log(`Moved "${personalLogin.name}" to "${socialFolder.name}"`);

  // Move a cipher to no folder (root)
  await workLogin.moveToFolder(null);
  console.log(`Moved "${workLogin.name}" to root (no folder)`);

  // Update folder name
  await socialFolder.rename('Social');
  console.log(`Renamed folder to "${socialFolder.name}"`);

  // ========== DEFAULT FOLDER (NO FOLDER) ==========
  console.log('\nCiphers without folder:');
  const defaultFolder = client.folders.defaultFolder;
  console.log(`Found ${defaultFolder.size} ciphers without folder`);
  for (const [, cipher] of defaultFolder.ciphers) {
    console.log(`  - ${cipher.name}`);
  }

  // ========== CLEANUP ==========
  console.log('\nCleaning up...');

  // Delete folders (ciphers will be moved to no folder)
  await workFolder.delete();
  await socialFolder.delete();

  // Note: personalFolder was renamed to "Social" so it's already deleted
  console.log('Deleted folders');

  // Show remaining folders
  console.log(`Remaining folders: ${client.folders.cache.size}`);

  client.logout();
}

main().catch(console.error);
