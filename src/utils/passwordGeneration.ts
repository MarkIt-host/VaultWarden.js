/**
 * Password and passphrase generation utilities
 * @module utils
 */

import crypto from 'crypto';
import type { PasswordGenerationOptions, PassphraseGenerationOptions } from '../types/index.js';

/**
 * Generate a secure random password
 * @param options Password generation options
 * @returns Generated password with entropy info
 */
export function generatePassword(
  options: PasswordGenerationOptions = {}
): { password: string; entropy: number } {
  const {
    length = 16,
    uppercase: useUppercase = true,
    lowercase: useLowercase = true,
    numbers: useNumbers = true,
    special: useSpecial = true,
    minNumbers = 1,
    minSpecial = 0,
    ambiguous = false,
  } = options;

  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numbersChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,<>?';
  const ambiguousChars = '0O1lI';

  let chars = '';
  const requiredChars: string[] = [];

  if (useLowercase) {
    chars += lowercaseChars;
    for (let i = 0; i < 1; i++) requiredChars.push(lowercaseChars[crypto.randomInt(lowercaseChars.length)]!);
  }
  if (useUppercase) {
    chars += uppercaseChars;
    for (let i = 0; i < 1; i++) requiredChars.push(uppercaseChars[crypto.randomInt(uppercaseChars.length)]!);
  }
  if (useNumbers) {
    chars += numbersChars;
    for (let i = 0; i < minNumbers; i++) requiredChars.push(numbersChars[crypto.randomInt(numbersChars.length)]!);
  }
  if (useSpecial) {
    chars += specialChars;
    for (let i = 0; i < minSpecial; i++) requiredChars.push(specialChars[crypto.randomInt(specialChars.length)]!);
  }

  if (ambiguous) {
    for (const char of ambiguousChars) {
      chars = chars.replace(char, '');
    }
  }

  if (!chars) {
    throw new Error('At least one character set must be included');
  }

  const remainingLength = Math.max(0, length - requiredChars.length);
  const randomBytes = crypto.randomBytes(remainingLength);
  let password = requiredChars.join('');

  for (let i = 0; i < remainingLength; i++) {
    password += chars[randomBytes[i]! % chars.length];
  }

  // Shuffle the password
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j]!, passwordArray[i]!];
  }
  password = passwordArray.join('');

  // Calculate entropy
  const poolSize = chars.length;
  const entropy = Math.log2(Math.pow(poolSize, length));

  return { password, entropy };
}

/**
 * Generate a memorable passphrase
 * @param options Passphrase generation options
 * @returns Generated passphrase with word count
 */
export function generatePassphrase(
  options: PassphraseGenerationOptions = {}
): { passphrase: string; wordCount: number } {
  const {
    numWords = 4,
    wordSeparator = '-',
    capitalize = true,
    includeNumber = false,
  } = options;

  // EFF large wordlist (simplified subset - production should use full wordlist)
  const wordList = [
    'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
    'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'papaya', 'quince', 'raspberry',
    'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon', 'xigua', 'yam', 'zucchini',
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
    'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
    'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
    'yankee', 'zulu', 'anchor', 'butterfly', 'crystal', 'diamond', 'emerald', 'falcon',
    'garden', 'harbor', 'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'nebula',
    'ocean', 'pioneer', 'quantum', 'rainbow', 'sunset', 'thunder', 'universe', 'voyage',
    'winter', 'xenon', 'yellow', 'zenith', 'amber', 'bronze', 'copper', 'dawn',
    'evening', 'forest', 'golden', 'horizon', 'iron', 'jade', 'kingdom', 'legend',
    'midnight', 'north', 'obsidian', 'pearl', 'quest', 'river', 'silver', 'titanium',
    'urban', 'valley', 'west', 'xylophone', 'year', 'zephyr', 'azure', 'blizzard',
    'comet', 'drift', 'eclipse', 'flame', 'glacier', 'hollow', 'iceberg', 'jupiter',
    'kraken', 'lunar', 'meteor', 'neptune', 'orbit', 'plasma', 'quasar', 'rocket',
    'solar', 'tidal', 'uranus', 'venus', 'warp', 'yonder', 'zenith', 'acorn',
    'breeze', 'canyon', 'dewdrop', 'echoes', 'frost', 'grove', 'harvest', 'icicle',
    'jasmine', 'kelp', 'lagoon', 'meadow', 'nightfall', 'oasis', 'prairie', 'quiver',
    'reef', 'summit', 'tundra', 'upland', 'valley', 'willow', 'xerox', 'yearling',
  ];

  const words: string[] = [];
  for (let i = 0; i < numWords; i++) {
    const randomIndex = crypto.randomInt(wordList.length);
    let word = wordList[randomIndex]!;
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let passphrase = words.join(wordSeparator);

  if (includeNumber) {
    passphrase += wordSeparator + crypto.randomInt(10, 100);
  }

  return { passphrase, wordCount: numWords };
}
