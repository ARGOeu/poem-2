import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { PackageComponent, PackageList } from '../Package';
import { Backend } from '../DataManager';
import { queryCache } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
})

const mockChangeObject = jest.fn();


const mockListPackages = [
  {
    'name': 'nagios-plugins-argo',
    'version': '0.1.11',
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
  }
];

const mockPackage = {
  'id': '5',
  'name': 'nagios-plugins-argo',
  'version': '0.1.11',
  'use_present_version': false,
  'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
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
    'name': 'nagios-plugins-argo',
    'version': '0.1.12',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-argo',
    'version': '0.1.11',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  },
  {
    'name': 'nagios-plugins-argo',
    'version': '0.1.7',
    'use_present_version': false,
    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
  }
]


function renderListView() {
  const route = '/ui/packages';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          render={ props => <PackageList {...props} /> }
        />
      </Router>
    )
  }
}


function renderTenantListView() {
  const route = '/ui/administration/packages';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          render={ props => <PackageList {...props} /> }
        />
      </Router>
    )
  }
}


function renderChangeView() {
  const route = '/ui/packages/nagios-plugins-argo-0.1.11';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/packages/:nameversion'
          render={ props => <PackageComponent {...props} /> }
        />
      </Router>
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package to change');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /version/i }).textContent).toBe('Version');
    expect(screen.getByRole('columnheader', { name: /repo/i }).textContent).toBe('Repo');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /repo/i })).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-1 (CentOS 6)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-2 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-3 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-http-present');
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })

  test('Test filter packages', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package to change');
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'repo-1 (CentOS 6)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(28);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('2nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-http-present');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(29);
    expect(screen.getByRole('row', { name: /-argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11');

    fireEvent.change(screen.getByDisplayValue('argo'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('repo-1 (CentOS 6)'), { target: { value: 'repo-2 (CentOS 7)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package for details');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /version/i }).textContent).toBe('Version');
    expect(screen.getByRole('columnheader', { name: /repo/i }).textContent).toBe('Repo');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /repo/i })).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-1 (CentOS 6)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-2 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'repo-3 (CentOS 7)' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test filter packages', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Select package for details');
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'repo-1 (CentOS 6)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(28);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('2nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(29);
    expect(screen.getByRole('row', { name: /-argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');

    fireEvent.change(screen.getByDisplayValue('argo'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('repo-1 (CentOS 6)'), { target: { value: 'repo-2 (CentOS 7)' } });
    expect(screen.getAllByRole('row')).toHaveLength(32);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(26);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1nagios-plugins-argo0.1.11repo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /fedcloud/i }).textContent).toBe('2nagios-plugins-fedcloud0.5.0repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /globus/i }).textContent).toBe('3nagios-plugins-globus0.1.5repo-2 (CentOS 7)');
    expect(screen.getByRole('row', { name: /http/i }).textContent).toBe('4nagios-plugins-httppresentrepo-1 (CentOS 6), repo-2 (CentOS 7)');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-argo-0.1.11');
    expect(screen.getByRole('link', { name: /fedcloud/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-fedcloud-0.5.0');
    expect(screen.getByRole('link', { name: /globus/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-globus-0.1.5');
    expect(screen.getByRole('link', { name: /http/i }).closest('a')).toHaveAttribute('href', '/ui/administration/packages/nagios-plugins-http-present');
  })
})


describe('Tests for package changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');

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
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Change package');
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const repo6Field = screen.getByTestId('autocomplete-repo_6');
    const repo7Field = screen.getByTestId('autocomplete-repo_7');
    const checkboxField = screen.getByRole('checkbox', { name: /version/i });

    expect(nameField.value).toBe('nagios-plugins-argo');
    expect(nameField).toBeEnabled();
    expect(versionField.value).toBe('0.1.11');
    expect(versionField).toBeEnabled();
    expect(checkboxField).toBeInTheDocument();
    expect(checkboxField.checked).toEqual(false);
    expect(repo6Field.value).toBe('repo-1 (CentOS 6)');
    expect(repo6Field).toBeEnabled();
    expect(repo7Field.value).toBe('repo-2 (CentOS 7)');
    expect(repo7Field).toBeEnabled();

    expect(screen.getByRole('link', { name: /ams/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.11')
    expect(screen.getByRole('link', { name: /poem/i }).closest('a')).toHaveAttribute('href', '/ui/probes/poem-probe-new/history/0.1.11');

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/packages/nagios-plugins-argo-0.1.11/clone');
  })

  test('Test successfully changing package', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Change package');
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const repo6Field = screen.getByTestId('autocomplete-repo_6');
    const repo7Field = screen.getByTestId('autocomplete-repo_7');

    fireEvent.change(nameField, { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(versionField, { target: { value: '0.1.12' } });
    fireEvent.change(repo6Field, { target: { value: '' } });
    fireEvent.change(repo7Field, { target: { value: 'repo-3 (CentOS 7)' } });

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
          repos: ['repo-3 (CentOS 7)']
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully changed', 'Changed', 2000
    )
  })

  test('Test successfully changing package with present version', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /package/i }).textContent).toBe('Change package');
    })

    const nameField = screen.getByTestId('name');
    const versionField = screen.getByTestId('version');
    const checkField = screen.getByRole('checkbox', { name: /version/i });
    const repo6Field = screen.getByTestId('autocomplete-repo_6');
    const repo7Field = screen.getByTestId('autocomplete-repo_7');

    fireEvent.change(nameField, { target: { value: 'new-nagios-plugins-argo' } });
    fireEvent.change(versionField, { target: { value: '0.1.12' } });

    fireEvent.click(checkField);
    expect(versionField.value).toBe('present');
    expect(versionField).toBeDisabled();

    fireEvent.change(repo6Field, { target: { value: '' } });
    fireEvent.change(repo7Field, { target: { value: 'repo-3 (CentOS 7)' } });

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
          use_present_version: true,
          repos: ['repo-3 (CentOS 7)']
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Package successfully changed', 'Changed', 2000
    )
  })

})
