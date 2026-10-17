import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import Home from '../Home';
import {
  fetchBackendReports,
  fetchBackendMetricProfiles,
  fetchBackendAggregationProfiles,
  fetchServiceTypes,
  fetchOperationsProfiles,
  fetchMetrics,
  fetchProbes,
  fetchProbeVersions,
  fetchPackages,
  fetchYumRepos,
  fetchMetricTemplates,
  fetchUsers,
  fetchAPIKeys,
  fetchTenants,
  fetchMetricTags,
} from '../QueryFunctions';

jest.mock('../QueryFunctions', () => ({
  fetchBackendReports: jest.fn(),
  fetchBackendMetricProfiles: jest.fn(),
  fetchBackendAggregationProfiles: jest.fn(),
  fetchServiceTypes: jest.fn(),
  fetchOperationsProfiles: jest.fn(),
  fetchMetrics: jest.fn(),
  fetchProbes: jest.fn(),
  fetchProbeVersions: jest.fn(),
  fetchPackages: jest.fn(),
  fetchYumRepos: jest.fn(),
  fetchMetricTemplates: jest.fn(),
  fetchUsers: jest.fn(),
  fetchAPIKeys: jest.fn(),
  fetchTenants: jest.fn(),
  fetchMetricTags: jest.fn(),
}));

jest.mock('../DataManager', () => ({
  Backend: jest.fn(() => ({
    fetchData: jest.fn(() => Promise.resolve(
      [{ name: 'port1' }, { name: 'port2' }]
    ))
  }))
}));
jest.mock('../Administration', () => ({
  CustomCardHeader: ({ title }) => <div>{title}</div>
}));

const queryClient = new QueryClient();

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})

const renderHome = (isTenantSchema = true, isTenantAdmin = false) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Home isTenantSchema={isTenantSchema} isTenantAdmin={isTenantAdmin} />
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
    fetchProbeVersions.mockResolvedValue([
      { name: 'pv1' }, { name: 'pv2' }, { name: 'pv3' },
      { name: 'pv4' }, { name: 'pv5' }, { name: 'pv6' },
      { name: 'pv7' }
    ]);
    fetchPackages.mockResolvedValue([{ name: 'pkg1' }, { name: 'pkg2' }]);
    fetchYumRepos.mockResolvedValue([{ name: 'repo1' }]);
    fetchMetricTemplates.mockResolvedValue(
      [{ name: 'mt1' }, { name: 'mt2' }, { name: 'mt3' }]
    );
    fetchUsers.mockResolvedValue(
      [{ username: 'u1' }, { username: 'u2' }, { username: 'u3' }, { username: 'u4' }]
    );
    fetchAPIKeys.mockResolvedValue([{ name: 'k1' }, { name: 'k2' }]);
  })

  test('Test that thematic sections render', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    })

    expect(screen.getByText('Monitoring resources')).toBeInTheDocument();
    expect(screen.getByText('Profiles')).toBeInTheDocument();
  })

  test('Test that report names are listed with links', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('critical')).toBeInTheDocument();
    })

    expect(screen.getByText('ops')).toBeInTheDocument();
    expect(
      screen.getByText('critical').closest('a')
    ).toHaveAttribute('href', '/ui/reports/critical');
  })

  test('Test that profile names are listed with links', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('ap3')).toBeInTheDocument();
    })

    expect(screen.getByText('mp1')).toBeInTheDocument();
    expect(screen.getByText('op1')).toBeInTheDocument();

    expect(
      screen.getByText('mp1').closest('a')
    ).toHaveAttribute('href', '/ui/metricprofiles/mp1');
    expect(
      screen.getByText('ap3').closest('a')
    ).toHaveAttribute('href', '/ui/aggregationprofiles/ap3');
    expect(
      screen.getByText('op1').closest('a')
    ).toHaveAttribute('href', '/ui/operationsprofiles/op1');
  })

  test('Test that resource counts are shown', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    })

    expect(screen.getByText('3')).toBeInTheDocument();
  })

  test('Test that probe versions count is shown with probes', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Probe versions:')).toBeInTheDocument();
    })

    expect(fetchProbeVersions).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    })

    // The probe versions count lives in the probes card, not a separate one.
    expect(screen.queryByText('Probe versions')).not.toBeInTheDocument();
  })

  test('Test that shared resources are hidden for non admin users', async () => {
    renderHome(true, false);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    })

    expect(screen.queryByText('Shared resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Packages')).not.toBeInTheDocument();
    expect(screen.queryByText('YUM repos')).not.toBeInTheDocument();
    expect(screen.queryByText('Metric templates')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('API keys')).not.toBeInTheDocument();
    expect(fetchPackages).not.toHaveBeenCalled();
    expect(fetchYumRepos).not.toHaveBeenCalled();
    expect(fetchMetricTemplates).not.toHaveBeenCalled();
    expect(fetchUsers).not.toHaveBeenCalled();
    expect(fetchAPIKeys).not.toHaveBeenCalled();
  })

  test('Test that shared resources are shown for tenant admins', async () => {
    renderHome(true, true);

    await waitFor(() => {
      expect(screen.getByText('Shared resources')).toBeInTheDocument();
    })

    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('YUM repos')).toBeInTheDocument();
    expect(screen.getByText('Metric templates')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchPackages).toHaveBeenCalled();
    })

    expect(fetchYumRepos).toHaveBeenCalled();
    expect(fetchMetricTemplates).toHaveBeenCalled();
  })

  test('Test that shared resource cards link to admin lists', async () => {
    renderHome(true, true);

    await waitFor(() => {
      expect(screen.getByText('View packages →')).toBeInTheDocument();
    })

    expect(
      screen.getByText('View packages →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/packages/');
    expect(
      screen.getByText('View YUM repos →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/yumrepos/');
    expect(
      screen.getByText('View metric templates →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/metrictemplates/');
  })

  test('Test that administration cards are shown for tenant admins', async () => {
    renderHome(true, true);

    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
    })

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('API keys')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('View users →')).toBeInTheDocument();
    })

    expect(
      screen.getByText('View users →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/users');
    expect(
      screen.getByText('View API keys →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/apikey');
    expect(fetchUsers).toHaveBeenCalled();
    expect(fetchAPIKeys).toHaveBeenCalled();
  })

})

