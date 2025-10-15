export interface StorageConfig {
  type: 'mysql' | 'parquet' | 'delta';
  accessMethod?: 'direct' | 'sparksession';
  label?: string;
  message?: string;
}