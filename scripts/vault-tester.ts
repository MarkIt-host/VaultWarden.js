#!/usr/bin/env node
/**
 * Vaultwarden Vault Tester CLI
 * A testing script for managing vault contents
 *
 * Usage:
 *   npx tsx scripts/vault-tester.ts login --url https://vault.example.com --email user@example.com --password pass
 *   npx tsx scripts/vault-tester.ts fill --url https://vault.example.com --email user@example.com --password pass --count 50
 *   npx tsx scripts/vault-tester.ts delete --url https://vault.example.com --email user@example.com --password pass --all
 *   npx tsx scripts/vault-tester.ts delete --url https://vault.example.com --email user@example.com --password pass --type login
 */

import { VaultwardenClient, generatePassword, generatePassphrase } from '../src/index.js';

interface CLIOptions {
  url: string;
  email: string;
  password: string;
  command: 'login' | 'fill' | 'delete' | 'list';
  count?: number;
  all?: boolean;
  type?: 'login' | 'card' | 'note' | 'identity' | 'all';
  folder?: string;
  dryRun?: boolean;
}

const PRESET_DATA = {
  websites: [
    { name: 'Google', domain: 'google.com', username: 'user@gmail.com' },
    { name: 'GitHub', domain: 'github.com', username: 'developer' },
    { name: 'GitLab', domain: 'gitlab.com', username: 'coder' },
    { name: 'AWS Console', domain: 'console.aws.amazon.com', username: 'admin' },
    { name: 'Azure Portal', domain: 'portal.azure.com', username: 'admin@corp.com' },
    { name: 'Stripe', domain: 'stripe.com', username: 'finance@company.com' },
    { name: 'Vercel', domain: 'vercel.com', username: 'deployer' },
    { name: 'Netlify', domain: 'netlify.com', username: 'builder' },
    { name: 'Docker Hub', domain: 'hub.docker.com', username: 'containerizer' },
    { name: 'NPM', domain: 'npmjs.com', username: 'packager' },
    { name: 'PyPI', domain: 'pypi.org', username: 'pythonista' },
    { name: 'RubyGems', domain: 'rubygems.org', username: 'gemcutter' },
    { name: 'Heroku', domain: 'heroku.com', username: 'deployer' },
    { name: 'DigitalOcean', domain: 'cloud.digitalocean.com', username: 'admin' },
    { name: 'Linode', domain: 'cloud.linode.com', username: 'root' },
    { name: 'Cloudflare', domain: 'dash.cloudflare.com', username: 'admin' },
    { name: 'Namecheap', domain: 'namecheap.com', username: 'domains' },
    { name: 'GoDaddy', domain: 'godaddy.com', username: 'webmaster' },
    { name: 'Slack', domain: 'slack.com', username: 'team@company.com' },
    { name: 'Discord', domain: 'discord.com', username: 'gamer#1234' },
    { name: 'Twitter', domain: 'twitter.com', username: '@socialmedia' },
    { name: 'LinkedIn', domain: 'linkedin.com', username: 'professional@corp.com' },
    { name: 'Facebook', domain: 'facebook.com', username: 'personal@email.com' },
    { name: 'Instagram', domain: 'instagram.com', username: 'photographer' },
    { name: 'YouTube', domain: 'youtube.com', username: 'creator@channel.com' },
    { name: 'Twitch', domain: 'twitch.tv', username: 'streamer' },
    { name: 'Spotify', domain: 'spotify.com', username: 'listener' },
    { name: 'Netflix', domain: 'netflix.com', username: 'viewer' },
    { name: 'Amazon', domain: 'amazon.com', username: 'shopper' },
    { name: 'eBay', domain: 'ebay.com', username: 'seller' },
    { name: 'PayPal', domain: 'paypal.com', username: 'payments@email.com' },
    { name: 'Venmo', domain: 'venmo.com', username: 'friendpay' },
    { name: 'Cash App', domain: 'cash.app', username: '$cashtag' },
    { name: 'Robinhood', domain: 'robinhood.com', username: 'trader' },
    { name: 'Coinbase', domain: 'coinbase.com', username: 'crypto@wallet.com' },
    { name: 'Binance', domain: 'binance.com', username: 'hodler' },
    { name: 'Kraken', domain: 'kraken.com', username: 'crypto_trader' },
    { name: 'Figma', domain: 'figma.com', username: 'designer@studio.com' },
    { name: 'Notion', domain: 'notion.so', username: 'organizer' },
    { name: 'Trello', domain: 'trello.com', username: 'project@manager.com' },
    { name: 'Asana', domain: 'asana.com', username: 'tasks@team.com' },
    { name: 'Jira', domain: 'jira.com', username: 'agile@dev.com' },
    { name: 'Confluence', domain: 'confluence.com', username: 'docs@wiki.com' },
    { name: 'Monday', domain: 'monday.com', username: 'planner' },
    { name: 'Linear', domain: 'linear.app', username: 'issues@tracker.com' },
    { name: 'Sentry', domain: 'sentry.io', username: 'errors@monitor.com' },
    { name: 'Datadog', domain: 'datadoghq.com', username: 'metrics@obs.com' },
    { name: 'Grafana', domain: 'grafana.com', username: 'dashboards@vis.com' },
    { name: 'New Relic', domain: 'newrelic.com', username: 'apm@monitor.com' },
  ],

  cards: [
    { name: 'Personal Visa', cardholderName: 'John Doe', brand: 'Visa' },
    { name: 'Business Mastercard', cardholderName: 'Jane Smith', brand: 'Mastercard' },
    { name: 'Backup Amex', cardholderName: 'John Doe', brand: 'Amex' },
    { name: 'Travel Discover', cardholderName: 'John Doe', brand: 'Discover' },
    { name: 'Company Card', cardholderName: 'ACME Corp', brand: 'Visa' },
    { name: 'Family Card', cardholderName: 'Doe Family', brand: 'Mastercard' },
  ],

  identities: [
    {
      title: 'Mr',
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      company: 'ACME Corporation',
      email: 'john.doe@acme.com',
      phone: '+1 (555) 123-4567',
      ssn: '123-45-6789',
    },
    {
      title: 'Ms',
      firstName: 'Jane',
      lastName: 'Smith',
      address1: '456 Oak Ave',
      address2: 'Apt 42',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
      company: 'Tech Startup Inc',
      email: 'jane.smith@tech.io',
      phone: '+1 (555) 987-6543',
      ssn: '987-65-4321',
    },
    {
      title: 'Dr',
      firstName: 'Robert',
      middleName: 'James',
      lastName: 'Johnson',
      address1: '789 Pine Road',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
      company: 'Medical Practice LLC',
      email: 'dr.johnson@medical.com',
      phone: '+1 (555) 246-8135',
    },
  ],

  notes: [
    { name: 'WiFi Password', content: 'Network: HomeWiFi_5G\nPassword: SuperSecret123!\nGuest: GuestNetwork456' },
    { name: 'Server Credentials', content: 'Root: root@server.example.com\nUser: admin\nSSH Key: ~/.ssh/id_rsa' },
    { name: 'API Keys', content: 'Production: sk_live_xxxxxxxxxxxxxxxx\nTest: sk_test_xxxxxxxxxxxxxxxx' },
    { name: 'Recovery Codes', content: 'Backup codes:\n1234-5678-9012\n3456-7890-1234\n5678-9012-3456' },
    { name: 'License Keys', content: 'Windows: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX\nOffice: YYYYY-YYYYY-YYYYY-YYYYY-YYYYY' },
    { name: 'Banking Info', content: 'Routing: 021000021\nAccount: 1234567890\nPIN: Do not store here!' },
  ],
};

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const command = args[0] as CLIOptions['command'];

  if (!command || !['login', 'fill', 'delete', 'list'].includes(command)) {
    console.error('Usage: vault-tester <login|fill|delete|list> [options]');
    console.error('\nCommands:');
    console.error('  login  - Test login and show vault stats');
    console.error('  fill   - Fill vault with preset data');
    console.error('  delete - Delete vault items');
    console.error('  list   - List vault contents');
    console.error('\nOptions:');
    console.error('  --url <url>       Server URL (required)');
    console.error('  --email <email>   Email address (required)');
    console.error('  --password <pass> Master password (required)');
    console.error('  --count <n>       Number of items to create (fill command, default: 20)');
    console.error('  --all             Delete all items (delete command)');
    console.error('  --type <type>     Filter by type: login|card|note|identity (delete/list)');
    console.error('  --folder <name>   Create/use folder for items');
    console.error('  --dry-run         Show what would be done without doing it');
    process.exit(1);
  }

  const options: Partial<CLIOptions> = { command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--password':
        options.password = args[++i];
        break;
      case '--count':
        options.count = parseInt(args[++i], 10);
        break;
      case '--all':
        options.all = true;
        break;
      case '--type':
        options.type = args[++i] as CLIOptions['type'];
        break;
      case '--folder':
        options.folder = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  if (!options.url || !options.email || !options.password) {
    console.error('Error: --url, --email, and --password are required');
    process.exit(1);
  }

  return options as CLIOptions;
}

