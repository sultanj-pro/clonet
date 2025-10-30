import React, { useState } from 'react';
import { getConnections, getTablesForConnection, ConnectionConfig } from '../services/connectionsApi';
import { testRunJob } from '../services/jobsApi';
import ConnectionDialog from './ConnectionDialog';
import './JobWizard.css';

interface JobWizardProps {
  onClose: () => void;
  onSubmit: (jobData: any) => void;
}

interface JobData {
  name: string;
  description: string;
  sourceConnectionId: string;
  sourceTables: string[];
  destinationConnectionId: string;
  writeMode: 'overwrite' | 'append';
  batchSize: number;
  scheduleType: 'now' | 'scheduled';
}

const JobWizard: React.FC<JobWizardProps> = ({ onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  
  const [jobData, setJobData] = useState<JobData>({
    name: '',
    description: '',
    sourceConnectionId: '',
    sourceTables: [],
    destinationConnectionId: '',
    writeMode: 'overwrite',
    batchSize: 1000,
    scheduleType: 'now'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTestingJob, setIsTestingJob] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; result?: any } | null>(null);

  const loadConnections = async () => {
    try {
      setLoadingConnections(true);
      const data = await getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
      setErrors({ connections: 'Failed to load connections. Please try again.' });
    } finally {
      setLoadingConnections(false);
    }
  };

  const fetchTables = async (connectionId: string) => {
    setLoadingTables(true);
    try {
      const tables = await getTablesForConnection(parseInt(connectionId));
      setAvailableTables(tables);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      setErrors({ tables: 'Failed to fetch tables. Please try again.' });
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextStep = currentStep + 1;
      
      // Load connections when entering step 2 (Source) or step 4 (Destination)
      if (nextStep === 2 || nextStep === 4) {
        loadConnections();
      }
      
      // Fetch tables when moving from step 2 to step 3
      if (currentStep === 2 && jobData.sourceConnectionId && availableTables.length === 0) {
        fetchTables(jobData.sourceConnectionId);
      }
      
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleConnectionCreated = (newConnection: ConnectionConfig) => {
    loadConnections(); // Reload connections list
    setShowConnectionDialog(false); // Close the dialog
    
    // Auto-select the newly created connection based on current step
    if (currentStep === 2) {
      setJobData({ ...jobData, sourceConnectionId: newConnection.id?.toString() || '' });
    } else if (currentStep === 4) {
      setJobData({ ...jobData, destinationConnectionId: newConnection.id?.toString() || '' });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!jobData.name.trim()) {
          newErrors.name = 'Job name is required';
        }
        break;
      case 2:
        if (!jobData.sourceConnectionId) {
          newErrors.sourceConnection = 'Please select a source connection';
        }
        break;
      case 3:
        if (jobData.sourceTables.length === 0) {
          newErrors.sourceTables = 'Please select at least one table';
        }
        break;
      case 4:
        if (!jobData.destinationConnectionId) {
          newErrors.destinationConnection = 'Please select a destination connection';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onSubmit(jobData);
      onClose();
    }
  };

  const handleTestRun = async () => {
    try {
      setIsTestingJob(true);
      setTestResult(null);
      
      const result = await testRunJob({
        name: jobData.name,
        description: jobData.description,
        source_connection_id: parseInt(jobData.sourceConnectionId),
        destination_connection_id: parseInt(jobData.destinationConnectionId),
        tables: jobData.sourceTables,
        write_mode: jobData.writeMode,
        batch_size: jobData.batchSize
      });
      
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test run failed'
      });
    } finally {
      setIsTestingJob(false);
    }
  };

  const handleTableToggle = (table: string) => {
    setJobData(prev => ({
      ...prev,
      sourceTables: prev.sourceTables.includes(table)
        ? prev.sourceTables.filter(t => t !== table)
        : [...prev.sourceTables, table]
    }));
  };

  const getConnectionName = (id: string) => {
    const conn = connections.find(c => c.id?.toString() === id);
    return conn ? conn.name : 'Unknown';
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5, 6].map(step => (
        <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 && 'Details'}
            {step === 2 && 'Source'}
            {step === 3 && 'Tables'}
            {step === 4 && 'Destination'}
            {step === 5 && 'Options'}
            {step === 6 && 'Review'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="wizard-step">
      <h3>Job Details</h3>
      <p className="step-description">Give your clone job a name and description</p>
      
      <div className="form-group">
        <label htmlFor="jobName">Job Name *</label>
        <input
          id="jobName"
          type="text"
          value={jobData.name}
          onChange={(e) => setJobData({ ...jobData, name: e.target.value })}
          placeholder="e.g., Daily Customer Data Sync"
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="jobDescription">Description (optional)</label>
        <textarea
          id="jobDescription"
          value={jobData.description}
          onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
          placeholder="Describe what this job does..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="wizard-step">
      <h3>Select Source Connection</h3>
      <p className="step-description">Choose the database to clone data from</p>

      {loadingConnections ? (
        <div className="loading">Loading connections...</div>
      ) : connections.length === 0 ? (
        <div className="no-connections">
          <p>No connections available. You need to create a connection first.</p>
          <button className="add-connection-btn" onClick={() => setShowConnectionDialog(true)}>
            + Add New Connection
          </button>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="sourceConnection">Source Connection *</label>
            <select
              id="sourceConnection"
              value={jobData.sourceConnectionId}
              onChange={(e) => setJobData({ ...jobData, sourceConnectionId: e.target.value })}
              className={errors.sourceConnection ? 'error' : ''}
            >
              <option value="">-- Select a connection --</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id?.toString() || ''}>
                  {conn.name} ({conn.type} - {conn.host}:{conn.port})
                </option>
              ))}
            </select>
            {errors.sourceConnection && <span className="error-message">{errors.sourceConnection}</span>}
          </div>

          <button className="add-connection-btn secondary" onClick={() => setShowConnectionDialog(true)}>
            + Add New Connection
          </button>
        </>
      )}

      {errors.connections && <div className="error-message">{errors.connections}</div>}
    </div>
  );

  const renderStep3 = () => (
    <div className="wizard-step">
      <h3>Select Tables to Clone</h3>
      <p className="step-description">Choose which tables to include in this clone job</p>

      {loadingTables ? (
        <div className="loading">Loading tables...</div>
      ) : (
        <>
          <div className="table-selection">
            <div className="table-selection-header">
              <label>
                <input
                  type="checkbox"
                  checked={jobData.sourceTables.length === availableTables.length}
                  onChange={(e) => setJobData({
                    ...jobData,
                    sourceTables: e.target.checked ? [...availableTables] : []
                  })}
                />
                <span>Select All ({availableTables.length} tables)</span>
              </label>
              <span className="selected-count">
                {jobData.sourceTables.length} selected
              </span>
            </div>

            <div className="table-list">
              {availableTables.map(table => (
                <label key={table} className="table-item">
                  <input
                    type="checkbox"
                    checked={jobData.sourceTables.includes(table)}
                    onChange={() => handleTableToggle(table)}
                  />
                  <span>{table}</span>
                </label>
              ))}
            </div>
          </div>

          {errors.sourceTables && <span className="error-message">{errors.sourceTables}</span>}
        </>
      )}
    </div>
  );


  const renderStep4 = () => (
    <div className="wizard-step">
      <h3>Select Destination Connection</h3>
      <p className="step-description">Choose where to clone the data to</p>

      {loadingConnections ? (
        <div className="loading">Loading connections...</div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="destConnection">Destination Connection *</label>
            <select
              id="destConnection"
              value={jobData.destinationConnectionId}
              onChange={(e) => setJobData({ ...jobData, destinationConnectionId: e.target.value })}
              className={errors.destinationConnection ? 'error' : ''}
            >
              <option value="">-- Select a connection --</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id?.toString() || ''}>
                  {conn.name} ({conn.type} - {conn.host}:{conn.port})
                </option>
              ))}
            </select>
            {errors.destinationConnection && <span className="error-message">{errors.destinationConnection}</span>}
          </div>

          <button className="add-connection-btn secondary" onClick={() => setShowConnectionDialog(true)}>
            + Add New Connection
          </button>
        </>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="wizard-step">
      <h3>Clone Options</h3>
      <p className="step-description">Configure how the data should be cloned</p>

      <div className="form-group">
        <label htmlFor="writeMode">Write Mode</label>
        <select
          id="writeMode"
          value={jobData.writeMode}
          onChange={(e) => setJobData({ ...jobData, writeMode: e.target.value as 'overwrite' | 'append' })}
        >
          <option value="overwrite">Overwrite - Replace existing data</option>
          <option value="append">Append - Add to existing data</option>
        </select>
        <small className="help-text">
          {jobData.writeMode === 'overwrite' 
            ? 'Existing tables will be dropped and recreated' 
            : 'Data will be added to existing tables'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="batchSize">Batch Size</label>
        <input
          id="batchSize"
          type="number"
          value={jobData.batchSize}
          onChange={(e) => setJobData({ ...jobData, batchSize: parseInt(e.target.value) || 1000 })}
          min="100"
          max="10000"
          step="100"
        />
        <small className="help-text">Number of rows to process at once (100-10000)</small>
      </div>

      <div className="form-group">
        <label>Schedule</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="now"
              checked={jobData.scheduleType === 'now'}
              onChange={(e) => setJobData({ ...jobData, scheduleType: e.target.value as 'now' })}
            />
            <span>Run immediately</span>
          </label>
          <label>
            <input
              type="radio"
              value="scheduled"
              checked={jobData.scheduleType === 'scheduled'}
              onChange={(e) => setJobData({ ...jobData, scheduleType: e.target.value as 'scheduled' })}
            />
            <span>Schedule for later (coming soon)</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="wizard-step">
      <h3>Review & Create Job</h3>
      <p className="step-description">Review your job configuration before creating</p>

      <div className="review-section">
        <div className="review-item">
          <strong>Job Name:</strong>
          <span>{jobData.name}</span>
        </div>
        {jobData.description && (
          <div className="review-item">
            <strong>Description:</strong>
            <span>{jobData.description}</span>
          </div>
        )}
        <div className="review-item">
          <strong>Source Connection:</strong>
          <span>{getConnectionName(jobData.sourceConnectionId)}</span>
        </div>
        <div className="review-item">
          <strong>Tables:</strong>
          <span>{jobData.sourceTables.join(', ')}</span>
        </div>
        <div className="review-item">
          <strong>Destination Connection:</strong>
          <span>{getConnectionName(jobData.destinationConnectionId)}</span>
        </div>
        <div className="review-item">
          <strong>Write Mode:</strong>
          <span>{jobData.writeMode === 'overwrite' ? 'Overwrite' : 'Append'}</span>
        </div>
        <div className="review-item">
          <strong>Batch Size:</strong>
          <span>{jobData.batchSize} rows</span>
        </div>
        <div className="review-item">
          <strong>Schedule:</strong>
          <span>{jobData.scheduleType === 'now' ? 'Run immediately' : 'Scheduled'}</span>
        </div>
      </div>

      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          <div className="test-result-header">
            {testResult.success ? '✓ Test Run Successful' : '✗ Test Run Failed'}
          </div>
          <div className="test-result-message">{testResult.message}</div>
          {testResult.result && (
            <div className="test-result-details">
              <pre>{JSON.stringify(testResult.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wizard-header">
            <h2>Create Clone Job</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          {renderStepIndicator()}

          <div className="wizard-body">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
            {currentStep === 6 && renderStep6()}
          </div>

          <div className="wizard-footer">
            <button 
              className="btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            
            <div className="footer-actions">
              {currentStep > 1 && (
                <button 
                  className="btn-secondary" 
                  onClick={handleBack}
                >
                  Back
                </button>
              )}
              
              {currentStep < 6 ? (
                <button 
                  className="btn-primary" 
                  onClick={handleNext}
                >
                  Next
                </button>
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={handleTestRun}
                    disabled={isTestingJob}
                  >
                    {isTestingJob ? 'Testing...' : '🚀 Test Run'}
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleSubmit}
                    disabled={isTestingJob}
                  >
                    Create Job
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConnectionDialog && (
        <ConnectionDialog
          onClose={() => setShowConnectionDialog(false)}
          onSuccess={handleConnectionCreated}
        />
      )}
    </>
  );
};

export default JobWizard;