import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ListOfMetrics } from '../Metrics';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { queryCache } from 'react-query'
import { MetricTemplateComponent } from '../MetricTemplates';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockBulkDeleteMetrics = jest.fn();
const mockImportMetrics = jest.fn();
const mockChangeObject = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
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
    ostag: ['CentOS 7'],
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

const mockTenantActiveSession = {
  active: true,
  userdetails: {
    is_superuser: true,
    username: 'testuser',
    groups: {
      aggregations: ['EGI'],
      metricprofiles: ['EGI'],
      metrics: ['EGI', 'ARGOTEST'],
      thresholdsprofiles: ['EGI']
    },
    token: '1234token_rw'
  }
}

const mockMetricTemplate = {
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
};

const mockProbeVersions = [
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
  },
  {
    id: '4',
    object_repr: 'ams-publisher-probe (0.1.11)',
    fields: {
      name: 'ams-publisher-probe',
      version: '0.1.11',
      package: 'nagios-plugins-argo (0.1.11)',
      description: 'Probe is inspecting AMS publisher.',
      comment: 'Initial version',
      repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
      docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    user: 'testuser',
    date_created: '2020-11-30 08:45:28',
    comment: 'Initial version',
    version: '0.1.11'
  },
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
    id: '9',
    object_repr: 'ams-publisher-probe (0.1.12)',
    fields: {
      name: 'ams-publisher-probe',
      version: '0.1.12',
      package: 'nagios-plugins-argo (0.1.12)',
      description: 'Probe is inspecting AMS publisher.',
      comment: 'Newer version',
      repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
      docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    user: 'testuser',
    date_created: '2020-12-15 10:45:59',
    comment: 'Newer version',
    version: '0.1.12'
  },
  {
    id: '11',
    object_repr: 'ams-probe-new (0.1.13)',
    fields: {
      name: 'ams-probe-new',
      version: '0.1.13',
      package: 'nagios-plugins-argo (0.1.13)',
      description: 'Probe is inspecting AMS service.',
      comment: 'Newest version',
      repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
      docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
    },
    user: 'testuser',
    date_created: '2020-12-31 08:57:15',
    comment: 'Newest version',
    version: '0.1.13'
  }
];

