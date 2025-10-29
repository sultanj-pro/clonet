import React, { useState, useEffect } from 'react';
import JobWizard from './JobWizard';
import './Dashboard.css';

interface Job {
  id: string;
  name: string;
  sourceConnection: string;
  destinationConnection: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  startTime?: string;
  endTime?: string;
  tablesProcessed?: number;
  totalTables?: number;
  error?: string;
}

const Dashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'failed'>('all');
  const [showJobWizard, setShowJobWizard] = useState(false);

  useEffect(() => {
    // TODO: Fetch jobs from API
    // Mock data for now
    const mockJobs: Job[] = [
      {
        id: '1',
        name: 'MySQL to SQL Server Clone',
        sourceConnection: 'Production MySQL',
        destinationConnection: 'Dev SQL Server',
        status: 'success',
        startTime: '2025-10-29T08:30:00',
        endTime: '2025-10-29T08:45:00',
        tablesProcessed: 5,
        totalTables: 5
      },
      {
        id: '2',
        name: 'Customer Data Sync',
        sourceConnection: 'MySQL Main',
        destinationConnection: 'MySQL Backup',
        status: 'running',
        startTime: '2025-10-29T10:00:00',
        tablesProcessed: 2,
        totalTables: 8
      },
      {
        id: '3',
        name: 'Archive Job',
        sourceConnection: 'Production DB',
        destinationConnection: 'Archive DB',
        status: 'failed',
        startTime: '2025-10-29T09:00:00',
        endTime: '2025-10-29T09:05:00',
        error: 'Connection to destination failed'
      }
    ];
    setJobs(mockJobs);
  }, []);

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 'In progress...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Clone Jobs Dashboard</h2>
        <button 
          className="create-job-button"
          onClick={() => setShowJobWizard(true)}
        >
          + Create New Job
        </button>
      </div>

      <div className="dashboard-filters">
        <button 
          className={filter === 'all' ? 'filter-button active' : 'filter-button'}
          onClick={() => setFilter('all')}
        >
          All Jobs ({jobs.length})
        </button>
        <button 
          className={filter === 'running' ? 'filter-button active' : 'filter-button'}
          onClick={() => setFilter('running')}
        >
          Running ({jobs.filter(j => j.status === 'running').length})
        </button>
        <button 
          className={filter === 'success' ? 'filter-button active' : 'filter-button'}
          onClick={() => setFilter('success')}
        >
          Success ({jobs.filter(j => j.status === 'success').length})
        </button>
        <button 
          className={filter === 'failed' ? 'filter-button active' : 'filter-button'}
          onClick={() => setFilter('failed')}
        >
          Failed ({jobs.filter(j => j.status === 'failed').length})
        </button>
      </div>

      <div className="jobs-grid">
        {filteredJobs.length === 0 ? (
          <div className="no-jobs">
            <p>No jobs found. Click "Create New Job" to get started!</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className={`job-card status-${job.status}`}>
              <div className="job-card-header">
                <div className="job-status-icon">{getStatusIcon(job.status)}</div>
                <div className="job-card-title">
                  <h3>{job.name}</h3>
                  <span className={`status-badge ${job.status}`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="job-card-body">
                <div className="job-info-row">
                  <span className="info-label">Source:</span>
                  <span className="info-value">{job.sourceConnection}</span>
                </div>
                <div className="job-info-row">
                  <span className="info-label">Destination:</span>
                  <span className="info-value">{job.destinationConnection}</span>
                </div>
                <div className="job-info-row">
                  <span className="info-label">Started:</span>
                  <span className="info-value">{formatDate(job.startTime)}</span>
                </div>
                {job.status !== 'running' && (
                  <div className="job-info-row">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">
                      {calculateDuration(job.startTime, job.endTime)}
                    </span>
                  </div>
                )}
                {job.totalTables && (
                  <div className="job-info-row">
                    <span className="info-label">Progress:</span>
                    <span className="info-value">
                      {job.tablesProcessed}/{job.totalTables} tables
                    </span>
                  </div>
                )}
                {job.error && (
                  <div className="job-error">
                    <strong>Error:</strong> {job.error}
                  </div>
                )}
              </div>

              <div className="job-card-actions">
                <button className="action-button view">View Details</button>
                {job.status === 'failed' && (
                  <button className="action-button retry">Retry</button>
                )}
                {job.status === 'success' && (
                  <button className="action-button rerun">Run Again</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showJobWizard && (
        <JobWizard
          onClose={() => setShowJobWizard(false)}
          onSubmit={(jobData) => {
            console.log('Creating job:', jobData);
            // TODO: Call API to create job
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

