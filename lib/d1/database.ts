export type SqlValue = string | number | null;
export interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { rows_read?: number; rows_written?: number; changes?: number };
}
export interface Statement {
  bind(...values: SqlValue[]): Statement;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]>;
}
export class DataServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "DataServiceError";
  }
}
