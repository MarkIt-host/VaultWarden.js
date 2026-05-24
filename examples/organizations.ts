/**
 * Organizations and Collections Example
 *
 * Demonstrates working with shared vaults
 */

import { VaultwardenClient, OrganizationUserType } from 'vaultwarden.js';

async function main() {
  const client = new VaultwardenClient({
    baseUrl: 'https://vault.example.com',
  });

  await client.login({
    username: 'user@example.com',
    password: 'your-password',
  });

  await client.sync();

  // ========== ORGANIZATIONS ==========
  console.log('Organizations:');
  console.log(`Total: ${client.organizations.cache.size}`);

  for (const [, org] of client.organizations.cache) {
    console.log(`\n🏢 ${org.name}`);
    console.log(`  Role: ${getRoleName(org.type)}`);
    console.log(`  Is Owner: ${org.isOwner}`);
    console.log(`  Is Admin: ${org.isAdmin}`);
    console.log(`  Is Manager: ${org.isManager}`);
    console.log(`  Is Confirmed: ${org.isConfirmed}`);
    console.log(`  Collections: ${org.collections.size}`);
    console.log(`  Ciphers: ${org.ciphers.size}`);

    // List collections in organization
    if (org.collections.size > 0) {
      console.log('  Collections:');
      for (const [, collection] of org.collections) {
        console.log(`    - ${collection.name} (${collection.size} items)`);
      }
    }
  }

  // ========== FILTER BY ROLE ==========
  console.log('\n--- Filtered Views ---');
  console.log(`Owned organizations: ${client.organizations.owned.size}`);
  console.log(`Admin organizations: ${client.organizations.admin.size}`);
  console.log(`Managed organizations: ${client.organizations.managed.size}`);

  // ========== COLLECTIONS ==========
  console.log('\n--- All Collections ---');
  console.log(`Total collections: ${client.collections.cache.size}`);

  for (const [, collection] of client.collections.cache) {
    console.log(`\n📂 ${collection.name}`);
    console.log(`  Organization: ${collection.organization?.name}`);
    console.log(`  Read-only: ${collection.readOnly}`);
    console.log(`  Can write: ${collection.canWrite}`);
    console.log(`  Ciphers: ${collection.size}`);
  }

  // ========== WORK WITH COLLECTIONS ==========
  // Find writable collections
  const writable = client.collections.writable;
  console.log(`\nWritable collections: ${writable.size}`);

  // Create a collection in an organization (if admin)
  const adminOrg = client.organizations.admin.first();
  if (adminOrg) {
    console.log(`\nCreating collection in ${adminOrg.name}...`);
    try {
      const newCollection = await client.collections.create({
        name: 'Team Shared Passwords',
        organizationId: adminOrg.id,
      });
      console.log(`Created collection: ${newCollection.name}`);

      // Rename collection
      await newCollection.rename('Shared Credentials');
      console.log(`Renamed to: ${newCollection.name}`);

      // Add cipher to collection
      const sharedLogin = await client.createLogin({
        name: 'Team Slack',
        username: 'team@company.com',
        password: client.generatePassword(),
        organizationId: adminOrg.id,
        collectionIds: [newCollection.id],
      });
      console.log(`Created shared login: ${sharedLogin.name}`);

      // The cipher is now in the collection
      console.log(`Collection now has ${newCollection.size} ciphers`);
    } catch (error) {
      console.error('Error working with collection:', error);
    }
  }

  // ========== ORGANIZATION CIPHERS ==========
  console.log('\n--- Organization Ciphers ---');
  const totalOrgCiphers = client.organizations.totalCiphers;
  console.log(`Total ciphers in organizations: ${totalOrgCiphers}`);

  // Find ciphers by organization
  const firstOrg = client.organizations.cache.first();
  if (firstOrg) {
    console.log(`\nCiphers in ${firstOrg.name}:`);
    for (const [, cipher] of firstOrg.ciphers) {
      console.log(`  - ${cipher.name}`);
    }
  }

  client.logout();
}

function getRoleName(type: OrganizationUserType): string {
  switch (type) {
    case OrganizationUserType.Owner:
      return 'Owner';
    case OrganizationUserType.Admin:
      return 'Admin';
    case OrganizationUserType.User:
      return 'User';
    case OrganizationUserType.Manager:
      return 'Manager';
    case OrganizationUserType.Custom:
      return 'Custom';
    default:
      return 'Unknown';
  }
}

main().catch(console.error);
