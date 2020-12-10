import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ListOfMetrics } from '../Metrics';
import { Backend } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks()
})


const mockListOfMetricTemplates = [
  {
    id: '1',
    name: 'argo.AMS-Check',
    mtype: 'Active',
    description: 'Some description of argo.AMS-Check metric template.',
    ostag: ['CentOS 6', 'CentOS 7'],
    tags: ['test_tag1', 'test_tag2'],
    probeversion: 'ams-probe (0.1.12)',
    parent: '',
    probeexecutable: 'ams-probe',
    config: [
      { key: 'maxCheckAttempts', value: '4' },
      { key: 'timeout', value: '70' },
      { key: 'path', value: '/usr/libexec/argo-monitoring/' },
      { key: 'interval', value: '5' },
      { key: 'retryInterval', value: '3' }
    ],
    attribute: [
      { key: 'argo.ams_TOKEN', value: '--token' }
    ],
    dependency: [],
    flags: [
      { key: 'OBSESS', value: '1' }
    ],
    files: [],
    parameter: [
      { key: '--project', value: 'EGI' }
    ],
    fileparameter: []
  },
  {
    id: 3,
    name: 'argo.AMS-Publisher',
    mtype: 'Active',
    tags: ['internal'],
    probeversion: 'ams-publisher-probe (0.1.12)',
    ostag: ['CentOS 6', 'CentOS 7'],
    description: '',
    parent: '',
    probeexecutable: 'ams-publisher-probe',
    config: [
      { key: 'interval', value: '180' },
      { key: 'maxCheckAttempts', value: '1' },
      { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo'},
      { key: 'retryInterval', value: '1' },
      { key: 'timeout', value: '120' }
    ],
    attribute: [],
    dependancy: [],
    flags: [
      { key: 'NOHOSTNAME', value: '1' },
      { key: 'NOTIMEOUT', value: '1'},
      { key: 'NOPUBLISH', value: '1' }
    ],
    files: [],
    parameter: [
      { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock'}
    ],
    fileparameter: []
  },
  {
    id: 2,
    name: 'org.apel.APEL-Pub',
    mtype: 'Passive',
    description: '',
    ostag: [],
    tags: [],
    probeversion: '',
    parent: '',
    probeexecutable: '',
    config: [],
    attribute: [],
    dependency: [],
    flags: [
      { key: 'OBSESS', value: '1' },
      { key: 'PASSIVE', value: '1' }
    ],
    files: [],
    parameter: [],
    fileparameter: []
  }
];

const mockActiveSession = {
  active: true,
  userdetails: {
    first_name: '',
    last_name: '',
    username: 'poem',
    is_active: true,
    is_superuser: true,
    email: 'test@email.com',
    date_joined: '2019-07-08T12:58:08',
    id: '1'
  }
}

function renderListView(publicView=false) {
  const history = createMemoryHistory();

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={props => <ListOfMetrics {...props} type='metrictemplates' publicView={true} />}
          />
        </Router>
      )
    }
  else
    return {
      ...render(
        <Router history={history}>
          <Route
            render = { props => <ListOfMetrics {...props} type='metrictemplates' /> }
          />
        </Router>
      )
    }
}


describe('Test list of metric templates on SuperPOEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        },
        isTenantSchema: () => Promise.resolve(false),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template to change')
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Passive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'internal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deprecated' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternal')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('org.apel.APEL-PubPassivenone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/org.apel.APEL-Pub');
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })
})