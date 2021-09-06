import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { TenantChange, TenantList } from '../Tenants';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { QueryClient, QueryClientProvider } from 'react-query';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockDeleteObject = jest.fn();

const queryClient = new QueryClient();


beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


const mockTenants = [
  {
    name: 'TENANT1',
    schema_name: 'tenant1',
    domain_url: 'tenant1.tenant.com',
    created_on: '2020-02-02',
    nr_metrics: 254,
    nr_probes: 96
  },
  {
    name: 'TENANT2',
    schema_name: 'tenant2',
    domain_url: 'poem.tenant2.com',
    created_on: '2020-02-02',
    nr_metrics: 61,
    nr_probes: 26
  },
  {
    name: 'TENANT3',
    schema_name: 'tenant3',
    domain_url: 'tenant3.tenant.com',
    created_on: '2020-02-02',
    nr_metrics: 6,
    nr_probes: 6
  }
];


function renderTenantList() {
  const route = '/ui/tenants';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route path='/ui/tenants' component={TenantList} />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderTenantChangeView() {
  const route = '/ui/tenants/TENANT1';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/tenants/:name'
            render={ props => <TenantChange {...props} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe('Test list of tenants', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockTenants)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderTenantList();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /select tenant/i }).textContent).toBe('Select tenant for details');
    })

    const tenant1 = within(screen.getByTestId('TENANT1-card'));
    expect(tenant1.getByTestId('TENANT1-schema').textContent).toBe('Schema name: tenant1');
    expect(tenant1.getByTestId('TENANT1-poem').textContent).toBe('POEM url: tenant1.tenant.com');
    expect(tenant1.getByTestId('TENANT1-metrics').textContent).toBe('Metrics 254');
    expect(tenant1.getByTestId('TENANT1-probes').textContent).toBe('Probes 96');

    const tenant2 = within(screen.getByTestId('TENANT2-card'));
    expect(tenant2.getByTestId('TENANT2-schema').textContent).toBe('Schema name: tenant2');
    expect(tenant2.getByTestId('TENANT2-poem').textContent).toBe('POEM url: poem.tenant2.com');
    expect(tenant2.getByTestId('TENANT2-metrics').textContent).toBe('Metrics 61');
    expect(tenant2.getByTestId('TENANT2-probes').textContent).toBe('Probes 26');

    const tenant3 = within(screen.getByTestId('TENANT3-card'));
    expect(tenant3.getByTestId('TENANT3-schema').textContent).toBe('Schema name: tenant3');
    expect(tenant3.getByTestId('TENANT3-poem').textContent).toBe('POEM url: tenant3.tenant.com');
    expect(tenant3.getByTestId('TENANT3-metrics').textContent).toBe('Metrics 6');
    expect(tenant3.getByTestId('TENANT3-probes').textContent).toBe('Probes 6');

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Test tenants changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/tenants/TENANT1':
              return Promise.resolve(mockTenants[0])
          }
        },
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderTenantChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tenant/i }).textContent).toBe('Tenant details');
    })

    const nameField = screen.getByTestId('name');
    const schemaField = screen.getByTestId('schema');
    const urlField = screen.getByTestId('url');
    const createdField = screen.getByTestId('created_on');

    expect(nameField.value).toBe('TENANT1');
    expect(nameField).toHaveAttribute('readonly');
    expect(schemaField.value).toBe('tenant1');
    expect(schemaField).toHaveAttribute('readonly');
    expect(urlField.value).toBe('tenant1.tenant.com');
    expect(urlField).toHaveAttribute('readonly');
    expect(createdField.value).toBe('2020-02-02');
    expect(createdField).toHaveAttribute('readonly');

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test deleting tenant', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tenant/i }).textContent).toBe('Tenant details');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/tenants/TENANT1'
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Tenant successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting tenant with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'You do not have permission to delete tenants.' }),
        status: 401,
        statusText: 'UNAUTHORIZED'
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tenant/i }).textContent).toBe('Tenant details');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/tenants/TENANT1'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>You do not have permission to delete tenants.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 401 UNAUTHORIZED',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting tenant without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tenant/i }).textContent).toBe('Tenant details');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/tenants/TENANT1'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting tenant.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})