function renderListView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}metrictemplates`;
  const history = createMemoryHistory({ initialEntries: [route] });

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

function renderTenantListView() {
  const route = '/ui/administration/metrictemplates';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history} >
        <Route
          render={props => <ListOfMetrics {...props} type='metrictemplates' />}
        />
      </Router>
    )
  }
}

function renderChangeView() {
  const route = '/ui/metrictemplates/argo.AMS-Check';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/metrictemplates/:name'
          render={ props => <MetricTemplateComponent {...props} /> }
        />
      </Router>
    )
  }
}


describe('Test list of metric templates on SuperPOEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(NotificationManager, 'warning');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/public_metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/public_mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])

            case '/api/v2/internal/public_ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        },
        isTenantSchema: () => Promise.resolve(false),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        bulkDeleteMetrics: mockBulkDeleteMetrics
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
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/add')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public listview renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template for details')
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
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
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternal')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('3org.apel.APEL-PubPassivenone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/org.apel.APEL-Pub');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test filter metric templates list', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternal')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[1], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternal')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
  })

  test('Test bulk delete metric templates', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          info: 'Metric templates argo.AMS-Check, org.apel.APEL-Pub successfully deleted.'
        }),
        status: 200,
        ok: true,
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-org.apel.APEL-Pub'));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockBulkDeleteMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric templates argo.AMS-Check, org.apel.APEL-Pub successfully deleted.',
      'Deleted',
      2000
    );
  })

  test('Test bulk delete select all filtered metric templates', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          info: 'Metric templates argo.AMS-Check, argo.AMS-Publisher successfully deleted.'
        }),
        status: 200,
        ok: true,
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template to change')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    fireEvent.click(screen.getByTestId('checkbox-select-all'));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockBulkDeleteMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric templates argo.AMS-Check, argo.AMS-Publisher successfully deleted.',
      'Deleted',
      2000
    );
  })

  test('Test warning if clicked delete without selecting any metric template', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template to change')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>No metric templates were selected!</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error', 0, expect.any(Function)
    )
  })

  test('Test bulk delete metric template with info and warning', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          info: 'Metric template argo.AMS-Check successfully deleted.',
          warning: 'Metric template org.apel.APEL-Pub not deleted: something went wrong'
        }),
        status: 200,
        ok: true,
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-org.apel.APEL-Pub'));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockBulkDeleteMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template argo.AMS-Check successfully deleted.',
      'Deleted',
      2000
    );
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric template org.apel.APEL-Pub not deleted: something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      'Deleted', 0, expect.any(Function)
    )
  })

  test('Test bulk delete metric template with warning only', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          warning: 'Metric template argo.AMS-Check, org.apel.APEL-Pub not deleted: something went wrong'
        }),
        status: 200,
        ok: true,
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-org.apel.APEL-Pub'));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockBulkDeleteMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).not.toHaveBeenCalled();
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric template argo.AMS-Check, org.apel.APEL-Pub not deleted: something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      'Deleted', 0, expect.any(Function)
    )
  })

  test('Test bulk delete metric template with error', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-org.apel.APEL-Pub'));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockBulkDeleteMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).not.toHaveBeenCalled();
    expect(NotificationManager.warning).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting metric templates</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Test list of metric templates on SuperPOEM if empty list', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(NotificationManager, 'warning');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve([]);

            case '/api/v2/internal/public_metrictemplates':
              return Promise.resolve([]);

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/public_mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])

            case '/api/v2/internal/public_ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        },
        isTenantSchema: () => Promise.resolve(false),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        bulkDeleteMetrics: mockBulkDeleteMetrics
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /deprecated/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metric templates');
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/add');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public listview renders properly', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template for details')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(2);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /deprecated/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metric templates');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })
})

describe('Test list of metric templates on tenant POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(NotificationManager, 'info');
  jest.spyOn(NotificationManager, 'warning');

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
        isTenantSchema: () => Promise.resolve(true),
        isActiveSession: () => Promise.resolve(mockTenantActiveSession),
        importMetrics: mockImportMetrics
      }
    })
  })

  test('Test that listview renders properly', async () => {
    renderTenantListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import')
    })

    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    expect(screen.getByRole('columnheader', { name: 'Select all' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /os/i }).textContent).toBe('OS');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Passive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'internal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deprecated' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 6' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 7' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('org.apel.APEL-PubPassivenone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/org.apel.APEL-Pub');
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test filter metric templates list', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template(s) to import')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[2], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[1], { target: { value: 'CentOS 6' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metric templates');

    fireEvent.change(screen.getByDisplayValue('internal'), { target: { value: 'Show all' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
  })

  test('Test import metric templates', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          imported: 'argo.AMS-Check, argo.AMS-Publisher have been successfully imported.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Publisher'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'argo.AMS-Check, argo.AMS-Publisher have been successfully imported.',
      'Imported',
      2000
    );
  })

  test('Test importing of metric templates if no metric template has been selected', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>No metric templates were selected!</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error', 0, expect.any(Function)
    )

    await waitFor(() => {
      expect(mockImportMetrics).not.toHaveBeenCalled()
    })
  })

  test('Test importing of metric templates if warn message', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          warn: 'argo.AMS-Check, argo.AMS-Publisher have been imported with older probe version. If you wish to use more recent probe version, you should update package version you use.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Publisher'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.info).toHaveBeenCalledWith(
      <div>
        <p>argo.AMS-Check, argo.AMS-Publisher have been imported with older probe version. If you wish to use more recent probe version, you should update package version you use.</p>
        <p>Click to dismiss.</p>
      </div>,
     'Imported with older probe version', 0, expect.any(Function)
    )
  })

  test('Test importing of metric templates if err message', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          err: 'argo.AMS-Check, argo.AMS-Publisher have not been imported since they already exist in the database.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Publisher'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>argo.AMS-Check, argo.AMS-Publisher have not been imported since they already exist in the database.</p>
        <p>Click to dismiss.</p>
      </div>,
     'Not imported', 0, expect.any(Function)
    )
  })

  test('Test importing of metric templates if unavailable message', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          unavailable: 'argo.AMS-Check, argo.AMS-Publisher have not been imported, since they are not available for the package version you use. If you wish to use the metric, you should change the package version, and try to import again.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Publisher'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>argo.AMS-Check, argo.AMS-Publisher have not been imported, since they are not available for the package version you use. If you wish to use the metric, you should change the package version, and try to import again.</p>
        <p>Click to dismiss.</p>
      </div>,
     'Unavailable', 0, expect.any(Function)
    )
  })

  test('Test importing of metric templates if mixed messages', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          imported: 'argo.AMS-Check has been successfully imported.',
          warn: 'argo.AMS-Publisher has been imported with older probe version. If you wish to use more recent probe version, you should update package version you use.',
          err: 'org.apel.APEL-Pub has not been imported since it already exists in the database.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Check'));
    fireEvent.click(screen.getByTestId('checkbox-argo.AMS-Publisher'));
    fireEvent.click(screen.getByTestId('checkbox-org.apel.APEL-Pub'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'argo.AMS-Check has been successfully imported.',
      'Imported', 2000
    )

    expect(NotificationManager.info).toHaveBeenCalledWith(
      <div>
        <p>argo.AMS-Publisher has been imported with older probe version. If you wish to use more recent probe version, you should update package version you use.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Imported with older probe version', 0, expect.any(Function)
    )

    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>org.apel.APEL-Pub has not been imported since it already exists in the database.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Not imported', 0, expect.any(Function)
    )
  })

  test('Test select all when importing metric templates', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          imported: 'argo.AMS-Check, argo.AMS-Publisher, org.apel.APEL-Pub have been successfully imported.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.click(screen.getByTestId('checkbox-select-all'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher', 'org.apel.APEL-Pub'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'argo.AMS-Check, argo.AMS-Publisher, org.apel.APEL-Pub have been successfully imported.',
      'Imported', 2000
    )
  })

  test('Test select all when importing metric templates if filtered', async () => {
    mockImportMetrics.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          imported: 'argo.AMS-Check, argo.AMS-Publisher have been successfully imported.'
        }),
        status: 200,
        ok: true
      })
    )

    renderTenantListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template(s) to import');
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    fireEvent.click(screen.getByTestId('checkbox-select-all'));

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(mockImportMetrics).toHaveBeenCalledWith(
        { metrictemplates: ['argo.AMS-Check', 'argo.AMS-Publisher'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'argo.AMS-Check, argo.AMS-Publisher have been successfully imported.',
      'Imported', 2000
    )
  })
})

describe('Test metric template changeview on SuperPOEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/metrictemplates/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplate)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal', 'deprecated'])

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)
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
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template');
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('autocomplete-probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByTestId('group');
    const executableField = screen.getByTestId('probeexecutable');
    const configKey1 = screen.getByTestId('config.0.key');
    const configKey2 = screen.getByTestId('config.1.key');
    const configKey3 = screen.getByTestId('config.2.key');
    const configKey4 = screen.getByTestId('config.3.key');
    const configKey5 = screen.getByTestId('config.4.key');
    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const configVal5 = screen.getByTestId('config.4.value');
    const attributeKey = screen.getByTestId('attributes.0.key');
    const attributeVal = screen.getByTestId('attributes.0.value')
    const dependencyKey = screen.getByTestId('dependency.0.key');
    const dependencyVal = screen.getByTestId('dependency.0.value');
    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');
    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');
    const parentField = screen.getByTestId('autocomplete-parent');

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(typeField.value).toBe('Active');
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument()
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(groupField).not.toBeInTheDocument();
    expect(executableField.value).toBe('ams-probe');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toHaveAttribute('readonly');
    expect(configVal1.value).toBe('4');
    expect(configVal1).not.toHaveAttribute('readonly');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toHaveAttribute('readonly');
    expect(configVal2.value).toBe('70');
    expect(configVal2).not.toHaveAttribute('readonly');
    expect(configKey3.value).toBe('path');
    expect(configKey3).toHaveAttribute('readonly');
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3).not.toHaveAttribute('readonly');
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toHaveAttribute('readonly');
    expect(configVal4.value).toBe('5');
    expect(configVal4).not.toHaveAttribute('readonly');
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toHaveAttribute('readonly');
    expect(configVal5.value).toBe('3');
    expect(configVal5).not.toHaveAttribute('readonly');
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeVal.value).toBe('--token');
    expect(dependencyKey.value).toBe('');
    expect(dependencyVal.value).toBe('');
    expect(parameterKey.value).toBe('--project');
    expect(parameterVal.value).toBe('EGI');
    expect(flagKey.value).toBe('OBSESS');
    expect(flagVal.value).toBe('1');
    expect(parentField.value).toBe('');
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check/history');
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check/clone');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test change metric template and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template');
    })

    const nameField = screen.getByTestId('name');
    const probeField = screen.getByTestId('autocomplete-probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const executableField = screen.getByTestId('probeexecutable');
    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const configVal5 = screen.getByTestId('config.4.value');
    const dependencyKey = screen.getByTestId('dependency.0.key');
    const dependencyVal = screen.getByTestId('dependency.0.value');

    fireEvent.change(nameField, { target: { value: 'argo.AMS-Check-new' } })
    fireEvent.change(probeField, { target: { value: 'ams-probe-new (0.1.13)' } });
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.13)')
    expect(packageField).toBeDisabled();

    fireEvent.change(descriptionField, { target: { value: 'New description for metric template.' } });
    fireEvent.change(executableField, { target: { value: 'ams-probe-new' } })

    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    fireEvent.change(configVal1, { target: { value: '5' } });
    fireEvent.change(configVal2, { target: { value: '80' } });
    fireEvent.change(configVal4, { target: { value: '6' } });
    fireEvent.change(configVal5, { target: { value: '4' } });

    fireEvent.click(screen.getByTestId('attributes.addnew'));
    fireEvent.change(screen.getByTestId('attributes.1.key'), { target: { value: 'ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId('attributes.1.value'), { target: { value: '--meh' } });

    fireEvent.change(dependencyKey, { target: { value: 'some-dep' } });
    fireEvent.change(dependencyVal, { target: { value: 'some-dep-value' } });

    fireEvent.click(screen.getByTestId('parameter.0.remove'));

    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'id': '1',
          'name': 'argo.AMS-Check-new',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'New description for metric template.',
          'probeversion': 'ams-probe-new (0.1.13)',
          'parent': '',
          'probeexecutable': 'ams-probe-new',
          'config': [
            { key: 'maxCheckAttempts', value: '5' },
            { key: 'timeout', value: '80' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '6' },
            { key: 'retryInterval', value: '4' }
          ],
          'attribute': [
            { key: 'argo.ams_TOKEN', value: '--token' },
            { key: 'ATTRIBUTE', value: '--meh', isNew: true }
          ],
          'dependency': [
            { key: 'some-dep', value: 'some-dep-value' }
          ],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ],
          'files': [{ key: '', value: '' }],
          'fileparameter': [{ key: '', value: '' }]
        }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test('Test error in saving metric template with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'You should choose existing probe version!' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template')
    })

    const probeField = screen.getByTestId('autocomplete-probeversion')
    const packageField = screen.getByTestId('package');

    fireEvent.change(probeField, { target: { value: 'ams-probe-new' } });
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'id': '1',
          'name': 'argo.AMS-Check',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'Some description of argo.AMS-Check metric template.',
          'probeversion': 'ams-probe-new',
          'parent': '',
          'probeexecutable': 'ams-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '70' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '5' },
            { key: 'retryInterval', value: '3' }
          ],
          'attribute': [
            { key: 'argo.ams_TOKEN', value: '--token' }
          ],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '--project', value: 'EGI' }],
          'flags': [
            { key: 'OBSESS', value: '1' }
          ],
          'files': [{ key: '', value: '' }],
          'fileparameter': [{ key: '', value: '' }]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>You should choose existing probe version!</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric template without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template')
    })

    const probeField = screen.getByTestId('autocomplete-probeversion')
    const packageField = screen.getByTestId('package');

    fireEvent.change(probeField, { target: { value: 'ams-probe-new' } });
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'id': '1',
          'name': 'argo.AMS-Check',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'Some description of argo.AMS-Check metric template.',
          'probeversion': 'ams-probe-new',
          'parent': '',
          'probeexecutable': 'ams-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '70' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '5' },
            { key: 'retryInterval', value: '3' }
          ],
          'attribute': [
            { key: 'argo.ams_TOKEN', value: '--token' }
          ],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '--project', value: 'EGI' }],
          'flags': [
            { key: 'OBSESS', value: '1' }
          ],
          'files': [{ key: '', value: '' }],
          'fileparameter': [{ key: '', value: '' }]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric template</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})