async function createClient(options: CLIOptions): Promise<VaultwardenClient> {
  const client = new VaultwardenClient({
    baseUrl: options.url,
    deviceName: 'VaultTester-CLI',
  });

  console.log(`🔐 Logging in as ${options.email}...`);
  await client.login({
    username: options.email,
    password: options.password,
  });
  console.log('✅ Login successful!\n');

  return client;
}

async function cmdLogin(options: CLIOptions) {
  const client = await createClient(options);

  // Sync to get data
  console.log('🔄 Syncing data...\n');
  await client.ciphers.sync();
  await client.folders.sync();

  console.log('📊 Vault Statistics:');
  console.log(`   Total Ciphers: ${client.ciphers.cache.size}`);
  console.log(`   Login Items: ${client.ciphers.logins.size}`);
  console.log(`   Cards: ${client.ciphers.cards.size}`);
  console.log(`   Notes: ${client.ciphers.notes.size}`);
  console.log(`   Identities: ${client.ciphers.identities.size}`);
  console.log(`   Folders: ${client.folders.cache.size}`);
  console.log(`   Collections: ${client.collections.cache.size}`);

  client.logout();
}

async function cmdFill(options: CLIOptions) {
  const client = await createClient(options);
  const count = options.count || 20;
  const dryRun = options.dryRun || false;

  if (dryRun) {
    console.log('🔍 DRY RUN - Would create:');
    console.log(`   ${Math.min(count, PRESET_DATA.websites.length)} login items`);
    console.log(`   ${Math.min(count, PRESET_DATA.cards.length)} cards`);
    console.log(`   ${Math.min(count, PRESET_DATA.notes.length)} notes`);
    console.log(`   ${Math.min(count, PRESET_DATA.identities.length)} identities`);
    client.logout();
    return;
  }

  let folderId: string | null = null;
  if (options.folder) {
    console.log(`📁 Creating folder: ${options.folder}`);
    const folder = await client.folders.create(options.folder);
    folderId = folder.id;
    console.log('✅ Folder created\n');
  }

  console.log(`📝 Creating ${count} items...\n`);
  let created = 0;

  // Create login items
  const loginCount = Math.min(count, PRESET_DATA.websites.length);
  for (let i = 0; i < loginCount; i++) {
    const site = PRESET_DATA.websites[i];
    const password = generatePassword({ length: 16 });

    await client.ciphers.createLogin({
      name: `${site.name} Account`,
      username: site.username,
      password: password.password,
      uri: `https://${site.domain}`,
      notes: `Auto-generated test account for ${site.domain}`,
      folderId,
      favorite: Math.random() > 0.8,
    });
    created++;
    process.stdout.write(`\r   Created ${created}/${count} items...`);
  }

  // Create cards if we need more
  if (created < count) {
    const cardCount = Math.min(count - created, PRESET_DATA.cards.length);
    for (let i = 0; i < cardCount; i++) {
      const card = PRESET_DATA.cards[i];
      await client.ciphers.createCard({
        name: card.name,
        cardholderName: card.cardholderName,
        brand: card.brand,
        number: '4111111111111111',
        expMonth: '12',
        expYear: '2027',
        code: '123',
        folderId,
        favorite: Math.random() > 0.9,
      });
      created++;
      process.stdout.write(`\r   Created ${created}/${count} items...`);
    }
  }

  // Create notes if we need more
  if (created < count) {
    const noteCount = Math.min(count - created, PRESET_DATA.notes.length);
    for (let i = 0; i < noteCount; i++) {
      const note = PRESET_DATA.notes[i];
      await client.ciphers.createSecureNote({
        name: note.name,
        content: note.content,
        folderId,
        favorite: Math.random() > 0.95,
      });
      created++;
      process.stdout.write(`\r   Created ${created}/${count} items...`);
    }
  }

  // Create identities if we need more
  if (created < count) {
    const idCount = Math.min(count - created, PRESET_DATA.identities.length);
    for (let i = 0; i < idCount; i++) {
      const id = PRESET_DATA.identities[i];
      await client.ciphers.createIdentity({
        name: `${id.firstName} ${id.lastName} Identity`,
        title: id.title,
        firstName: id.firstName,
        middleName: id.middleName,
        lastName: id.lastName,
        address1: id.address1,
        address2: id.address2,
        city: id.city,
        state: id.state,
        postalCode: id.postalCode,
        country: id.country,
        company: id.company,
        email: id.email,
        phone: id.phone,
        ssn: id.ssn,
        folderId,
        favorite: Math.random() > 0.95,
      });
      created++;
      process.stdout.write(`\r   Created ${created}/${count} items...`);
    }
  }

  console.log('\n✅ Done!\n');

  console.log('📊 New Vault Statistics:');
  console.log(`   Total Ciphers: ${client.ciphers.cache.size}`);
  console.log(`   Login Items: ${client.ciphers.logins.size}`);
  console.log(`   Cards: ${client.ciphers.cards.size}`);
  console.log(`   Notes: ${client.ciphers.notes.size}`);
  console.log(`   Identities: ${client.ciphers.identities.size}`);

  client.logout();
}

