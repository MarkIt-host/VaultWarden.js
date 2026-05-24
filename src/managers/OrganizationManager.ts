/**
 * Organization manager for organization operations
 * @module managers
 */

import { EntityCache } from '../cache/BaseCache.js';
import { CachedManager } from './BaseManager.js';
import { OrganizationStructure } from '../structures/OrganizationStructure.js';
import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import type { APIOrganization, APISyncResponse } from '../types/index.js';
import { NotFoundError } from '../errors/index.js';

/** Organization resolvable type */
export type OrganizationResolvable = string | OrganizationStructure;

/**
 * Manager for organization operations
 */
export class OrganizationManager extends CachedManager<string, OrganizationStructure> {
  /** Cache of all organizations */
  public readonly cache: EntityCache<OrganizationStructure> = new EntityCache();

  constructor(client: VaultwardenClient) {
    super(client);
  }

  /**
   * Get resource name for errors
   */
  protected get resourceName(): string {
    return 'Organization';
  }

  /**
   * Resolve an organization from various input types
   */
  resolve(resolvable: OrganizationResolvable): OrganizationStructure | null {
    if (typeof resolvable === 'string') {
      return this.cache.get(resolvable) ?? null;
    }
    return resolvable;
  }

  /**
   * Resolve an organization ID from various input types
   */
  resolveId(resolvable: OrganizationResolvable): string | null {
    if (typeof resolvable === 'string') return resolvable;
    return resolvable.id;
  }

  /**
   * Add an organization to cache
   */
  private _add(data: APIOrganization): OrganizationStructure {
    const org = new OrganizationStructure(this.client, data);
    this.cache.set(org.id, org);
    return org;
  }

  /**
   * Sync organizations from server
   */
  async sync(): Promise<this> {
    this.ensureReady();

    const response = await this.client.rest.get('/api/sync') as APISyncResponse;

    this.cache.clear();
    for (const org of response.profile.organizations ?? []) {
      this._add(org);
    }

    return this;
  }

  /**
   * Fetch an organization by ID
   */
  override async fetch(id: string): Promise<OrganizationStructure | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    await this.sync();
    return this.cache.get(id) ?? null;
  }

  /**
   * Fetch or throw
   */
  async fetchOrThrow(id: string): Promise<OrganizationStructure> {
    const org = await this.fetch(id);
    if (!org) {
      throw NotFoundError.organization(id);
    }
    return org;
  }

  /**
   * Get organizations where user is owner
   */
  get owned(): import('../utils/Collection.js').Collection<string, OrganizationStructure> {
    return this.cache.filter((o) => o.isOwner);
  }

  /**
   * Get organizations where user is admin
   */
  get admin(): import('../utils/Collection.js').Collection<string, OrganizationStructure> {
    return this.cache.filter((o) => o.isAdmin);
  }

  /**
   * Get organizations where user is manager
   */
  get managed(): import('../utils/Collection.js').Collection<string, OrganizationStructure> {
    return this.cache.filter((o) => o.isManager);
  }

  /**
   * Get confirmed organizations
   */
  get confirmed(): import('../utils/Collection.js').Collection<string, OrganizationStructure> {
    return this.cache.filter((o) => o.isConfirmed);
  }

  /**
   * Find organization by name
   */
  findByName(name: string): OrganizationStructure | undefined {
    const lowerName = name.toLowerCase();
    return this.cache.find((o) => o.name.toLowerCase() === lowerName);
  }

  /**
   * Get total ciphers across all organizations
   */
  get totalCiphers(): number {
    return this.cache.reduce((sum, org) => sum + org.ciphers.size, 0);
  }

  /**
   * Get total collections across all organizations
   */
  get totalCollections(): number {
    return this.cache.reduce((sum, org) => sum + org.collections.size, 0);
  }
}
