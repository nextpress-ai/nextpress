import {
	eq,
	desc,
	asc,
	and,
	count,
	not,
	gt,
	gte,
	lt,
	lte,
	like,
	ilike,
	inArray,
	notInArray,
	type SQL,
} from "drizzle-orm";
import type { Table, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { db } from "../server/db";

// Generic database type that supports both Neon and PGlite
// Using 'any' for maximum compatibility since both drivers have compatible APIs at runtime
export type DatabaseInstance = any;
export type TransactionInstance = any;

// Filter types
export interface PropertyFilter {
	where: string;
	equals?: unknown;
	notEquals?: unknown;
	greaterThan?: unknown;
	greaterThanOrEqual?: unknown;
	lessThan?: unknown;
	lessThanOrEqual?: unknown;
	like?: string;
	ilike?: string;
	in?: unknown[];
	notIn?: unknown[];
}

export interface SQLFilter {
	sql: SQL;
}

export type Filter = PropertyFilter | SQLFilter;

// Order types
export interface OrderBy {
	property: string;
	order: "ascending" | "descending";
}

export interface SQLOrder {
	sql: SQL;
}

export type OrderByOption = OrderBy | SQLOrder;

// Options interfaces
export interface FindManyOptions {
	limit?: number;
	offset?: number;
	orderBy?: OrderByOption;
	where?: string;
	equals?: unknown;
	notEquals?: unknown;
	greaterThan?: unknown;
	greaterThanOrEqual?: unknown;
	lessThan?: unknown;
	lessThanOrEqual?: unknown;
	like?: string;
	ilike?: string;
	in?: unknown[];
	notIn?: unknown[];
}

export interface CountOptions {
	where?: Filter[] | SQL;
}

// Relations interface for Drizzle relations
export interface WithRelations {
	[key: string]: boolean | WithRelations;
}

// Removed QueryBuilder interface - all methods execute immediately

// Generic model interface with user-friendly types
export interface ModelOperations<TSelect, TInsert> {
	// Basic CRUD
	findById(id: string): Promise<TSelect | undefined>;
	findMany(options?: FindManyOptions): Promise<TSelect[]>;
	findManyWith(
		options: FindManyOptions,
		relations: WithRelations,
	): Promise<TSelect[]>;
	findFirst(where: Filter[] | SQL): Promise<TSelect | undefined>;
	findFirstWith(
		where: Filter[] | SQL,
		relations: WithRelations,
	): Promise<TSelect | undefined>;
	create(data: TInsert): Promise<TSelect>;
	update(id: string, data: Partial<TSelect>): Promise<TSelect>;
	delete(id: string): Promise<void>;
	count(options?: CountOptions): Promise<number>;
	findManyWhere(
		where: Filter[] | SQL,
		options?: FindManyOptions,
	): Promise<TSelect[]>;
	upsert(data: TInsert & { id: string }): Promise<TSelect>;
}

// Helper function to build SQL from filters
function buildWhereClause<TTable extends Table>(
	table: TTable,
	filters: Filter[] | SQL,
): SQL | undefined {
	if (Array.isArray(filters)) {
		if (filters.length === 0) return undefined;

		const conditions = filters.map((filter) => {
			// Guard clause for SQL filters
			if ("sql" in filter) {
				return filter.sql;
			}

			const {
				where,
				equals,
				notEquals,
				greaterThan,
				greaterThanOrEqual,
				lessThan,
				lessThanOrEqual,
				like: likeValue,
				ilike: ilikeValue,
				in: inValues,
				notIn,
			} = filter;

			const column = table[where as keyof typeof table] as any;

			// Guard clause for invalid columns
			if (!column) {
				throw new Error(`Column '${where}' does not exist on table`);
			}

			// Object lookup for operators (project convention)
			const operatorMap = {
				equals: () => (equals ? eq(column, equals) : null),
				notEquals: () => (notEquals ? not(eq(column, notEquals)) : null),
				greaterThan: () => (greaterThan ? gt(column, greaterThan) : null),
				greaterThanOrEqual: () =>
					greaterThanOrEqual ? gte(column, greaterThanOrEqual) : null,
				lessThan: () => (lessThan ? lt(column, lessThan) : null),
				lessThanOrEqual: () =>
					lessThanOrEqual ? lte(column, lessThanOrEqual) : null,
				like: () => (likeValue ? like(column, likeValue) : null),
				ilike: () => (ilikeValue ? ilike(column, ilikeValue) : null),
				in: () => (inValues ? inArray(column, inValues) : null),
				notIn: () => (notIn ? notInArray(column, notIn) : null),
			};

			// Find the first defined operator and execute it
			for (const [operator, handler] of Object.entries(operatorMap)) {
				if (filter[operator as keyof typeof filter]) {
					const result = handler();
					if (result !== null) {
						return result;
					}
				}
			}

			throw new Error(`No operator provided for where '${where}'`);
		});

		return conditions.length === 1 ? conditions[0] : and(...conditions);
	}

	return filters;
}

// Helper function to build order clause
function buildOrderClause<TTable extends Table>(
	table: TTable,
	orderBy: OrderByOption | undefined,
): SQL[] {
	if (!orderBy) {
		// Default ordering by createdAt if available
		if ("createdAt" in table) {
			return [desc((table as any).createdAt)];
		}
		return [];
	}

	// Guard clause for SQL orders
	if ("sql" in orderBy) {
		return [orderBy.sql];
	}

	// Handle property-based ordering
	const { property, order } = orderBy;
	const column = table[property as keyof typeof table] as any;

	// Guard clause for invalid columns
	if (!column) {
		throw new Error(`Column '${property}' does not exist on table`);
	}

	return order === "descending" ? [desc(column)] : [asc(column)];
}

// Generic model factory with transaction support
export function createModel<TTable extends Table>(
	table: TTable,
	dbInstance: DatabaseInstance,
): ModelOperations<InferSelectModel<TTable>, InferInsertModel<TTable>> {
	type TSelect = InferSelectModel<TTable>;
	type TInsert = InferInsertModel<TTable>;

	// Type-safe table casting for dynamic column access
	const tableAny = table as Record<string, any>;
	const tableTyped = table as any; // For Drizzle query operations

	return {
		/**
		 * Find a record by its UUID primary key
		 * @param id - The UUID of the record to find
		 * @returns The found record or undefined if not found
		 * @example
		 * const user = await userModel.findById('user-uuid-123');
		 */
		async findById(id: string): Promise<TSelect | undefined> {
			const results = await dbInstance
				.select()
				.from(tableTyped)
				.where(eq(tableAny.id, id));
			return results[0] as TSelect | undefined;
		},

		/**
		 * Find multiple records with optional filtering and ordering
		 * Executes immediately and returns actual data
		 * @param options - Filtering, pagination, and ordering options
		 * @returns Array of matching records
		 * @example
		 * const posts = await postModel.findMany({ where: 'status', equals: 'published', orderBy: { property: 'createdAt', order: 'descending' } });
		 */
		async findMany(options: FindManyOptions = {}): Promise<TSelect[]> {
			const {
				limit = 50,
				offset = 0,
				orderBy,
				where,
				equals,
				notEquals,
				greaterThan,
				greaterThanOrEqual,
				lessThan,
				lessThanOrEqual,
				like: likeValue,
				ilike: ilikeValue,
				in: inValues,
				notIn,
			} = options;

			let query: any = dbInstance.select().from(tableTyped);

			// Handle shorthand filters with guard clauses and object lookup
			if (where) {
				const column = tableAny[where];
				// Guard clause for invalid columns
				if (!column) {
					throw new Error(`Column '${where}' does not exist on table`);
				}

				// Object lookup for operators (project convention)
				const operatorMap = {
					equals: () => (equals ? query.where(eq(column, equals)) : null),
					notEquals: () =>
						notEquals ? query.where(not(eq(column, notEquals))) : null,
					greaterThan: () =>
						greaterThan ? query.where(gt(column, greaterThan)) : null,
					greaterThanOrEqual: () =>
						greaterThanOrEqual
							? query.where(gte(column, greaterThanOrEqual))
							: null,
					lessThan: () => (lessThan ? query.where(lt(column, lessThan)) : null),
					lessThanOrEqual: () =>
						lessThanOrEqual ? query.where(lte(column, lessThanOrEqual)) : null,
					like: () => (likeValue ? query.where(like(column, likeValue)) : null),
					ilike: () =>
						ilikeValue ? query.where(ilike(column, ilikeValue)) : null,
					in: () => (inValues ? query.where(inArray(column, inValues)) : null),
					notIn: () => (notIn ? query.where(notInArray(column, notIn)) : null),
				};

				// Find the first defined operator and execute it
				for (const [operator, handler] of Object.entries(operatorMap)) {
					if (options[operator as keyof typeof options]) {
						const result = handler();
						if (result !== null) {
							query = result;
							break;
						}
					}
				}
			}

			// Apply ordering
			const orderClauses = buildOrderClause(table, orderBy);
			if (orderClauses.length > 0) {
				query = query.orderBy(...orderClauses);
			}

			query = query.limit(limit).offset(offset);

			// Execute immediately and return actual data
			return (await query) as TSelect[];
		},

		/**
		 * Find multiple records with related data using Drizzle relations
		 * Avoids N+1 queries by loading related data in a single query
		 * @param options - Filtering and pagination options
		 * @param relations - Object specifying which relations to include
		 * @returns Array of records with related data
		 * @example
		 * const posts = await postModel.findManyWith(
		 *   { where: 'status', equals: 'published' },
		 *   { author: true, comments: true }
		 * );
		 */
		async findManyWith(
			options: FindManyOptions,
			relations: WithRelations,
		): Promise<TSelect[]> {
			// Note: This is a simplified implementation. In a real implementation,
			// you would use Drizzle's query API with relations
			const { limit = 50, offset = 0 } = options;

			let query: any = dbInstance.select().from(tableTyped);

			// Apply filters (same logic as findMany)
			const {
				where,
				equals,
				notEquals,
				greaterThan,
				greaterThanOrEqual,
				lessThan,
				lessThanOrEqual,
				like: likeValue,
				ilike: ilikeValue,
				in: inValues,
				notIn,
			} = options;

			// Apply filters with guard clauses and object lookup
			if (where) {
				const column = tableAny[where];
				// Guard clause for invalid columns
				if (!column) {
					throw new Error(`Column '${where}' does not exist on table`);
				}

				// Object lookup for operators (project convention)
				const operatorMap = {
					equals: () => (equals ? query.where(eq(column, equals)) : null),
					notEquals: () =>
						notEquals ? query.where(not(eq(column, notEquals))) : null,
					greaterThan: () =>
						greaterThan ? query.where(gt(column, greaterThan)) : null,
					greaterThanOrEqual: () =>
						greaterThanOrEqual
							? query.where(gte(column, greaterThanOrEqual))
							: null,
					lessThan: () => (lessThan ? query.where(lt(column, lessThan)) : null),
					lessThanOrEqual: () =>
						lessThanOrEqual ? query.where(lte(column, lessThanOrEqual)) : null,
					like: () => (likeValue ? query.where(like(column, likeValue)) : null),
					ilike: () =>
						ilikeValue ? query.where(ilike(column, ilikeValue)) : null,
					in: () => (inValues ? query.where(inArray(column, inValues)) : null),
					notIn: () => (notIn ? query.where(notInArray(column, notIn)) : null),
				};

				// Find the first defined operator and execute it
				for (const [operator, handler] of Object.entries(operatorMap)) {
					if (options[operator as keyof typeof options]) {
						const result = handler();
						if (result !== null) {
							query = result;
							break;
						}
					}
				}
			}

			// TODO: Implement actual relation loading using Drizzle's query API
			// For now, return basic query results
			return (await query.limit(limit).offset(offset)) as TSelect[];
		},

		/**
		 * Find the first record matching the given filters
		 * @param where - Array of filters or raw SQL condition
		 * @returns The first matching record or undefined if none found
		 * @example
		 * const user = await userModel.findFirst([{ where: 'username', equals: 'kizz' }]);
		 */
		async findFirst(where: Filter[] | SQL): Promise<TSelect | undefined> {
			const whereClause = buildWhereClause(table, where);

			let query: any = dbInstance.select().from(tableTyped);
			if (whereClause) {
				query = query.where(whereClause);
			}

			const results = await query.limit(1);
			return results[0] as TSelect | undefined;
		},

		/**
		 * Find the first record with related data using Drizzle relations
		 * @param where - Array of filters or raw SQL condition
		 * @param relations - Object specifying which relations to include
		 * @returns The first matching record with related data or undefined if none found
		 * @example
		 * const user = await userModel.findFirstWith(
		 *   [{ where: 'username', equals: 'kizz' }],
		 *   { posts: true, comments: true }
		 * );
		 */
		async findFirstWith(
			where: Filter[] | SQL,
			relations: WithRelations,
		): Promise<TSelect | undefined> {
			const whereClause = buildWhereClause(table, where);

			let query: any = dbInstance.select().from(tableTyped);
			if (whereClause) {
				query = query.where(whereClause);
			}

			// TODO: Implement actual relation loading using Drizzle's query API
			// For now, return basic query result
			const results = await query.limit(1);
			return results[0] as TSelect | undefined;
		},

		/**
		 * Create a new record
		 * @param data - The data to insert
		 * @returns The created record
		 * @example
		 * const user = await userModel.create({ username: 'newuser', email: 'user@example.com' });
		 */
		async create(data: TInsert): Promise<TSelect> {
			const results = await dbInstance
				.insert(tableTyped)
				.values(data as any)
				.returning();
			return (results as any)[0] as TSelect;
		},

		/**
		 * Update a record by its UUID
		 * Automatically updates the updatedAt timestamp if the field exists
		 * @param id - The UUID of the record to update
		 * @param data - The data to update (partial of the select type)
		 * @returns The updated record
		 * @example
		 * const user = await userModel.update('user-uuid', { firstName: 'John' });
		 */
		async update(id: string, data: Partial<TSelect>): Promise<TSelect> {
			const updateData = { ...data };

			// Auto-update updatedAt if field exists
			if ("updatedAt" in table) {
				(updateData as any).updatedAt = new Date();
			}

			const results = await dbInstance
				.update(tableTyped)
				.set(updateData as any)
				.where(eq(tableAny.id, id))
				.returning();
			return (results as any)[0] as TSelect;
		},

		/**
		 * Delete a record by its UUID
		 * @param id - The UUID of the record to delete
		 * @example
		 * await userModel.delete('user-uuid');
		 */
		async delete(id: string): Promise<void> {
			await dbInstance.delete(tableTyped).where(eq(tableAny.id, id));
		},

		/**
		 * Count records matching the given filters
		 * @param options - Optional filters for counting
		 * @returns The count of matching records
		 * @example
		 * const count = await postModel.count({ where: [{ where: 'status', equals: 'published' }] });
		 */
		async count(options: CountOptions = {}): Promise<number> {
			let query: any = dbInstance.select({ count: count() }).from(tableTyped);

			if (options.where) {
				const whereClause = buildWhereClause(table, options.where);
				if (whereClause) {
					query = query.where(whereClause);
				}
			}

			const results = await query;
			return results[0].count;
		},

		/**
		 * Find multiple records with explicit filters
		 * @param where - Array of filters or raw SQL condition
		 * @param options - Additional options for pagination and ordering
		 * @returns Array of matching records
		 * @example
		 * const posts = await postModel.findManyWhere([
		 *   { where: 'status', equals: 'published' },
		 *   { where: 'createdAt', greaterThan: new Date('2024-01-01') }
		 * ]);
		 */
		async findManyWhere(
			where: Filter[] | SQL,
			options: FindManyOptions = {},
		): Promise<TSelect[]> {
			const { limit = 50, offset = 0, orderBy } = options;

			const whereClause = buildWhereClause(table, where);

			let query: any = dbInstance.select().from(tableTyped);

			if (whereClause) {
				query = query.where(whereClause);
			}

			// Apply ordering
			const orderClauses = buildOrderClause(table, orderBy);
			if (orderClauses.length > 0) {
				query = query.orderBy(...orderClauses);
			}

			return (await query.limit(limit).offset(offset)) as TSelect[];
		},

		/**
		 * Insert or update a record (upsert)
		 * @param data - The data to insert or update, must include id
		 * @returns The upserted record
		 * @example
		 * const user = await userModel.upsert({ id: 'user-uuid', username: 'kizz', email: 'kizz@example.com' });
		 */
		async upsert(data: TInsert & { id: string }): Promise<TSelect> {
			const results = await dbInstance
				.insert(tableTyped)
				.values(data as any)
				.onConflictDoUpdate({
					target: tableAny.id,
					set: {
						...data,
						updatedAt: new Date(),
					} as any,
				})
				.returning();
			return (results as any)[0] as TSelect;
		},
	};
}

// Transaction helper
export function withTransaction<T>(
	callback: (tx: TransactionInstance) => Promise<T>,
): Promise<T> {
	return db.transaction(callback as any);
}
