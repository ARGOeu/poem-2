import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProbeComponent, ProbeList, ProbeVersionDetails } from '../Probes';
import { Backend } from '../DataManager';
import { QueryClientProvider, QueryClient, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockChangeObject = jest.fn();
const mockAddObject = jest.fn();
const mockDeleteObject = jest.fn();

const queryClient = new QueryClient();

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


const mockListProbes = [
  {
    'name': 'ams-probe',
    'version': '0.1.11',
    'package': 'nagios-plugins-argo (0.1.11)',
    'docurl':
        'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
    'description': 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
    'comment': 'Newer version.',
    'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
    'nv': 2
  },
  {
      'name': 'ams-publisher-probe',
      'version': '0.1.11',
      'package': 'nagios-plugins-argo (0.1.11)',
      'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
      'description': 'Probe is inspecting AMS publisher running on Nagios monitoring instances.',
      'comment': 'Initial version.',
      'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
      'nv': 1
  },
  {
      'name': 'argo-web-api',
      'version': '0.1.7',
      'package': 'nagios-plugins-argo (0.1.7)',
      'description': 'This is a probe for checking AR and status reports are properly working.',
      'comment': 'Initial version.',
      'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
      'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
      'nv': 1
  }
];


const mockProbe = {
  'id': '1',
  'name': 'ams-probe',
  'version': '0.1.11',
  'package': 'nagios-plugins-argo (0.1.11)',
  'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
  'description': 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
  'comment': 'Newer version.',
  'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
  'user': 'testuser',
  'datetime': '2020-01-20 14:24:58.3'
};


const mockPackages = [
  {
    'name': 'nagios-plugins-argo',
    'version': '0.1.11',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-argo',
    'version': '0.1.12',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-fedcloud',
    'version': '0.5.0',
    'use_present_version': false,
    'repos': ['repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-globus',
    'version': '0.1.5',
    'use_present_version': false,
    'repos': ['repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-http',
    'version': 'present',
    'use_present_version': true,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  }
];


const mockProbeVersions = [
  {
    id: '6',
    object_repr: 'ams-probe (0.1.12)',
    fields: {
      name: 'ams-probe',
      version: '0.1.12',
      package: 'nagios-plugins-argo (0.1.12)',
      description: 'Probe is inspecting AMS service.',
      comment: 'Newer version',
      repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
      docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    user: 'testuser',
    date_created: '2020-12-15 09:28:14',
    comment: 'Newer version',
    version: '0.1.12'
  },
  {
    id: '3',
    object_repr: 'ams-probe (0.1.11)',
    fields: {
      name: 'ams-probe',
      version: '0.1.11',
      package: 'nagios-plugins-argo (0.1.11)',
      description: 'Probe is inspecting AMS service.',
      comment: 'Initial version',
      repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
      docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    user: 'testuser',
    date_created: '2020-11-30 08:43:25',
    comment: 'Initial version',
    version: '0.1.11'
  }
];


function renderListView({ publicView=false, isTenantSchema=false }) {
  const route = `/ui/${publicView ? 'public_' : ''}probes`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ProbeList publicView={ true } isTenantSchema={ isTenantSchema } />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ProbeList isTenantSchema={isTenantSchema} /> 
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView({ publicView=false, isTenantSchema=false }) {
  const route = `/ui/${publicView ? 'public_' : ''}probes/ams-probe`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_probes/:name"
                element={ <ProbeComponent publicView={ true } isTenantSchema={ isTenantSchema } /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/probes/:name"
                element={ <ProbeComponent isTenantSchema={ isTenantSchema } /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = '/ui/probes/add';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <ProbeComponent addview={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderCloneView() {
  const route = '/ui/probes/ams-probe/clone';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/probes/:name/clone"
              element = { <ProbeComponent cloneview={true} /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}probes/ams-probe/history/0.1.12`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_probes/:name/history/:version"
                element={ <ProbeVersionDetails publicView={true} /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/probes/:name/history/:version"
                element={ <ProbeVersionDetails /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


describe('Test list of probes on SuperAdmin POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/probes':
              return Promise.resolve(mockListProbes);

            case '/api/v2/internal/public_probes':
              return Promise.resolve(mockListProbes);
          }
        }
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe to change');
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /#versions/i }).textContent).toBe('#versions');
    expect(screen.getByRole('columnheader', { name: /package/i }).textContent).toBe('Package');
    expect(screen.getByRole('columnheader', { name: /description/i }).textContent).toBe('Description');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('row', { name: /web-api/i }).textContent).toBe('3argo-web-api1nagios-plugins-argo (0.1.7)This is a probe for checking AR and status reports are properly working.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: /web-api/i }).closest('a')).toHaveAttribute('href', '/ui/probes/argo-web-api');
    expect(screen.getAllByRole('link', { name: '1' })[0].closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
    expect(screen.getAllByRole('link', { name: '1' })[1].closest('a')).toHaveAttribute('href', '/ui/probes/argo-web-api/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history')
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/probes/add');
  })

  test('Test that public listview renders properly', async () => {
    renderListView({ publicView: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details');
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /#versions/i }).textContent).toBe('#versions');
    expect(screen.getByRole('columnheader', { name: /package/i }).textContent).toBe('Package');
    expect(screen.getByRole('columnheader', { name: /description/i }).textContent).toBe('Description');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('row', { name: /web-api/i }).textContent).toBe('3argo-web-api1nagios-plugins-argo (0.1.7)This is a probe for checking AR and status reports are properly working.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: /web-api/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/argo-web-api');
    expect(screen.getAllByRole('link', { name: '1' })[0].closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
    expect(screen.getAllByRole('link', { name: '1' })[1].closest('a')).toHaveAttribute('href', '/ui/public_probes/argo-web-api/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history')
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test filter list of probes', async () => {
    renderListView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe to change')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'ams' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history')

    fireEvent.change(screen.getAllByPlaceholderText('Search')[2], { target: { value: 'publisher' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
  })

  test('Test filter public list of probes', async () => {
    renderListView({ publicView: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'ams' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history')

    fireEvent.change(screen.getAllByPlaceholderText('Search')[2], { target: { value: 'publisher' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
  })
})


describe('Test list of probes on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/probes':
              return Promise.resolve(mockListProbes);

            case '/api/v2/internal/public_probes':
              return Promise.resolve(mockListProbes);
          }
        }
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView({ isTenantSchema: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details');
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /#versions/i }).textContent).toBe('#versions');
    expect(screen.getByRole('columnheader', { name: /package/i }).textContent).toBe('Package');
    expect(screen.getByRole('columnheader', { name: /description/i }).textContent).toBe('Description');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('row', { name: /web-api/i }).textContent).toBe('3argo-web-api1nagios-plugins-argo (0.1.7)This is a probe for checking AR and status reports are properly working.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: /web-api/i }).closest('a')).toHaveAttribute('href', '/ui/probes/argo-web-api');
    expect(screen.getAllByRole('link', { name: '1' })[0].closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
    expect(screen.getAllByRole('link', { name: '1' })[1].closest('a')).toHaveAttribute('href', '/ui/probes/argo-web-api/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history')
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test that public listview renders properly', async () => {
    renderListView({ publicView: true, isTenantSchema: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details');
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /#versions/i }).textContent).toBe('#versions');
    expect(screen.getByRole('columnheader', { name: /package/i }).textContent).toBe('Package');
    expect(screen.getByRole('columnheader', { name: /description/i }).textContent).toBe('Description');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('row', { name: /web-api/i }).textContent).toBe('3argo-web-api1nagios-plugins-argo (0.1.7)This is a probe for checking AR and status reports are properly working.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: /web-api/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/argo-web-api');
    expect(screen.getAllByRole('link', { name: '1' })[0].closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
    expect(screen.getAllByRole('link', { name: '1' })[1].closest('a')).toHaveAttribute('href', '/ui/public_probes/argo-web-api/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history')
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test filter list of probes', async () => {
    renderListView({ isTenantSchema: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'ams' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history')

    fireEvent.change(screen.getAllByPlaceholderText('Search')[2], { target: { value: 'publisher' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history')
  })

  test('Test filter public list of probes', async () => {
    renderListView({ publicView: true, isTenantSchema: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe/i }).textContent).toBe('Select probe for details')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'ams' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-probe/i }).textContent).toBe('1ams-probe2nagios-plugins-argo (0.1.11)Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe');
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
    expect(screen.getByRole('link', { name: '2' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history')

    fireEvent.change(screen.getAllByPlaceholderText('Search')[2], { target: { value: 'publisher' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1ams-publisher-probe1nagios-plugins-argo (0.1.11)Probe is inspecting AMS publisher running on Nagios monitoring instances.')
    expect(screen.getByRole('link', { name: /ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe');
    expect(screen.getByRole('link', { name: '1' }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history')
  })
})


describe('Test probe changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/public_probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/public_metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/packages':
              return Promise.resolve(mockPackages)

            case '/api/v2/internal/public_packages':
              return Promise.resolve(mockPackages)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.getByRole('checkbox')
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)')
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.getAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeDisabled();
    expect(checkField).toBeInTheDocument();
    expect(repositoryField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo');
    expect(repositoryField).toBeEnabled();
    expect(docurlField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(docurlField).toBeEnabled();
    expect(descriptionField.value).toBe('Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(descriptionField).toBeEnabled();
    expect(commentField.value).toBe('Newer version.')
    expect(commentField).toBeEnabled();

    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).not.toBeInTheDocument()
    selectEvent.openMenu(packageField)
    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).toBeInTheDocument()

    expect(metricLinks[0].closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check');
    expect(metricLinks[1].closest('a')).toHaveAttribute('href', '/ui/metrictemplates/test.AMS-Check');

    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/clone');
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView({ publicView: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe detail/i }).textContent).toBe('Probe details');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox')
    const packageField = screen.getByTestId('pkg');
    const urlField = screen.queryAllByRole('link', { name: /argoeu/i })
    const repositoryField = urlField[0];
    const docurlField = urlField[1];
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.getAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeDisabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.11)');
    expect(packageField).toBeDisabled();
    expect(repositoryField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo');
    expect(docurlField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md');
    expect(descriptionField.value).toBe('Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(descriptionField).toBeDisabled();
    expect(commentField.value).toBe('Newer version.')
    expect(commentField).toBeDisabled();

    expect(metricLinks[0].closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/argo.AMS-Check');
    expect(metricLinks[1].closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/test.AMS-Check');

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test change probe and save', async () => {
    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    const nameField = screen.getByTestId('name');
    const checkField = screen.getByRole('checkbox')
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'new-ams-probe' } });

    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.12)')

    const versionField = screen.getByTestId('version');
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();

    fireEvent.click(checkField);
    fireEvent.change(commentField, { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          id: '1',
          name: 'new-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          update_metrics: true
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Probe successfully changed', 'Changed', 2000
    )
  })

  test('Test change probe without metric template update and save', async () => {
    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-ams-probe' } });

    await selectEvent.select(screen.getByText("nagios-plugins-argo (0.1.11)"), 'nagios-plugins-argo (0.1.12)')

    fireEvent.change(screen.getByLabelText(/comment/i), { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          id: '1',
          name: 'new-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          update_metrics: false
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Probe successfully changed', 'Changed', 2000
    )
  })

  test('Test error in saving probe with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Probe with this name already exists.')
    } )

    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'test-ams-probe' } });

    await selectEvent.select(screen.getByText("nagios-plugins-argo (0.1.11)"), 'nagios-plugins-argo (0.1.12)')

    fireEvent.change(screen.getByLabelText(/comment/i), { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          id: '1',
          name: 'test-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          update_metrics: false
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Probe with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving probe without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'test-ams-probe' } });

    await selectEvent.select(screen.getByText("nagios-plugins-argo (0.1.11)"), 'nagios-plugins-argo (0.1.12)')

    fireEvent.change(screen.getByLabelText(/comment/i), { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          id: '1',
          name: 'test-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          update_metrics: false
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing probe</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting probe', async () => {
    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/ams-probe'
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Probe successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting probe with error message', async () => {
    mockDeleteObject.mockImplementationOnce(() => {
      throw Error('404 NOT FOUND; Probe not found.')
    })

    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/ams-probe'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>404 NOT FOUND; Probe not found.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting probe without error message', async () => {
    mockDeleteObject.mockImplementationOnce(() => { throw Error() });

    renderChangeView({});

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/ams-probe'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting probe.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test probe changeview on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/public_probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/public_metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/packages':
              return Promise.resolve(mockPackages)

            case '/api/v2/internal/public_packages':
              return Promise.resolve(mockPackages)
          }
        }
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView({ isTenantSchema: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe details/i }).textContent).toBe('Probe details');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox', { name: /update/i });
    const packageField = screen.getByTestId('pkg')
    const urlField = screen.queryAllByRole('link', { name: /argoeu/i })
    const repositoryField = urlField[0];
    const docurlField = urlField[1];
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.getAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeDisabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.11)');
    expect(repositoryField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo');
    expect(docurlField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(descriptionField.value).toBe('Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(descriptionField).toBeDisabled();
    expect(commentField.value).toBe('Newer version.')
    expect(commentField).toBeDisabled();

    expect(metricLinks[0].closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/argo.AMS-Check');
    expect(metricLinks[1].closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/test.AMS-Check');

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history')
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })
})


describe('Test probe addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/packages':
              return Promise.resolve(mockPackages)

            case '/api/v2/internal/public_packages':
              return Promise.resolve(mockPackages)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add probe/i }).textContent).toBe('Add probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox')
    const packageField = screen.getAllByText(/select/i)[0];
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.queryAllByRole('link');

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(packageField).toBeEnabled();
    expect(repositoryField.value).toBe('');
    expect(repositoryField).toBeEnabled();
    expect(docurlField.value).toBe('');
    expect(docurlField).toBeEnabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();
    expect(commentField.value).toBe('');
    expect(commentField).toBeEnabled();
    expect(metricLinks.length).toBe(0);

    expect(screen.queryByText('nagios-plugins-argo (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).not.toBeInTheDocument()
    selectEvent.openMenu(packageField)
    expect(screen.queryByText('nagios-plugins-argo (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  })

  test('Test adding a new probe and saving', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add probe/i }).textContent).toBe('Add probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const packageField = screen.getAllByText(/select/i)[0]
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'check_nagios' } });

    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.11)')

    expect(versionField.value).toBe('0.1.11')
    expect(versionField).toBeDisabled();
    fireEvent.change(repositoryField, { target: { value: 'https://github.com/nagios-plugins/nagios-plugins' } });
    fireEvent.change(docurlField, { target: { value: 'http://nagios-plugins.org/doc/man/check_nagios.html' } });
    fireEvent.change(descriptionField, { target: { value: 'This plugin checks the status of the Nagios process on the local machine.' } })
    fireEvent.change(commentField, { target: { value: 'Initial version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'check_nagios',
          package: 'nagios-plugins-argo (0.1.11)',
          description: 'This plugin checks the status of the Nagios process on the local machine.',
          comment: 'Initial version.',
          repository: 'https://github.com/nagios-plugins/nagios-plugins',
          docurl: 'http://nagios-plugins.org/doc/man/check_nagios.html',
          cloned_from: ''
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Probe successfully added', 'Added', 2000
    )
  })

  test('Test error adding a new probe with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Probe with this name already exists.')
    } )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add probe/i }).textContent).toBe('Add probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const packageField = screen.getAllByText(/select/i)[0]
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'check_nagios' } });

    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.11)')

    expect(versionField.value).toBe('0.1.11')
    expect(versionField).toBeDisabled();
    fireEvent.change(repositoryField, { target: { value: 'https://github.com/nagios-plugins/nagios-plugins' } });
    fireEvent.change(docurlField, { target: { value: 'http://nagios-plugins.org/doc/man/check_nagios.html' } });
    fireEvent.change(descriptionField, { target: { value: 'This plugin checks the status of the Nagios process on the local machine.' } })
    fireEvent.change(commentField, { target: { value: 'Initial version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'check_nagios',
          package: 'nagios-plugins-argo (0.1.11)',
          description: 'This plugin checks the status of the Nagios process on the local machine.',
          comment: 'Initial version.',
          repository: 'https://github.com/nagios-plugins/nagios-plugins',
          docurl: 'http://nagios-plugins.org/doc/man/check_nagios.html',
          cloned_from: ''
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Probe with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a new probe without message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add probe/i }).textContent).toBe('Add probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const packageField = screen.getAllByText(/select/i)[0]
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'check_nagios' } });
    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.11)')
    expect(versionField.value).toBe('0.1.11')
    expect(versionField).toBeDisabled();
    fireEvent.change(repositoryField, { target: { value: 'https://github.com/nagios-plugins/nagios-plugins' } });
    fireEvent.change(docurlField, { target: { value: 'http://nagios-plugins.org/doc/man/check_nagios.html' } });
    fireEvent.change(descriptionField, { target: { value: 'This plugin checks the status of the Nagios process on the local machine.' } })
    fireEvent.change(commentField, { target: { value: 'Initial version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'check_nagios',
          package: 'nagios-plugins-argo (0.1.11)',
          description: 'This plugin checks the status of the Nagios process on the local machine.',
          comment: 'Initial version.',
          repository: 'https://github.com/nagios-plugins/nagios-plugins',
          docurl: 'http://nagios-plugins.org/doc/man/check_nagios.html',
          cloned_from: ''
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding probe</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test probe cloneview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/public_probes/ams-probe':
              return Promise.resolve(mockProbe)

            case '/api/v2/internal/metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/public_metricsforprobes/ams-probe(0.1.11)':
              return Promise.resolve(['argo.AMS-Check', 'test.AMS-Check'])

            case '/api/v2/internal/packages':
              return Promise.resolve(mockPackages)

            case '/api/v2/internal/public_packages':
              return Promise.resolve(mockPackages)
          }
        },
        isTenantSchema: () => Promise.resolve(false),
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clone probe/i }).textContent).toBe('Clone probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox', { name: /update/i });
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)')
    const repositoryField = screen.getByTestId('repository');
    const docurlField = screen.getByTestId('docurl');
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.queryAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(repositoryField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo');
    expect(repositoryField).toBeEnabled();
    expect(docurlField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(docurlField).toBeEnabled();
    expect(descriptionField.value).toBe('Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(descriptionField).toBeEnabled();
    expect(commentField.value).toBe('Newer version.')
    expect(commentField).toBeEnabled();
    expect(metricLinks.length).toBe(0);

    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).not.toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).not.toBeInTheDocument()
    selectEvent.openMenu(packageField)
    expect(screen.queryByText('nagios-plugins-argo (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-fedcloud (0.5.0)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-globus (0.1.5)')).toBeInTheDocument()
    expect(screen.queryByText('nagios-plugins-http (present)')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test save cloned probe', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clone probe/i }).textContent).toBe('Clone probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'cloned-ams-probe' } });
    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.12)')
    const versionField = screen.getByTestId('version');
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();

    fireEvent.change(commentField, { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'cloned-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          cloned_from: '1'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Probe successfully added', 'Added', 2000
    )
  })

  test('Test error in saving cloned probe with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Probe with this name already exists.')
    } )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clone probe/i }).textContent).toBe('Clone probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)')
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'test-ams-probe' } });
    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.12)')
    const versionField = screen.getByTestId('version');
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();

    fireEvent.change(commentField, { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'test-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          cloned_from: '1'
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Probe with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving cloned probe without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clone probe/i }).textContent).toBe('Clone probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByText('nagios-plugins-argo (0.1.11)')
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'test-ams-probe' } });
    await selectEvent.select(packageField, 'nagios-plugins-argo (0.1.12)')
    const versionField = screen.getByTestId('version');
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();

    fireEvent.change(commentField, { target: { value: 'Changed name with the new version.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/probes/',
        {
          name: 'test-ams-probe',
          package: 'nagios-plugins-argo (0.1.12)',
          comment: 'Changed name with the new version.',
          docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
          description: 'Probe is inspecting AMS service by trying to publish and consume randomly generated messages.',
          repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
          cloned_from: '1'
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding probe</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test probe version details view', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(mockProbeVersions)

            case '/api/v2/internal/public_version/probe/ams-probe':
              return Promise.resolve(mockProbeVersions)
          }
        }
      }
    })
  })

  test('Test page renders properly', async () => {
    renderVersionDetailsView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ams-probe/i }).textContent).toBe('ams-probe (0.1.12)')
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox', { name: /update/i });
    const packageField = screen.getByTestId('pkg')
    const linkFields = screen.getAllByRole('link', { name: /github/i });
    const repositoryField = linkFields[0];
    const docurlField = linkFields[1];
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.queryAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeDisabled();
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();
    expect(repositoryField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo');
    expect(docurlField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(descriptionField.value).toBe('Probe is inspecting AMS service.');
    expect(descriptionField).toBeDisabled();
    expect(commentField.value).toBe('Newer version');
    expect(commentField).toBeDisabled();
    expect(metricLinks.length).toBe(0);

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  })

  test('Test public page renders properly', async () => {
    renderVersionDetailsView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ams-probe/i }).textContent).toBe('ams-probe (0.1.12)')
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox', { name: /update/i });
    const packageField = screen.getByTestId('pkg')
    const linkFields = screen.getAllByRole('link', { name: /github/i });
    const repositoryField = linkFields[0];
    const docurlField = linkFields[1];
    const descriptionField = screen.getByLabelText(/description/i);
    const commentField = screen.getByLabelText(/comment/i)
    const metricLinks = screen.queryAllByRole('link', { name: /ams-check/i })

    expect(nameField.value).toBe('ams-probe');
    expect(nameField).toBeDisabled();
    expect(versionField.value).toBe('0.1.12');
    expect(versionField).toBeDisabled();
    expect(checkField).not.toBeInTheDocument();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();
    expect(repositoryField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo');
    expect(docurlField.closest('a')).toHaveAttribute('href', 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(descriptionField.value).toBe('Probe is inspecting AMS service.');
    expect(descriptionField).toBeDisabled();
    expect(commentField.value).toBe('Newer version');
    expect(commentField).toBeDisabled();
    expect(metricLinks.length).toBe(0);

    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  })
})