describe('Tests for superadmin home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    fetchTenants.mockResolvedValue([
      { name: 'EGI' }, { name: 'EOSC' }, { name: 'FEDCLOUD' }
    ]);
    fetchUsers.mockResolvedValue([{ username: 'u1' }, { username: 'u2' }]);
    fetchAPIKeys.mockResolvedValue([{ name: 'k1' }]);
    fetchMetricTemplates.mockResolvedValue([{ name: 'mt1' }, { name: 'mt2' }]);
    fetchMetricTags.mockResolvedValue([{ name: 'tag1' }]);
    fetchProbes.mockResolvedValue([{ name: 'p1' }]);
    fetchProbeVersions.mockResolvedValue([{ name: 'pv1' }, { name: 'pv2' }]);
    fetchPackages.mockResolvedValue([{ name: 'pkg1' }]);
    fetchYumRepos.mockResolvedValue([{ name: 'repo1' }]);
  })

  test('Test that dashboard sections render', async () => {
    renderHome(false);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    })

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Shared resources')).toBeInTheDocument();
  })

  test('Test that platform cards render counts only', async () => {
    renderHome(false);

    await waitFor(() => {
      expect(screen.getByText('View users →')).toBeInTheDocument();
    })

    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('API keys')).toBeInTheDocument();

    // Tenant names are not listed on the card, only the count.
    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument();

    expect(
      screen.getByText('View tenants →').closest('a')
    ).toHaveAttribute('href', '/ui/tenants');
    expect(
      screen.getByText('View users →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/users');
    expect(
      screen.getByText('View API keys →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/apikey');
  })

  test('Test that shared resource cards render', async () => {
    renderHome(false);

    await waitFor(() => {
      expect(screen.getByText('Probe versions:')).toBeInTheDocument();
    })

    expect(screen.getByText('Metric templates')).toBeInTheDocument();
    expect(screen.getByText('Metric tags')).toBeInTheDocument();
    expect(screen.getByText('Probes')).toBeInTheDocument();
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('YUM repos')).toBeInTheDocument();
    expect(screen.getByText('Default ports')).toBeInTheDocument();

    // Metric template names are not listed on the card, only the count.
    expect(screen.queryByText('mt1')).not.toBeInTheDocument();
    expect(
      screen.getByText('View metric tags →').closest('a')
    ).toHaveAttribute('href', '/ui/metrictags');
    expect(
      screen.getByText('View default ports →').closest('a')
    ).toHaveAttribute('href', '/ui/administration/default_ports');
  })
})
