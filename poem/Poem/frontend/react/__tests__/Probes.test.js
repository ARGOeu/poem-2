import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ProbeList } from '../Probes';
import { Backend } from '../DataManager';
import { queryCache } from 'react-query';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


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