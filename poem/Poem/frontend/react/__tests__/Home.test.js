import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Home from '../Home';
import {
  fetchBackendReports,
  fetchBackendMetricProfiles,
  fetchBackendAggregationProfiles,
  fetchServiceTypes,
  fetchOperationsProfiles,
  fetchMetrics,
  fetchProbes,
} from '../QueryFunctions';

jest.mock('../QueryFunctions', () => ({
  fetchBackendReports: jest.fn(),
  fetchBackendMetricProfiles: jest.fn(),
  fetchBackendAggregationProfiles: jest.fn(),
  fetchServiceTypes: jest.fn(),
  fetchOperationsProfiles: jest.fn(),
  fetchMetrics: jest.fn(),
  fetchProbes: jest.fn(),
}));

jest.mock('../DataManager', () => ({ Backend: jest.fn(() => ({})) }));
jest.mock('../Administration', () => ({
  CustomCardHeader: ({ title }) => <div>{title}</div>
}));

const queryClient = new QueryClient();

const renderHome = (isTenantSchema = true) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Home isTenantSchema={isTenantSchema} />
      </MemoryRouter>
    </QueryClientProvider>
  );


describe('Tests for tenant home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    fetchBackendReports.mockResolvedValue([
      { name: 'critical' }, { name: 'ops' }
    ]);
    fetchBackendMetricProfiles.mockResolvedValue([{ name: 'mp1' }]);
    fetchBackendAggregationProfiles.mockResolvedValue([
      { name: 'ap1' }, { name: 'ap2' }, { name: 'ap3' }
    ]);
    fetchServiceTypes.mockResolvedValue([{ name: 'st1' }]);
    fetchOperationsProfiles.mockResolvedValue([{ name: 'op1' }]);
    fetchMetrics.mockResolvedValue([{ name: 'm1' }, { name: 'm2' }]);
    fetchProbes.mockResolvedValue([{ name: 'p1' }]);
  })

  test('Test that thematic sections render', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    })

    expect(screen.getByText('Monitoring resources')).toBeInTheDocument();
    expect(screen.getByText('Profiles')).toBeInTheDocument();
  })

  test('Test that report names are listed', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('critical')).toBeInTheDocument();
    })

    expect(screen.getByText('ops')).toBeInTheDocument();
  })

  test('Test that profile names are listed', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('ap3')).toBeInTheDocument();
    })

    expect(screen.getByText('mp1')).toBeInTheDocument();
    expect(screen.getByText('op1')).toBeInTheDocument();
  })

  test('Test that resource counts are shown', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    })

    expect(screen.getByText('3')).toBeInTheDocument();
  })

  test('Test that placeholder renders for non-tenant schema', () => {
    renderHome(false);
    expect(screen.getByText(/"I am Home"/)).toBeInTheDocument();
  })
})