async function cmdDelete(options: CLIOptions) {
  const client = await createClient(options);
  const dryRun = options.dryRun || false;

  const typeFilter = options.type || 'all';
  const deleteAll = options.all || false;

  // Collect items to delete
  const toDelete: Array<{ id: string; name: string; type: string }> = [];

  if (typeFilter === 'all' || typeFilter === 'login') {
    for (const [, cipher] of client.ciphers.logins) {
      toDelete.push({ id: cipher.id, name: cipher.name, type: 'login' });
    }
  }

  if (typeFilter === 'all' || typeFilter === 'card') {
    for (const [, cipher] of client.ciphers.cards) {
      toDelete.push({ id: cipher.id, name: cipher.name, type: 'card' });
    }
  }

  if (typeFilter === 'all' || typeFilter === 'note') {
    for (const [, cipher] of client.ciphers.notes) {
      toDelete.push({ id: cipher.id, name: cipher.name, type: 'note' });
    }
  }

  if (typeFilter === 'all' || typeFilter === 'identity') {
    for (const [, cipher] of client.ciphers.identities) {
      toDelete.push({ id: cipher.id, name: cipher.name, type: 'identity' });
    }
  }

  if (toDelete.length === 0) {
    console.log('No items to delete.');
    client.logout();
    return;
  }

  console.log(`Found ${toDelete.length} items to delete (type: ${typeFilter})`);

  if (!deleteAll) {
    console.log('\nUse --all to confirm deletion. Preview:');
    console.log(toDelete.slice(0, 10).map(i => `   - ${i.name} (${i.type})`).join('\n'));
    if (toDelete.length > 10) {
      console.log(`   ... and ${toDelete.length - 10} more`);
    }
    client.logout();
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would delete:');
    console.log(toDelete.map(i => `   - ${i.name} (${i.type})`).join('\n'));
    client.logout();
    return;
  }

  console.log('\n🗑️  Deleting items...\n');

  let deleted = 0;
  let errors = 0;

  for (const item of toDelete) {
    try {
      await client.ciphers.delete(item.id);
      deleted++;
      process.stdout.write(`\r   Deleted ${deleted}/${toDelete.length}...`);
    } catch (err) {
      errors++;
      console.error(`\n   Error deleting ${item.name}: ${err}`);
    }
  }

  console.log(`\n\n✅ Deleted ${deleted} items${errors > 0 ? `, ${errors} errors` : ''}`);

  client.logout();
}

