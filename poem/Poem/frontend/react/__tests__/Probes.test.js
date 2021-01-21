import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ProbeComponent, ProbeList } from '../Probes';
import { Backend } from '../DataManager';
import { queryCache } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockChangeObject = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
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


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}probes`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <ProbeList {...props} publicView={true} /> }
          />
        </Router>
      )
    }

  else
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <ProbeList {...props} /> }
          />
        </Router>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}probes/ams-probe`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            path='/ui/public_probes/:name'
            render={ props => <ProbeComponent {...props} publicView={true} /> }
          />
        </Router>
      )
    }
  else
    return {
      ...render(
        <Router history={history}>
          <Route
            path='/ui/probes/:name'
            render = { props => <ProbeComponent {...props} /> }
          />
        </Router>
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
        },
        isTenantSchema: () => Promise.resolve(false)
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
    renderListView();

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
    renderListView(true);

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
        },
        isTenantSchema: () => Promise.resolve(true)
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
    renderListView();

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
    renderListView(true);

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
        isTenantSchema: () => Promise.resolve(false),
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.getByRole('checkbox', { name: /update/i });
    const packageField = screen.getByTestId('autocomplete-pkg')
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
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.11)');
    expect(repositoryField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo');
    expect(repositoryField).toBeEnabled();
    expect(docurlField.value).toBe('https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md')
    expect(docurlField).toBeEnabled();
    expect(descriptionField.value).toBe('Probe is inspecting AMS service by trying to publish and consume randomly generated messages.')
    expect(descriptionField).toBeEnabled();
    expect(commentField.value).toBe('Newer version.')
    expect(commentField).toBeEnabled();

    expect(metricLinks[0].closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check');
    expect(metricLinks[1].closest('a')).toHaveAttribute('href', '/ui/metrictemplates/test.AMS-Check');

    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/clone');
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /probe detail/i }).textContent).toBe('Probe details');
    })

    const nameField = screen.getByTestId('name')
    const versionField = screen.getByTestId('version');
    const checkField = screen.queryByRole('checkbox', { name: /update/i });
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    const nameField = screen.getByTestId('name');
    const checkField = screen.getByRole('checkbox', { name: /update/i });
    const packageField = screen.getByTestId('autocomplete-pkg');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'new-ams-probe' } });
    fireEvent.change(packageField, { target: { value: 'nagios-plugins-argo (0.1.12)' } });
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByTestId('autocomplete-pkg');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'new-ams-probe' } });
    fireEvent.change(packageField, { target: { value: 'nagios-plugins-argo (0.1.12)' } });
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'Probe with this name already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByTestId('autocomplete-pkg');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'test-ams-probe' } });
    fireEvent.change(packageField, { target: { value: 'nagios-plugins-argo (0.1.12)' } });
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
        <p>Probe with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving probe without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change probe/i }).textContent).toBe('Change probe')
    })

    const nameField = screen.getByTestId('name');
    const packageField = screen.getByTestId('autocomplete-pkg');
    const commentField = screen.getByLabelText(/comment/i)

    fireEvent.change(nameField, { target: { value: 'test-ams-probe' } });
    fireEvent.change(packageField, { target: { value: 'nagios-plugins-argo (0.1.12)' } });
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
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})