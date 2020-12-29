import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ListOfMetrics } from '../Metrics';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { queryCache } from 'react-query'


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockBulkDeleteMetrics = jest.fn();


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
        isActiveSession: () => Promise.resolve(mockTenantActiveSession)
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
})