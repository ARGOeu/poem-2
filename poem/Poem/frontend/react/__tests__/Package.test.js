import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PackageComponent, PackageList } from '../Package';
import { Backend } from '../DataManager';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

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

const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockAddObject = jest.fn();
const mockFetchData = jest.fn()


const mockListPackages = [
  {
    'id': '5',
    'name': 'nagios-plugins-argo',
    'version': '0.1.11',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
  },
  {
    'id': '4',
    'name': 'nagios-plugins-fedcloud',
    'version': '0.5.0',
    'use_present_version': false,
    'repos': ['repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
  },
  {
    'id': '1',
    'name': 'nagios-plugins-globus',
    'version': '0.1.5',
    'use_present_version': false,
    'repos': ['repo-2 (CentOS 7)']
  },
  {
    'id': '2',
    'name': 'nagios-plugins-http',
    'version': 'present',
    'use_present_version': true,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
  }
];

const mockYUMRepos = [
  {
    'id': '1',
    'name': 'repo-1',
    'tag': 'CentOS 6',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 1 description.'
  },
  {
    'id': '2',
    'name': 'repo-2',
    'tag': 'CentOS 7',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 2 description.'
  },
  {
    'id': '3',
    'name': 'repo-3',
    'tag': 'CentOS 7',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 3 description'
  },
  {
    "id": "4",
    "name": "repo-4",
    "tag": "Rocky 9",
    "content": "content8=content8\ncontent9=content9",
    "description": "Repo 4 description"
  }
];

const mockPackage = {
  'id': '5',
  'name': 'nagios-plugins-argo',
  'version': '0.1.11',
  'use_present_version': false,
  'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
}

const mockProbeVersions = [
  {
    'id': '8',
    'object_repr': 'ams-publisher-probe (0.1.11)',
    'fields': {
        'name': 'ams-publisher-probe',
        'version': '0.1.11',
        'package': 'nagios-plugins-argo (0.1.11)',
        'description': 'Probe is inspecting AMS publisher',
        'comment': 'Initial version',
        'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
        'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    'user': 'testuser',
    'date_created': '2019-12-13 14:30:58',
    'comment': 'Initial version.',
    'version': '0.1.11'
  },
  {
    'id': '2',
    'object_repr': 'poem-probe (0.1.7)',
    'fields': {
        'name': 'poem-probe',
        'version': '0.1.7',
        'package': 'nagios-plugins-argo (0.1.7)',
        'description': 'Probe inspects POEM service.',
        'comment': 'Initial version.',
        'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
        'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md',
    },
    'user': 'testuser',
    'date_created': '2019-01-14 15:30:28',
    'comment': 'Initial version.',
    'version': '0.1.7'
  },
  {
    'id': '5',
    'object_repr': 'poem-probe-new (0.1.11)',
    'fields': {
        'name': 'poem-probe-new',
        'version': '0.1.11',
        'package': 'nagios-plugins-argo (0.1.11)',
        'description': 'Probe inspects new POEM service.',
        'comment': 'This version added: Check POEM metric configuration API',
        'repository': 'https://github.com/ARGOeu/nagios-plugins-argo2',
        'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo2/blob/master/README.md'
    },
    'user': 'testuser',
    'date_created': '2019-01-14 15:40:38',
    'comment': 'Changed name, comment, description, repository and docurl.',
    'version': '0.1.11'
  }
]

const mockPackageVersions = [
  {
    'id': '7',
    'name': 'nagios-plugins-argo-new',
    'version': '0.1.12',
    'use_present_version': false,
    'repos': ['repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
  },
  {
    'id': '9',
    'name': 'nagios-plugins-argo',
    'version': '0.1.11',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
  },
  {
    'id': '12',
    'name': 'nagios-plugins-argo',
    'version': '0.1.7',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  }
]

const mockUpdateOk = {
  'updated': 'Metrics argo.AMS-Check and argo.AMSPublisher-Check will be updated.'
}

const mockUpdateWithWarn = {
  updated: 'Metric argo.AMS-Check will be updated.',
  deleted: 'Metric argo.AMSPublisher-Check will be deleted, since its probe is not part of the chosen package.',
  warning: 'Metric template history instance of test.AMS-Check has not been found.'

}


function renderListView() {
  const route = '/ui/packages';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <PackageList />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderTenantListView() {
  const route = '/ui/administration/packages';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <PackageList isTenantSchema={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderChangeView() {
  const route = '/ui/packages/nagios-plugins-argo-0.1.11';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/packages/:nameversion"
              element={ <PackageComponent /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderTenantChangeView() {
  const route='/ui/administration/packages/nagios-plugins-argo-0.1.11';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/packages/:nameversion"
              element={ <PackageComponent disabled={ true } /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderAddView() {
  const route = '/ui/packages/add';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <PackageComponent addview={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderCloneView() {
  const route = '/ui/packages/nagios-plugins-argo-0.1.11/clone';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/packages/:nameversion/clone"
              element={ <PackageComponent cloneview={ true } /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Test list of packages on SuperAdmin POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/packages':
              return Promise.resolve(mockListPackages)

            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockYUMRepos)
          }
        },
        isTenantSchema: () => Promise.resolve(false)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    })

    expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package to change');

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /version/i }).textContent).toBe('Version');
    expect(screen.getByRole('columnheader', { name: /repo/i }).textContent).toBe('Repo');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /repo/i })).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-1 (CentOS 6)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-2 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-3 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "repo-4 (Rocky 9)" })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-http-present');
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })

  test('Test filter packages', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(8)
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'repo-1 (CentOS 6)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(28);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('2nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-http-present');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(29);
    expect(screen.getByRole('row', { name: /-argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');

    fireEvent.change(screen.getByDisplayValue('argo'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('repo-1 (CentOS 6)'), { target: { value: 'repo-2 (CentOS 7)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-http-present');
  })
})


describe('Test list of packages on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/packages':
              return Promise.resolve(mockListPackages)

            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockYUMRepos)
          }
        },
        isTenantSchema: () => Promise.resolve(true)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    })

    expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package for details');

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /version/i }).textContent).toBe('Version');
    expect(screen.getByRole('columnheader', { name: /repo/i }).textContent).toBe('Repo');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /repo/i })).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-1 (CentOS 6)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-2 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-3 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "repo-4 (Rocky 9)" })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test filter packages', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(8)
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'repo-1 (CentOS 6)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(28);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('2nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(29);
    expect(screen.getByRole('row', { name: /-argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');

    fireEvent.change(screen.getByDisplayValue('argo'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('repo-1 (CentOS 6)'), { target: { value: 'repo-2 (CentOS 7)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7), repo-4 (Rocky 9)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');
  })
})


describe('Tests for package changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
              return Promise.resolve(mockPackage)

            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockYUMRepos)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)

            case '/api/v2/internal/packageversions/nagios-plugins-argo':
              return Promise.resolve(mockPackageVersions)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Change package');

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const repo6Field = screen.getByText('repo-1 (CentOS 6)');
    const repo7Field = screen.getByText('repo-2 (CentOS 7)');
    const repo9Field = screen.getByText("repo-4 (Rocky 9)")
    const checkboxField = screen.getByRole('checkbox')

    expect(nameField.value).toBe('nagios-plugins-argo');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeEnabled();
    expect(checkboxField).toBeInTheDocument();
    expect(checkboxField.checked).toEqual(false);
    expect(repo6Field).toBeEnabled();
    expect(repo7Field).toBeEnabled();
    expect(repo9Field).toBeEnabled()

    expect(screen.queryByText('repo-3 (CentOS 7)')).not.toBeInTheDocument()
    selectEvent.openMenu(repo7Field)
    expect(screen.getByText('repo-3 (CentOS 7)')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /ams/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.11')
    expect(screen.getByRole('link', { name: /poem/i }).closest('a')).toHaveAttribute('href', '/ui/probes/poem-probe-new/history/0.1.11');

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11/clone');
  })

  test("Test change package name", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId("name")

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "new-nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText("Name cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "" } })
    })

    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "new nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.getByText("Name cannot contain white spaces")).toBeInTheDocument()
    })
  })

  test("Test change package version", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const versionField = screen.getByTestId("version")
    const presentVersionField = screen.getByRole("checkbox")

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "0.1.12" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "0.1.12",
      present_version: false
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "" } })
    })
    
    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "1. 0.2" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Version cannot contain white spaces")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })

    expect(versionField).toBeDisabled()

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "present",
      present_version: true
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })
    expect(versionField).toBeEnabled()
    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "present",
      present_version: false
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })
  })

  /*
  test("Test change repos", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.clearFirst(screen.getByText("repo-1 (CentOS 6)"))
    await selectEvent.clearFirst(screen.getByText("repo-4 (Rocky 9)"))
    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), "repo-3 (CentOS 7)")

    expect(screen.queryByText("repo-1 (CentOS 6)")).not.toBeInTheDocument()
    expect(screen.queryByText("repo-2 (CentOS 7)")).not.toBeInTheDocument()
    expect(screen.queryByText("repo-4 (Rocky 9)")).not.toBeInTheDocument()
    expect(screen.getByText("repo-3 (CentOS 7)")).toBeInTheDocument()

    await selectEvent.clearFirst(screen.getByText("repo-3 (CentOS 7)"))
    expect(screen.getByRole("alert").textContent).toBe("You must provide at least one repo")
  })
  */

  test('Test successfully changing package', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '0.1.12' } });

    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), 'repo-3 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          id: '5',
          name: 'new-nagios-plugins-argo',
          version: '0.1.12',
          use_present_version: false,
          repos: ["repo-1 (CentOS 6)", 'repo-3 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully changed', 'Changed', 2000
    )
  })

  test('Test successfully changing package with present version', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '0.1.12' } });

    fireEvent.click(screen.getByRole("checkbox"))

    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), 'repo-3 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          id: '5',
          name: 'new-nagios-plugins-argo',
          version: 'present',
          use_present_version: true,
          repos: ["repo-1 (CentOS 6)", 'repo-3 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing package with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Package with this name and version already exists.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '0.1.12' } });

    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), 'repo-3 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          id: '5',
          name: 'new-nagios-plugins-argo',
          version: '0.1.12',
          use_present_version: false,
          repos: ["repo-1 (CentOS 6)", 'repo-3 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Package with this name and version already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing package without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '0.1.12' } });

    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), 'repo-3 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          id: '5',
          name: 'new-nagios-plugins-argo',
          version: '0.1.12',
          use_present_version: false,
          repos: ["repo-1 (CentOS 6)", 'repo-3 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing package</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting package', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '0.1.12' } });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/nagios-plugins-argo-0.1.11',
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting package with error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; You cannot delete package with associated probes.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/nagios-plugins-argo-0.1.11',
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; You cannot delete package with associated probes.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting package without error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/nagios-plugins-argo-0.1.11',
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting package</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for package changeview on tenant POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'warning');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: mockFetchData,
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async() => {
    mockFetchData.mockImplementation((path) => {
      switch (path) {
        case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
          return Promise.resolve(mockPackage)

        case '/api/v2/internal/yumrepos':
          return Promise.resolve(mockYUMRepos)

        case '/api/v2/internal/version/probe':
          return Promise.resolve(mockProbeVersions)

        case '/api/v2/internal/packageversions/nagios-plugins-argo':
          return Promise.resolve(mockPackageVersions)
      }
    })
    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByText('0.1.11');
    const repo6Field = screen.getByTestId('repo_6');
    const repo7Field = screen.getByTestId('repo_7');
    const repo9Field = screen.getByTestId("repo_9")
    const updateButton = screen.getByRole('button', { name: /update/i });

    expect(nameField.value).toBe('nagios-plugins-argo');
    expect(nameField).toBeDisabled();
    expect(versionField).toBeEnabled();

    expect(screen.queryByText('0.1.12')).not.toBeInTheDocument()
    expect(screen.queryByText('0.1.7')).not.toBeInTheDocument()
    selectEvent.openMenu(versionField)
    expect(screen.getByText('0.1.12')).toBeInTheDocument()
    expect(screen.getByText('0.1.7')).toBeInTheDocument()

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    expect(repo6Field.value).toBe('repo-1 (CentOS 6)');
    expect(repo6Field).toBeDisabled();
    expect(repo7Field.value).toBe('repo-2 (CentOS 7)');
    expect(repo7Field).toBeDisabled();
    expect(repo9Field.value).toBe("repo-4 (Rocky 9)")
    expect(repo9Field).toBeDisabled()

    expect(screen.getByRole('link', { name: /ams/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.11')
    expect(screen.getByRole('link', { name: /poem/i }).closest('a')).toHaveAttribute('href', '/ui/probes/poem-probe-new/history/0.1.11');

    expect(updateButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test changing package version', async () => {
    mockFetchData.mockImplementation((path) => {
      switch (path) {
        case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
          return Promise.resolve(mockPackage)

        case '/api/v2/internal/yumrepos':
          return Promise.resolve(mockYUMRepos)

        case '/api/v2/internal/version/probe':
          return Promise.resolve(mockProbeVersions)

        case '/api/v2/internal/packageversions/nagios-plugins-argo':
          return Promise.resolve(mockPackageVersions)

        case '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12':
          return Promise.resolve(mockUpdateOk)
      }
    })

    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ updated: 'Metrics argo.AMS-Check and argo.AMSPublisher-Check have been successfully updated.' })
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument()
    })

    const versionField = screen.getByText('0.1.11');

    await selectEvent.select(versionField, '0.1.12')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    })
    const nameField = screen.getByTestId('name');
    const repo6Field = screen.getByTestId('repo_6');
    const repo7Field = screen.getByTestId('repo_7');
    const repo9Field = screen.getByTestId("repo_9")
    expect(screen.getByTestId('name').value).toBe('nagios-plugins-argo-new');
    expect(nameField).toBeDisabled();
    expect(repo6Field.value).toBe('');
    expect(repo6Field).toBeDisabled();
    expect(repo7Field.value).toBe('repo-2 (CentOS 7)');
    expect(repo7Field).toBeDisabled();
    expect(repo9Field.value).toBe("repo-4 (Rocky 9)")
    expect(repo9Field).toBeDisabled()

    await selectEvent.select(versionField, '0.1.11')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeDisabled();
    })
    expect(nameField.value).toBe('nagios-plugins-argo');
    expect(nameField).toBeDisabled();
    expect(repo6Field.value).toBe('repo-1 (CentOS 6)');
    expect(repo6Field).toBeDisabled();
    expect(repo7Field.value).toBe('repo-2 (CentOS 7)');
    expect(repo7Field).toBeDisabled();
    expect(repo9Field.value).toBe("repo-4 (Rocky 9)")
    expect(repo9Field).toBeDisabled()

    await selectEvent.select(versionField, '0.1.12')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    })
    expect(nameField.value).toBe('nagios-plugins-argo-new');
    expect(nameField).toBeDisabled();
    expect(repo6Field.value).toBe('');
    expect(repo6Field).toBeDisabled();
    expect(repo7Field.value).toBe('repo-2 (CentOS 7)');
    expect(repo7Field).toBeDisabled();
    expect(repo9Field.value).toBe("repo-4 (Rocky 9)")
    expect(repo9Field).toBeDisabled()

    expect(mockFetchData).not.toHaveBeenCalledWith(
      '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12'
    )

    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12'
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /update/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/updatemetricsversions/',
        {
          name: 'nagios-plugins-argo-new',
          version: '0.1.12'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metrics argo.AMS-Check and argo.AMSPublisher-Check have been successfully updated.',
      'Updated', 2000
    )
  })

  test('Test changing package version with warnings', async () => {
    mockFetchData.mockImplementation((path) => {
      switch (path) {
        case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
          return Promise.resolve(mockPackage)

        case '/api/v2/internal/yumrepos':
          return Promise.resolve(mockYUMRepos)

        case '/api/v2/internal/version/probe':
          return Promise.resolve(mockProbeVersions)

        case '/api/v2/internal/packageversions/nagios-plugins-argo':
          return Promise.resolve(mockPackageVersions)

        case '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12':
          return Promise.resolve(mockUpdateWithWarn)
      }
    })

    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({
          updated: 'Metric argo.AMS-Check has been successfully updated.',
          deleted: 'Metric argo.AMSPublisher-Check has been deleted, since its probe is not part of the chosen package.',
          warning: 'Metric template history instance of test.AMS-Check has not been found.'
        })
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument()
    })

    const versionField = screen.getByText('0.1.11');

    await selectEvent.select(versionField, '0.1.12')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    })

    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12'
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /update/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/updatemetricsversions/',
        {
          name: 'nagios-plugins-argo-new',
          version: '0.1.12'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric argo.AMS-Check has been successfully updated.',
      'Updated', 2000
    )

    expect(NotificationManager.warning).toHaveBeenCalledTimes(2);
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMSPublisher-Check has been deleted, since its probe is not part of the chosen package.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Deleted',
      0,
      expect.any(Function)
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric template history instance of test.AMS-Check has not been found.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Warning',
      0,
      expect.any(Function)
    )
  })

  test('Test changing package version with error', async () => {
    mockFetchData.mockImplementation((path) => {
      switch (path) {
        case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
          return Promise.resolve(mockPackage)

        case '/api/v2/internal/yumrepos':
          return Promise.resolve(mockYUMRepos)

        case '/api/v2/internal/version/probe':
          return Promise.resolve(mockProbeVersions)

        case '/api/v2/internal/packageversions/nagios-plugins-argo':
          return Promise.resolve(mockPackageVersions)

        case '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12':
          throw Error('500 SERVER ERROR')
      }
    })

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument()
    })

    const versionField = screen.getByText('0.1.11');

    await selectEvent.select(versionField, '0.1.12')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    })

    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/v2/internal/updatemetricsversions/nagios-plugins-argo-new-0.1.12'
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>500 SERVER ERROR</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })

    expect(mockChangeObject).not.toHaveBeenCalled();
  })
})


