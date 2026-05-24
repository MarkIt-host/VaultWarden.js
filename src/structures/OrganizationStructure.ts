/**
 * Organization structure
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseIdentifiable } from './BaseStructure.js';
import { Collection } from '../utils/Collection.js';
import { OrganizationUserType, OrganizationUserStatus } from '../types/index.js';
import type { APIOrganization } from '../types/index.js';

/**
 * Organization for shared vault access
 */
export class OrganizationStructure extends BaseIdentifiable {
  /** Organization ID */
  public readonly id: string;

  /** Organization name */
  public name: string;

  /** Whether policies are enabled */
  public usePolicies: boolean;

  /** Whether SSO is enabled */
  public useSso: boolean;

  /** Whether Key Connector is enabled */
  public useKeyConnector: boolean;

  /** Whether SCIM is enabled */
  public useScim: boolean;

  /** Whether custom permissions are enabled */
  public useCustomPermissions: boolean;

  /** Whether reset password is enabled */
  public useResetPassword: boolean;

  /** Number of seats */
  public seats: number;

  /** Maximum collections */
  public maxCollections: number;

  /** Maximum storage in GB */
  public maxStorageGb: number | null;

  /** User status in organization */
  public status: OrganizationUserStatus;

  /** User type in organization */
  public type: OrganizationUserType;

  /** Whether organization is enabled */
  public enabled: boolean;

  /** Whether organization has keys */
  public hasPublicAndPrivateKeys: boolean;

  constructor(client: VaultwardenClient, data: APIOrganization) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.usePolicies = data.usePolicies;
    this.useSso = data.useSso;
    this.useKeyConnector = data.useKeyConnector;
    this.useScim = data.useScim;
    this.useCustomPermissions = data.useCustomPermissions;
    this.useResetPassword = data.useResetPassword;
    this.seats = data.seats;
    this.maxCollections = data.maxCollections;
    this.maxStorageGb = data.maxStorageGb ?? null;
    this.status = data.status;
    this.type = data.type;
    this.enabled = data.enabled;
    this.hasPublicAndPrivateKeys = data.hasPublicAndPrivateKeys;
  }

  /**
   * Get collections in this organization
   */
  get collections(): Collection<string, import('./CollectionStructure.js').CollectionStructure> {
    return this.client.collections.cache.filter(
      (c) => c.organizationId === this.id
    ) as Collection<string, import('./CollectionStructure.js').CollectionStructure>;
  }

  /**
   * Get ciphers in this organization
   */
  get ciphers() {
    return this.client.ciphers.cache.filter(
      (c) => c.organizationId === this.id
    );
  }

  /**
   * Check if user is an owner
   */
  get isOwner(): boolean {
    return this.type === OrganizationUserType.Owner;
  }

  /**
   * Check if user is an admin
   */
  get isAdmin(): boolean {
    return this.type === OrganizationUserType.Admin || this.isOwner;
  }

  /**
   * Check if user is a manager
   */
  get isManager(): boolean {
    return this.type === OrganizationUserType.Manager || this.isAdmin;
  }

  /**
   * Check if user is confirmed
   */
  get isConfirmed(): boolean {
    return this.status === OrganizationUserStatus.Confirmed;
  }

  /**
   * Fetch collections for this organization
   */
  async fetchCollections(): Promise<
    Collection<string, import('./CollectionStructure.js').CollectionStructure>
  > {
    await this.client.collections.sync();
    return this.collections;
  }

  /**
   * Create a collection in this organization
   * @param name Collection name
   */
  async createCollection(name: string): Promise<import('./CollectionStructure.js').CollectionStructure> {
    return this.client.collections.create({
      name,
      organizationId: this.id,
    });
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      enabled: this.enabled,
      isOwner: this.isOwner,
      isAdmin: this.isAdmin,
      isManager: this.isManager,
      isConfirmed: this.isConfirmed,
      collections: this.collections.size,
    };
  }

  /**
   * String representation
   */
  toString(): string {
    return this.name;
  }

  /**
   * Primitive value
   */
  valueOf(): string {
    return this.id;
  }
}