async function cmdList(options: CLIOptions) {
  const client = await createClient(options);
  const typeFilter = options.type || 'all';

  // Sync to populate cache
  console.log('🔄 Syncing data...\n');
  await client.ciphers.sync();
  await client.folders.sync();

  console.log('📋 Vault Contents:\n');

  if (typeFilter === 'all' || typeFilter === 'login') {
    console.log(`Login Items (${client.ciphers.logins.size}):`);
    for (const [, cipher] of client.ciphers.logins) {
      console.log(`   📧 ${cipher.name}${cipher.favorite ? ' ⭐' : ''}`);
      console.log(`      Username: ${cipher.username || 'N/A'}`);
      console.log(`      Domain: ${cipher.domain || 'N/A'}\n`);
    }
  }

  if (typeFilter === 'all' || typeFilter === 'card') {
    console.log(`Cards (${client.ciphers.cards.size}):`);
    for (const [, cipher] of client.ciphers.cards) {
      console.log(`   💳 ${cipher.name}${cipher.favorite ? ' ⭐' : ''}`);
      console.log(`      Cardholder: ${cipher.cardholderName || 'N/A'}`);
      console.log(`      Brand: ${cipher.brand || 'N/A'}\n`);
    }
  }

  if (typeFilter === 'all' || typeFilter === 'note') {
    console.log(`Notes (${client.ciphers.notes.size}):`);
    for (const [, cipher] of client.ciphers.notes) {
      console.log(`   📝 ${cipher.name}${cipher.favorite ? ' ⭐' : ''}`);
      const preview = cipher.notes?.slice(0, 50) || 'Empty';
      console.log(`      ${preview}${cipher.notes && cipher.notes.length > 50 ? '...' : ''}\n`);
    }
  }

  if (typeFilter === 'all' || typeFilter === 'identity') {
    console.log(`Identities (${client.ciphers.identities.size}):`);
    for (const [, cipher] of client.ciphers.identities) {
      console.log(`   👤 ${cipher.name}${cipher.favorite ? ' ⭐' : ''}`);
      console.log(`      ${cipher.firstName} ${cipher.lastName}`);
      console.log(`      ${cipher.email || 'N/A'}\n`);
    }
  }

  console.log(`\n📊 Folders: ${client.folders.cache.size}`);
  console.log(`📊 Collections: ${client.collections.cache.size}`);

  client.logout();
}

async function main() {
  const options = parseArgs();

  try {
    switch (options.command) {
      case 'login':
        await cmdLogin(options);
        break;
      case 'fill':
        await cmdFill(options);
        break;
      case 'delete':
        await cmdDelete(options);
        break;
      case 'list':
        await cmdList(options);
        break;
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
