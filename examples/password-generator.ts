/**
 * Password Generator Example
 *
 * Demonstrates various password generation strategies
 */

import { VaultwardenClient } from '../dist';

async function main() {
  const client = new VaultwardenClient({
    baseUrl: 'https://vault.example.com',
  });

  // Note: Password generation doesn't require authentication
  console.log('=== Password Generation Demo ===\n');

  // ========== BASIC PASSWORDS ==========
  console.log('--- Basic Passwords ---');

  // Default password (16 chars, all character types)
  console.log('Default (16 chars):', client.generatePassword());

  // Short password
  console.log('Short (8 chars):', client.generatePassword({ length: 8 }));

  // Long password
  console.log('Long (32 chars):', client.generatePassword({ length: 32 }));

  // Very long password
  console.log('Very long (64 chars):', client.generatePassword({ length: 64 }));

  // ========== CUSTOM CHARACTER SETS ==========
  console.log('\n--- Custom Character Sets ---');

  // Letters only
  console.log(
    'Letters only:',
    client.generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: false,
      special: false,
    })
  );

  // Numbers only
  console.log(
    'Numbers only:',
    client.generatePassword({
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: true,
      special: false,
    })
  );

  // No special chars (alphanumeric)
  console.log(
    'No special chars:',
    client.generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: false,
    })
  );

  // Only lowercase
  console.log(
    'Lowercase only:',
    client.generatePassword({
      length: 20,
      uppercase: false,
      lowercase: true,
      numbers: false,
      special: false,
    })
  );

  // ========== PASSPHRASES ==========
  console.log('\n--- Passphrases ---');

  // Default passphrase (4 words)
  console.log('Default (4 words):', client.generatePassphrase());

  // More words
  console.log('6 words:', client.generatePassphrase({ numWords: 6 }));
  console.log('8 words:', client.generatePassphrase({ numWords: 8 }));

  // Custom separator
  console.log('Space separated:', client.generatePassphrase({ wordSeparator: ' ' }));
  console.log('Dot separated:', client.generatePassphrase({ wordSeparator: '.' }));
  console.log('Underscore separated:', client.generatePassphrase({ wordSeparator: '_' }));

  // Without capitalization
  console.log('Lowercase:', client.generatePassphrase({ capitalize: false }));

  // Without number
  console.log('No number:', client.generatePassphrase({ includeNumber: false }));

  // Custom combination
  console.log(
    'Custom:',
    client.generatePassphrase({
      numWords: 5,
      wordSeparator: '-',
      capitalize: true,
      includeNumber: true,
    })
  );

  // ========== GENERATION STATISTICS ==========
  console.log('\n--- Statistics ---');

  const passwordCount = 1000;
  const lengths: number[] = [];
  const passphraseWordCounts: number[] = [];

  for (let i = 0; i < passwordCount; i++) {
    const pwd = client.generatePassword({ length: 16 });
    lengths.push(pwd.length);

    const phrase = client.generatePassphrase({ numWords: 4 });
    passphraseWordCounts.push(phrase.split('-').length);
  }

  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const avgWordCount =
    passphraseWordCounts.reduce((a, b) => a + b, 0) / passphraseWordCounts.length;

  console.log(`Generated ${passwordCount} passwords`);
  console.log(`Average length: ${avgLength.toFixed(2)}`);
  console.log(`Average passphrase word count: ${avgWordCount.toFixed(2)}`);

  // ========== USAGE EXAMPLES ==========
  console.log('\n--- Usage Examples ---');

  // Login with generated password
  await client.login({
    username: 'user@example.com',
    password: 'your-password',
  });

  const login = await client.createLogin({
    name: 'Example Service',
    username: 'user@example.com',
    password: client.generatePassword({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: true,
    }),
  });

  console.log(`Created login with generated password: ${login.maskedPassword}`);

  // Regenerate password for existing login
  const newPassword = await login.regeneratePassword(32);
  console.log(`Regenerated password (length ${newPassword.length})`);

  // Create secure note with passphrase
  const backupPhrase = client.generatePassphrase({
    numWords: 12,
    wordSeparator: ' ',
    capitalize: true,
    includeNumber: true,
  });

  const note = await client.createSecureNote({
    name: 'Recovery Phrase',
    content: `Recovery phrase: ${backupPhrase}\n\nStore this securely!`,
  });

  console.log(`Created secure note: ${note.name}`);
  console.log(`Recovery phrase word count: ${backupPhrase.split(' ').length}`);

  client.logout();
}

main().catch(console.error);
