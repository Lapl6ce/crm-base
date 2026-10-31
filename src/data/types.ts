/* ---------------------------------------------------------------------------
   Entity model + the repository contract (CONTEXT.md §1, §2).

   This file is the boundary. UI code imports from here; it never imports from
   data/mock. Swapping the mock adapter for a REST or SQL adapter means writing
   a new object that satisfies DataProvider — no UI file changes.

   Conventions:
     - IDs are opaque strings. Never parse them.
     - Timestamps are ISO-8601 strings, never Date: they cross a serialization
       boundary, and a real API will hand us strings anyway.
     - Money is a number of major units plus an explicit currency code.
   --------------------------------------------------------------------------- */

export type ID = string;
export type ISODateString = string;

/* --- users --------------------------------------------------------------- */

export type Role = 'admin' | 'sales_rep';

/** Which department's modules a user works in. Unset means "sees everything". */
export type Team = 'sales' | 'operations' | 'finance' | 'management';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  team?: Team;
  /** Token-derived hex, for initials chips. */
  avatarColor: string;
  createdAt: ISODateString;
}

/* --- companies ----------------------------------------------------------- */

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';

export interface Address {
  line1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface Company {
  id: ID;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  phone?: string;
  website?: string;
  address?: Address;
  ownerId: ID;
  tags: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- contacts ------------------------------------------------------------ */

export type ContactStatus = 'lead' | 'active' | 'inactive';

export interface Contact {
  id: ID;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: ID;
  /** The spec calls this "role"; renamed to avoid colliding with User.role. */
  jobTitle?: string;
  tags: string[];
  ownerId: ID;
  status: ContactStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- deals --------------------------------------------------------------- */

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: ID;
  title: string;
  value: number;
  currency: string;
  stageId: ID;
  status: DealStatus;
  contactId?: ID;
  companyId?: ID;
  ownerId: ID;
  expectedCloseDate?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Powers the heat stripe's staleness term. Set by the repository, not the UI. */
  stageEnteredAt: ISODateString;
}

/* --- tasks --------------------------------------------------------------- */

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: ID;
  title: string;
  description?: string;
  dueDate?: ISODateString;
  priority: Priority;
  completed: boolean;
  completedAt?: ISODateString;
  contactId?: ID;
  dealId?: ID;
  ownerId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- notes --------------------------------------------------------------- */

export type NoteParentType = 'contact' | 'company' | 'deal';

export interface Note {
  id: ID;
  body: string;
  entityType: NoteParentType;
  entityId: ID;
  authorId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- activity ------------------------------------------------------------ */

export type ActivityType =
  | 'contact.created'
  | 'company.created'
  | 'deal.created'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'task.created'
  | 'task.completed'
  | 'note.created';

export type ActivityEntityType = 'contact' | 'company' | 'deal' | 'task';

/**
 * The timeline substrate. Modules never write to each other — they emit events,
 * and the timeline module reads them. This is the one mechanism that lets a
 * contact's timeline show its deal's stage changes without a cross-module import.
 */
export interface ActivityEvent {
  id: ID;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: ID;
  actorId: ID;
  occurredAt: ISODateString;
  payload?: Record<string, unknown>;
  /** Denormalized links, so one indexed lookup answers "what happened here?". */
  relatedContactId?: ID;
  relatedCompanyId?: ID;
  relatedDealId?: ID;
}

/* --- settings ------------------------------------------------------------ */

export type StageOutcome = 'open' | 'won' | 'lost';

export interface PipelineStage {
  id: ID;
  name: string;
  order: number;
  /** Terminal stages drive Deal.status when a deal is dropped into them. */
  outcome: StageOutcome;
}

export interface CompanyProfile {
  name: string;
  logoUrl: string | null;
  accentColor: string;
}

export interface AppSettings {
  company: CompanyProfile;
  stages: PipelineStage[];
  defaultCurrency: string;
  demoMode: boolean;
  /** Stands in for a session until real auth exists. */
  currentUserId: ID;
}

/* --- query shapes -------------------------------------------------------- */

export type SortDirection = 'asc' | 'desc';

export interface ListQuery {
  search?: string;
  /** Field -> value. Arrays mean "any of"; undefined/null/'' are ignored. */
  filters?: Record<string, unknown>;
  sort?: { field: string; dir: SortDirection };
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* --- the repository contract --------------------------------------------- */

/**
 * Every repository is async, including the mock one. A synchronous mock would
 * let callers depend on synchronous reads, and swapping in a network adapter
 * would then break every one of them.
 */
export interface Repository<T, TCreate, TUpdate> {
  list(query?: ListQuery): Promise<Page<T>>;
  get(id: ID): Promise<T | null>;
  create(input: TCreate): Promise<T>;
  update(id: ID, patch: TUpdate): Promise<T>;
  delete(id: ID): Promise<void>;
}

/** Fields every adapter owns; callers never supply them. */
export type Managed = 'id' | 'createdAt' | 'updatedAt';

export class NotFoundError extends Error {
  constructor(entity: string, id: ID) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  /** Field name -> message, ready to feed a form. */
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>, message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/* --- Commerce Entities --------------------------------------------------- */

export interface Product {
  id: ID;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  unitCost: number;
  stock: number;
  stockOnHand: number;
  minStockLevel: number;
  reorderPoint: number;
  status: 'active' | 'low_stock' | 'out_of_stock' | 'archived';
  description?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Sale {
  id: ID;
  invoiceNumber: string;
  customerId: ID;
  customerName: string;
  total: number;
  totalAmount: number;
  currency: string;
  status: 'completed' | 'pending' | 'refunded' | 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod: string;
  paymentTerms: string;
  itemsCount: number;
  notes?: string;
  date: ISODateString;
  createdAt: ISODateString;
}

export interface Quotation {
  id: ID;
  quoteNumber: string;
  customerId?: ID;
  customerName: string;
  total: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  validUntil: ISODateString;
  itemsCount?: number;
  notes?: string;
  createdAt: ISODateString;
}

export interface Purchase {
  id: ID;
  poNumber: string;
  supplierId: ID;
  supplierName: string;
  total: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'ordered' | 'received' | 'partially_received' | 'cancelled';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  orderDate: ISODateString;
  expectedDate?: ISODateString;
  expectedDeliveryDate?: ISODateString;
  itemsCount?: number;
  createdAt: ISODateString;
}

export interface Order {
  id: ID;
  orderNumber: string;
  type: 'sales' | 'purchase';
  partyName: string;
  total: number;
  totalAmount: number;
  currency: string;
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  itemsCount: number;
  date: ISODateString;
  orderDate?: ISODateString;
  trackingNumber?: string;
  createdAt: ISODateString;
}

/* --- Operations Entities ------------------------------------------------- */

export interface Warehouse {
  id: ID;
  name: string;
  code: string;
  location: string;
  manager: string;
  capacityUnits: number;
  utilizationPercent?: number;
  utilizedUnits: number;
  totalSkus?: number;
  status: 'operational' | 'maintenance' | 'full' | 'active' | 'inactive';
  createdAt?: ISODateString;
}

export interface Shipment {
  id: ID;
  trackingNumber: string;
  orderNumber?: string;
  carrier: string;
  origin: string;
  destination: string;
  status: 'in_transit' | 'delivered' | 'delayed' | 'out_for_delivery' | 'exception' | 'pending' | 'customs_hold' | 'returned';
  dispatchDate?: ISODateString;
  estimatedArrival?: ISODateString;
  estimatedDelivery?: ISODateString;
  actualDelivery?: ISODateString;
  recipientName?: string;
  createdAt: ISODateString;
}

export interface SupplierRecord {
  id: ID;
  name: string;
  code: string;
  category: string;
  contactPerson: string;
  email: string;
  phone: string;
  paymentTerms: string;
  rating: number;
  activeContracts: number;
  city: string;
  country: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SupplierPerformance {
  id: ID;
  supplierId: ID;
  supplierName: string;
  onTimeDeliveryRate: number; // 0..100
  qualityAcceptanceRate?: number; // 0..100
  qualityScore: number;
  averageLeadDays?: number;
  leadTimeDays: number;
  fillRate?: number; // 0..100
  riskLevel?: 'low' | 'medium' | 'high';
  period: string;
  defectRate: number;
  spend: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'F';
  lastEvaluationDate?: ISODateString;
}

export interface CrmDocument {
  id: ID;
  title: string;
  name?: string;
  fileName: string;
  category: 'contract' | 'invoice' | 'proposal' | 'compliance' | 'spec';
  fileSize: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: ISODateString;
  relatedEntityName?: string;
  relatedType?: 'customer' | 'supplier' | 'deal' | 'general';
  relatedName?: string;
  url?: string;
  tags: string[];
}

/* --- Finance Entities ---------------------------------------------------- */

export interface Payment {
  id: ID;
  reference: string;
  referenceNumber: string;
  type: 'inbound' | 'outbound';
  amount: number;
  currency: string;
  method?: 'bank_transfer' | 'credit_card' | 'wire' | 'check' | string;
  paymentMethod?: 'bank_transfer' | 'credit_card' | 'wire' | 'check' | 'ach' | string;
  status: 'completed' | 'pending' | 'failed';
  partyName: string;
  date: ISODateString;
  createdAt: ISODateString;
}

export interface Expense {
  id: ID;
  title: string;
  category: 'software' | 'travel' | 'marketing' | 'office' | 'payroll' | 'legal' | string;
  amount: number;
  currency: string;
  approvedBy: string;
  date: ISODateString;
  receiptAttached: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: ISODateString;
}

export interface Receivable {
  id: ID;
  invoiceNumber: string;
  debtorName: string;
  customerName: string;
  amount: number;
  currency: string;
  issueDate: ISODateString;
  dueDate: ISODateString;
  agingBucket: '0-30' | '31-60' | '61-90' | '90+' | 'current' | string;
  status: 'current' | 'overdue' | 'collected' | 'pending' | 'paid';
}

export interface Payable {
  id: ID;
  billNumber: string;
  creditorName: string;
  supplierName: string;
  amount: number;
  currency: string;
  dueDate: ISODateString;
  paymentTerms?: string;
  paymentMethod?: string;
  status: 'unpaid' | 'scheduled' | 'overdue' | 'paid' | 'pending';
}

/* --- Administration Entities --------------------------------------------- */

export interface RoleDefinition {
  id: ID;
  name: string;
  code: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
  createdAt?: ISODateString;
}

export interface AutomationRule {
  id: ID;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  action: string;
  active: boolean;
  executionCount: number;
  lastTriggeredAt?: ISODateString;
  createdAt?: ISODateString;
}

/* --- Intelligence & AI --------------------------------------------------- */

export interface AIBusinessInsight {
  id: ID;
  title: string;
  summary: string;
  category: 'revenue' | 'risk' | 'operations' | 'efficiency';
  impact: 'high' | 'medium' | 'low';
  metricHighlight?: string;
  recommendation: string;
  createdAt: ISODateString;
}

export interface CommunicationLog {
  id: ID;
  type: 'email' | 'call' | 'meeting' | 'note' | 'sms';
  subject: string;
  summary: string;
  contactName: string;
  contactEmail?: string;
  companyName?: string;
  direction: 'inbound' | 'outbound' | 'internal';
  status: 'completed' | 'scheduled' | 'missed' | 'draft';
  date: ISODateString;
  durationMinutes?: number;
  userName: string;
  tags?: string[];
  createdAt?: ISODateString;
}