describe('Tests for package addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockYUMRepos)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Add package');

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const repo6Field = screen.getAllByText(/select/i)[0]
    // there is word 'selected' in field description, therefore repo7Field has index 2
    const repo7Field = screen.getAllByText(/select/i)[2]
    const repo9Field = screen.getAllByText(/select/i)[4]
    const checkboxField = screen.getByRole('checkbox')

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('');
    expect(versionField).toBeEnabled();
    expect(checkboxField).toBeInTheDocument();
    expect(checkboxField.checked).toEqual(false);
    expect(repo6Field).toBeEnabled();
    expect(repo7Field).toBeEnabled();
    expect(repo9Field).toBeEnabled()

    expect(screen.queryByText('repo-1 (CentOS 6)')).not.toBeInTheDocument()
    expect(screen.queryByText('repo-2 (CentOS 7)')).not.toBeInTheDocument()
    expect(screen.queryByText('repo-3 (CentOS 7)')).not.toBeInTheDocument()
    expect(screen.queryByText("repo-4 (Rocky 9)")).not.toBeInTheDocument()

    selectEvent.openMenu(repo6Field)
    expect(screen.queryByText('repo-1 (CentOS 6)')).toBeInTheDocument()
    expect(screen.queryByText('repo-2 (CentOS 7)')).not.toBeInTheDocument()
    expect(screen.queryByText('repo-3 (CentOS 7)')).not.toBeInTheDocument()
    expect(screen.queryByText("repo-4 (Rocky 9)")).not.toBeInTheDocument()

    selectEvent.openMenu(repo7Field)
    expect(screen.queryByText('repo-2 (CentOS 7)')).toBeInTheDocument()
    expect(screen.queryByText('repo-3 (CentOS 7)')).toBeInTheDocument()
    expect(screen.queryByText("repo-4 (Rocky 9)")).not.toBeInTheDocument()

    selectEvent.openMenu(repo9Field)
    expect(screen.getByText("repo-4 (Rocky 9)")).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test("Test change package name", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId("name")

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Name cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "" } })
    })
    
    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "new nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.getByText("Name cannot contain white spaces")).toBeInTheDocument()
    })
  })

  test("Test change package version", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const versionField = screen.getByTestId("version")
    const presentVersionField = screen.getByRole("checkbox")

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "0.1.12" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "",
      version: "0.1.12",
      present_version: false
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "" } })
    })

    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "1. 0.2" } })
    })
    
    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Version cannot contain white spaces")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })

    expect(versionField).toBeDisabled()

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "",
      version: "present",
      present_version: true
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })
    expect(versionField).toBeEnabled()
    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "",
      version: "present",
      present_version: false
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })
  })

  test("Test change repos", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("You must provide at least one repo")
    })

    await selectEvent.select(screen.getAllByText(/select/i)[2], "repo-3 (CentOS 7)")

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  test('Test adding successfully new package', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '1.1.0' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'repo-1 (CentOS 6)')
    await selectEvent.select(screen.getAllByText(/select/i)[1], 'repo-2 (CentOS 7)')
    await selectEvent.select(screen.getAllByText(/select/i)[2], "repo-4 (Rocky 9)")

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully added', 'Added', 2000
    )
  })

  test('Test adding successfully new package with present version', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo-nagios-tools' } });
    fireEvent.click(screen.getByRole("checkbox"))

    await selectEvent.select(screen.getAllByText(/select/i)[2], 'repo-2 (CentOS 7)')
    await selectEvent.select(screen.getAllByText(/select/i)[3], "repo-4 (Rocky 9)")

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: 'present',
          use_present_version: true,
          repos: ['repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully added', 'Added', 2000
    )
  })

  test('Test error adding new package with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; There has been an error.')
    } )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '1.1.0' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'repo-1 (CentOS 6)')
    await selectEvent.select(screen.getAllByText(/select/i)[1], 'repo-2 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding new package without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(screen.getByTestId("version"), { target: { value: '1.1.0' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'repo-1 (CentOS 6)')
    await selectEvent.select(screen.getAllByText(/select/i)[1], 'repo-2 (CentOS 7)')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding package</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for package cloneview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/packages/nagios-plugins-argo-0.1.11':
              return Promise.resolve(mockPackage)

            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockYUMRepos)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)

            case '/api/v2/internal/packageversions/nagios-plugins-argo':
              return Promise.resolve(mockPackageVersions)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Clone package');

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const repo6Field = screen.getByText('repo-1 (CentOS 6)');
    const repo7Field = screen.getByText('repo-2 (CentOS 7)');
    const repo9Field = screen.getByText("repo-4 (Rocky 9)")
    const checkboxField = screen.getByRole('checkbox')

    expect(nameField.value).toBe('nagios-plugins-argo');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeEnabled();
    expect(checkboxField).toBeInTheDocument();
    expect(checkboxField.checked).toEqual(false);
    expect(repo6Field).toBeEnabled();
    expect(repo7Field).toBeEnabled();
    expect(repo9Field).toBeEnabled()

    expect(screen.queryByText('repo-3 (CentOS 7)')).not.toBeInTheDocument()
    selectEvent.openMenu(repo7Field)
    expect(screen.queryByText('repo-3 (CentOS 7)')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test("Test change package name", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId("name")

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "new-nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Name cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "" } })
    })

    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "new nagios-plugins-argo" } })
    })

    await waitFor(() => {
      expect(screen.getByText("Name cannot contain white spaces")).toBeInTheDocument()
    })
  })

  test("Test change package version", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const versionField = screen.getByTestId("version")
    const presentVersionField = screen.getByRole("checkbox")

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "0.1.12" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "0.1.12",
      present_version: false
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "" } })
    })
    
    await waitFor(() => {
      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(versionField, { target: { value: "1. 0.2" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Version cannot contain white spaces")).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })

    expect(versionField).toBeDisabled()

    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "present",
      present_version: true
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(presentVersionField)
    })
    expect(versionField).toBeEnabled()
    expect(screen.getByTestId("form")).toHaveFormValues({
      name: "nagios-plugins-argo",
      version: "present",
      present_version: false
    })

    await waitFor(() => {
      expect(screen.queryByText("This field is required")).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Version cannot contain white spaces")).not.toBeInTheDocument()
    })
  })

  /*
  test("Test change repos", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.clearFirst(screen.getByText("repo-1 (CentOS 6)"))
    await selectEvent.select(screen.getByText("repo-2 (CentOS 7)"), "repo-3 (CentOS 7)")
    await selectEvent.clearFirst(screen.getByText("repo-4 (Rocky 9)"))

    expect(screen.queryByText("repo-1 (CentOS 6)")).not.toBeInTheDocument()
    expect(screen.queryByText("repo-2 (CentOS 7)")).not.toBeInTheDocument()
    expect(screen.getByText("repo-3 (CentOS 7)")).toBeInTheDocument()
    expect(screen.queryByText("repo-4 (Rocky 9)")).not.toBeInTheDocument()

    await selectEvent.clearFirst(screen.getByText("repo-3 (CentOS 7)"))
    expect(screen.getByRole("alert").textContent).toBe("You must provide at least one repo")
  })
  */

  test('Test cloning successfully new package', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');

    fireEvent.change(nameField, { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(versionField, { target: { value: '1.1.0' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ["repo-1 (CentOS 6)", 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully added', 'Added', 2000
    )
  })

  test('Test adding successfully new package with present version', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const checkField = screen.getByRole('checkbox')

    fireEvent.change(nameField, { target: { value: 'argo-nagios-tools' } });
    fireEvent.click(checkField);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: 'present',
          use_present_version: true,
          repos: ["repo-1 (CentOS 6)", 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully added', 'Added', 2000
    )
  })

  test('Test error cloning package with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; There has been an error.')
    } )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');

    fireEvent.change(nameField, { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(versionField, { target: { value: '1.1.0' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning package without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');

    fireEvent.change(nameField, { target: { value: 'argo-nagios-tools' } });
    fireEvent.change(versionField, { target: { value: '1.1.0' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/packages/',
        {
          name: 'argo-nagios-tools',
          version: '1.1.0',
          use_present_version: false,
          repos: ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)', "repo-4 (Rocky 9)"]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding package</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})
