import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminAdministration, TenantAdministration } from '../Administration';


const queryClient = new QueryClient();


beforeEach(() => {
  queryClient.clear();
})


function renderTenantAdministration() {
  const route = '/ui/administration';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <TenantAdministration />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderSuperAdminAdministration() {
  const route = '/ui/administration';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <SuperAdminAdministration />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Tests for tenant administration', () => {
  test('Test that page renders properly', async () => {
    renderTenantAdministration();

    expect(screen.getByRole('heading', { name: /admin/i }).textContent).toBe('Administration');
    expect(screen.getAllByRole('link')).toHaveLength(18);

    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveProperty('href', 'http://localhost/ui/metrics')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveProperty('href', 'http://localhost/ui/reports')
    expect(screen.getByRole('link', { name: 'Metric profiles' })).toHaveProperty('href', 'http://localhost/ui/metricprofiles')
    expect(screen.getByRole('link', { name: 'Aggregation profiles' })).toHaveProperty('href', 'http://localhost/ui/aggregationprofiles')
    expect(screen.getByRole('link', { name: 'Thresholds profiles' })).toHaveProperty('href', 'http://localhost/ui/thresholdsprofiles')
    expect(screen.getByRole('link', { name: 'Operations profiles' })).toHaveProperty('href', 'http://localhost/ui/operationsprofiles')
    expect(screen.getByRole('link', { name: 'Metric configuration overrides' })).toHaveProperty('href', 'http://localhost/ui/administration/metricoverrides')
    expect(screen.getByRole('link', { name: 'Probe candidates' })).toHaveProperty('href', 'http://localhost/ui/administration/probecandidates')

    expect(screen.getByRole('link', { name: 'Groups of reports' })).toHaveProperty('href', 'http://localhost/ui/administration/groupofreports')
    expect(screen.getByRole('link', { name: 'Groups of aggregations' })).toHaveProperty('href', 'http://localhost/ui/administration/groupofaggregations')
    expect(screen.getByRole('link', { name: 'Groups of metrics' })).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetrics')
    expect(screen.getByRole('link', { name: 'Groups of metric profiles' })).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetricprofiles')
    expect(screen.getByRole('link', { name: 'Groups of thresholds profiles' })).toHaveProperty('href', 'http://localhost/ui/administration/groupofthresholdsprofiles')
    expect(screen.getByRole('link', { name: 'Users' })).toHaveProperty('href', 'http://localhost/ui/administration/users')

    expect(screen.getByRole('link', { name: 'YUM repos' })).toHaveProperty('href', 'http://localhost/ui/administration/yumrepos')
    expect(screen.getByRole('link', { name: 'Packages' })).toHaveProperty('href', 'http://localhost/ui/administration/packages')
    expect(screen.getByRole('link', { name: 'Metric templates' })).toHaveProperty('href', 'http://localhost/ui/administration/metrictemplates')

    expect(screen.getByRole('link', { name: 'API keys' })).toHaveProperty('href', 'http://localhost/ui/administration/apikey')
  })
})


describe('Tests for super admin administration', () => {
  test('Test that page renders properly', () => {
    renderSuperAdminAdministration();

    expect(screen.getByRole('heading', { name: /admin/i }).textContent).toBe('Administration');
    expect(screen.getAllByRole('link')).toHaveLength(9);

    expect(screen.getByRole('link', { name: 'Tenants' })).toHaveProperty('href', 'http://localhost/ui/tenants');
    expect(screen.getByRole('link', { name: 'YUM repos' })).toHaveProperty('href', 'http://localhost/ui/yumrepos');
    expect(screen.getByRole('link', { name: 'Packages' })).toHaveProperty('href', 'http://localhost/ui/packages');
    expect(screen.getByRole('link', { name: 'Probes' })).toHaveProperty('href', 'http://localhost/ui/probes');
    expect(screen.getByRole('link', { name: 'Metric tags' })).toHaveProperty('href', 'http://localhost/ui/metrictags');
    expect(screen.getByRole('link', { name: 'Metric templates' })).toHaveProperty('href', 'http://localhost/ui/metrictemplates');
    expect(screen.getByRole('link', { name: 'Default ports' })).toHaveProperty('href', 'http://localhost/ui/administration/default_ports');

    expect(screen.getByRole('link', { name: 'Users' })).toHaveProperty('href', 'http://localhost/ui/administration/users');

    expect(screen.getByRole('link', { name: 'API keys' })).toHaveProperty('href', 'http://localhost/ui/administration/apikey');
  })
})
