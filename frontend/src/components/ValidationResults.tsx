import React from 'react';
import './ValidationResults.css';

interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
}

interface TableValidation {
  table_name: string;
  source_exists: boolean;
  destination_exists: boolean;
  schema_match: boolean;
  source_row_count: number;
  destination_row_count: number;
  source_columns?: ColumnInfo[];
  destination_columns?: ColumnInfo[];
  warnings?: string[];
  missing_in_destination?: string[];
  missing_in_source?: string[];
  type_mismatches?: { column: string; source_type: string; dest_type: string }[];
}

interface ValidationData {
  success: boolean;
  validation: TableValidation[];
  overall: {
    total_tables: number;
    tables_ok: number;
    tables_with_issues: number;
  };
}

interface ValidationResultsProps {
  data: ValidationData;
  isLoading?: boolean;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return <div className="validation-results loading">Loading validation results...</div>;
  }

  if (!data || !data.validation) {
    return null;
  }

  const getRowStatus = (column: ColumnInfo, destColumns?: ColumnInfo[]): string => {
    if (!destColumns) return 'missing-in-dest';
    
    const destCol = destColumns.find(c => c.name === column.name);
    if (!destCol) return 'missing-in-dest';
    
    if (column.type !== destCol.type) return 'type-mismatch';
    
    return 'ok';
  };

  return (
    <div className={`validation-results ${data.success ? 'success' : 'error'}`}>
      <div className="validation-summary">
        <div className="summary-stat">
          <span className="label">Total Tables:</span>
          <span className="value">{data.overall.total_tables}</span>
        </div>
        <div className="summary-stat">
          <span className="label">OK:</span>
          <span className="value ok">{data.overall.tables_ok}</span>
        </div>
        {data.overall.tables_with_issues > 0 && (
          <div className="summary-stat">
            <span className="label">Issues:</span>
            <span className="value warning">{data.overall.tables_with_issues}</span>
          </div>
        )}
      </div>

      <div className="table-validations">
        {data.validation.map((tableValidation, idx) => (
          <div key={idx} className={`table-validation-card ${tableValidation.schema_match ? 'success' : 'warning'}`}>
            <div className="table-header">
              <h4>
                {tableValidation.schema_match ? '✓' : '⚠'} {tableValidation.table_name}
              </h4>
              <div className="table-status">
                {tableValidation.source_exists && (
                  <span className="status-badge source">Source: {tableValidation.source_row_count} rows</span>
                )}
                {tableValidation.destination_exists && (
                  <span className="status-badge destination">Dest: {tableValidation.destination_row_count} rows</span>
                )}
              </div>
            </div>

            {!tableValidation.source_exists && (
              <div className="alert alert-error">Table not found in source database</div>
            )}
            {!tableValidation.destination_exists && (
              <div className="alert alert-warning">Table not found in destination database (will be created)</div>
            )}

            {tableValidation.source_columns && tableValidation.destination_columns && (
              <div className="schema-comparison">
                <h5>Schema Comparison</h5>
                <table className="schema-table">
                  <thead>
                    <tr>
                      <th>Column Name</th>
                      <th>Source Type</th>
                      <th>Destination Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableValidation.source_columns.map((col, colIdx) => {
                      const status = getRowStatus(col, tableValidation.destination_columns);
                      const destCol = tableValidation.destination_columns?.find(c => c.name === col.name);
                      
                      return (
                        <tr key={colIdx} className={`status-${status}`}>
                          <td className="column-name">{col.name}</td>
                          <td>{col.type}</td>
                          <td>{destCol ? destCol.type : '-'}</td>
                          <td className="status">
                            {status === 'ok' && <span className="badge ok">✓ OK</span>}
                            {status === 'missing-in-dest' && <span className="badge warning">⚠ Missing</span>}
                            {status === 'type-mismatch' && <span className="badge error">✗ Mismatch</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tableValidation.warnings && tableValidation.warnings.length > 0 && (
              <div className="warnings">
                <h5>Warnings</h5>
                <ul>
                  {tableValidation.warnings.map((warning, widx) => (
                    <li key={widx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {tableValidation.missing_in_destination && tableValidation.missing_in_destination.length > 0 && (
              <div className="missing-columns">
                <h5>Columns Missing in Destination</h5>
                <p className="column-list">{tableValidation.missing_in_destination.join(', ')}</p>
              </div>
            )}

            {tableValidation.missing_in_source && tableValidation.missing_in_source.length > 0 && (
              <div className="missing-columns">
                <h5>Extra Columns in Destination</h5>
                <p className="column-list">{tableValidation.missing_in_source.join(', ')}</p>
              </div>
            )}

            {tableValidation.type_mismatches && tableValidation.type_mismatches.length > 0 && (
              <div className="type-mismatches">
                <h5>Type Mismatches</h5>
                <ul>
                  {tableValidation.type_mismatches.map((mismatch, midx) => (
                    <li key={midx}>
                      <strong>{mismatch.column}:</strong> {mismatch.source_type} → {mismatch.dest_type}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationResults;
