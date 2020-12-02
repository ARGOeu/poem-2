import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Route, Router } from 'react-router-dom';
import { ListOfMetrics, MetricChange } from '../Metrics';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';


const mockListOfMetrics = [
  {
    id: 1,
    name: 'argo.AMS-Check',
    mtype: 'Active',
    tags: ['test_tag1', 'test_tag2'],
    probeversion: 'ams-probe (0.1.12)',
    group: 'EGI',
    description: 'Description of argo.AMS-Check metric',
    parent: '',
    probeexecutable: 'ams-probe',
    config: [
      { key: 'maxCheckAttempts', value: '3' },
      { key: 'timeout', value: '60' },
      { key: 'interval', value: '5' },
      { key: 'retryInterval', value: '3' },
      { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' }
    ],
    attribute: [
      { key: 'argo.ams_TOKEN', value: '--token' }
    ],
    dependancy: '',
    flags: [
      { key: 'OBSESS', value: '1' }
    ],
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
    group: 'EGI',
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
    tags: [],
    probeversion: '',
    group: 'ARGOTEST',
    description: '',
    parent: '',
    probeexecutable: '',
    config: [],
    attribute: [],
    dependancy: [],
    flags: [
      { key: 'OBSESS', value: '1' },
      { key: 'PASSIVE', value: '1' }
    ],
    files: [],
    parameter: [],
    fileparameter: []
  }
];

const mockChangeObject = jest.fn();

jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn().mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/mtypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal'])

            case '/api/v2/internal/metric':
              return Promise.resolve(mockListOfMetrics)
          }
        },
        fetchResult: () => Promise.resolve({
          'aggregations': ['EGI'],
          'metrics': ['EGI', 'ARGOTEST'],
          'metricprofiles': ['EGI'],
          'thresholdsprofiles': ['EGI']
        }),
        isTenantSchema: () => Promise.resolve(true),
        isActiveSession: () => Promise.resolve({
          active: true,
          userdetails: {
            is_superuser: false,
            username: 'testuser',
            groups: {
              aggregations: ['EGI'],
              metricprofiles: ['EGI'],
              metrics: ['EGI'],
              thresholdsprofiles: ['EGI']
            },
            token: '1234token_rw'
          }
        })
      }
    })
  }
})


beforeEach(() => {
  jest.clearAllMocks()
})


function renderListView() {
  const history = createMemoryHistory();

  return {
    ...render(
      <Router history={history}>
        <Route render={props => <ListOfMetrics {...props} type='metrics' />} />
      </Router>
    )
  }
}


function renderChangeView() {
  const route = '/ui/metrics/argo.AMS-Check';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/metrics/:name'
          render={ props => <MetricChange {...props} /> }
        />
      </Router>
    )
  }
}


describe('Tests for metrics listview', () => {
  test('Test that metrics listview renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric for details')
    })
    // double column header length because search fields are also th
    expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe('Group');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternal')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('3org.apel.APEL-PubPassiveARGOTESTnone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/org.apel.APEL-Pub');
    expect(screen.queryByText(/add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  })

  test('Test filter metrics', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric for details')
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternal')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[2], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternal')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
  })

  test('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/mtypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(['test_tag1', 'test_tag2', 'internal'])

            case '/api/v2/internal/metric':
              return Promise.resolve([])
          }
        }
      }
    })

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric for details')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe('Group');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metrics');
    expect(screen.queryByText(/add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  })
})

const mockMetric = {
  id: 1,
  name: 'argo.AMS-Check',
  mtype: 'Active',
  tags: ['test_tag1', 'test_tag2'],
  probeversion: 'ams-probe (0.1.12)',
  group: 'EGI',
  description: 'Description of argo.AMS-Check metric',
  parent: '',
  probeexecutable: 'ams-probe',
  config: [
    { key: 'maxCheckAttempts', value: '3' },
    { key: 'timeout', value: '60' },
    { key: 'interval', value: '5' },
    { key: 'retryInterval', value: '3' },
    { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' }
  ],
  attribute: [
    { key: 'argo.ams_TOKEN', value: '--token' }
  ],
  dependancy: '',
  flags: [
    { key: 'OBSESS', value: '1' }
  ],
  parameter: [
    { key: '--project', value: 'EGI' }
  ],
  fileparameter: []
};

const mockProbe = [{
  id: '13',
  object_repr: 'ams-probe (0.1.12)',
  fields: {
    name: 'ams-probe',
    version: '0.1.12',
    package: 'nagios-plugins-argo (0.1.12)',
    description: 'Probe description',
    comment: 'Initial version',
    repository: 'https://github.com/ARGOeu/nagios-plugins-argo',
    docurl: 'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/README.md'
  },
  user: 'testuser',
  date_created: '2020_11_30 12:00:00',
  comment: 'Initial version.',
  version: '0.1.12'
}];

describe('Tests for metric change', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metric/argo.AMS-Check':
              return Promise.resolve(mockMetric)

            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(mockProbe)
          }
        },
        isActiveSession: () => Promise.resolve({
          active: true,
          userdetails: {
            is_superuser: false,
            username: 'testuser',
            groups: {
              aggregations: ['EGI'],
              metricprofiles: ['EGI'],
              metrics: ['EGI', 'ARGOTEST'],
              thresholdsprofiles: ['EGI']
            },
            token: '1234token_rw'
          }
        }),
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion');
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.getByTestId('group');
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
    const dependencyKey = screen.getByTestId('empty-key.dependency');
    const dependencyVal = screen.getByTestId('empty-value.dependency');
    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');
    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');
    const parentField = screen.getByTestId('parent');

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toHaveAttribute('readOnly');
    expect(typeField.value).toBe('Active');
    expect(typeField).toHaveAttribute('readonly');
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();
    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);
    expect(descriptionField.value).toBe('Description of argo.AMS-Check metric');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('EGI');
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /metric conf/i }).textContent).toBe('Metric configuration');
    expect(screen.getByRole('heading', { name: /exec/i }).textContent).toBe('probe executable');
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toHaveAttribute('readonly');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toHaveAttribute('readonly');
    expect(configVal1.value).toBe('3');
    expect(configVal1).not.toHaveAttribute('readonly');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toHaveAttribute('readonly');
    expect(configVal2.value).toBe('60');
    expect(configVal2).not.toHaveAttribute('readonly');
    expect(configKey3.value).toBe('interval');
    expect(configKey3).toHaveAttribute('readonly');
    expect(configVal3.value).toBe('5')
    expect(configVal3).not.toHaveAttribute('readonly');
    expect(configKey4.value).toBe('retryInterval');
    expect(configKey4).toHaveAttribute('readonly');
    expect(configVal4.value).toBe('3')
    expect(configVal4).not.toHaveAttribute('readonly');
    expect(configKey5.value).toBe('path');
    expect(configKey5).toHaveAttribute('readonly');
    expect(configVal5.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal5).toHaveAttribute('readonly');
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toHaveAttribute('readonly');
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toHaveAttribute('readonly');
    expect(dependencyKey.value).toBe('');
    expect(dependencyKey).toHaveAttribute('readonly');
    expect(dependencyVal.value).toBe('');
    expect(dependencyVal).toHaveAttribute('readonly');
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toHaveAttribute('readonly');
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toHaveAttribute('readonly');
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toHaveAttribute('readonly');
    expect(flagVal.value).toBe('1');
    expect(flagVal).toHaveAttribute('readonly');
    expect(parentField.value).toBe('');
    expect(parentField).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check/history')
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test successfully changing metric', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');
    })

    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const groupField = screen.getByTestId('group');

    fireEvent.change(configVal1, { target: { value: '4' } });
    fireEvent.change(configVal2, { target: { value: '70' } });
    fireEvent.change(configVal3, { target: { value: '4' } });
    fireEvent.change(configVal4, { target: { value: '2' } });
    fireEvent.change(groupField, { target: { value: 'ARGOTEST' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/',
        {
          name: mockMetric.name,
          mtype: mockMetric.mtype,
          group: 'ARGOTEST',
          description: mockMetric.description,
          parent: mockMetric.parent,
          probeversion: mockMetric.probeversion,
          probeexecutable: mockMetric.probeexecutable,
          config: [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '70' },
            { key: 'interval', value: '4' },
            { key: 'retryInterval', value: '2' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo'}
          ],
          attribute: mockMetric.attribute,
          dependancy: mockMetric.dependancy,
          flags: mockMetric.flags,
          parameter: mockMetric.parameter,
          fileparameter: mockMetric.fileparameter
        }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric successfully changed', 'Changed', 2000
    )
  })

  test('Test error in saving metric with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');
    })

    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const groupField = screen.getByTestId('group');

    fireEvent.change(configVal1, { target: { value: '4' } });
    fireEvent.change(configVal2, { target: { value: '70' } });
    fireEvent.change(configVal3, { target: { value: '4' } });
    fireEvent.change(configVal4, { target: { value: '2' } });
    fireEvent.change(groupField, { target: { value: 'ARGOTEST' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/',
        {
          name: mockMetric.name,
          mtype: mockMetric.mtype,
          group: 'ARGOTEST',
          description: mockMetric.description,
          parent: mockMetric.parent,
          probeversion: mockMetric.probeversion,
          probeexecutable: mockMetric.probeexecutable,
          config: [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '70' },
            { key: 'interval', value: '4' },
            { key: 'retryInterval', value: '2' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo'}
          ],
          attribute: mockMetric.attribute,
          dependancy: mockMetric.dependancy,
          flags: mockMetric.flags,
          parameter: mockMetric.parameter,
          fileparameter: mockMetric.fileparameter
        }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');
    })

    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const groupField = screen.getByTestId('group');

    fireEvent.change(configVal1, { target: { value: '4' } });
    fireEvent.change(configVal2, { target: { value: '70' } });
    fireEvent.change(configVal3, { target: { value: '4' } });
    fireEvent.change(configVal4, { target: { value: '2' } });
    fireEvent.change(groupField, { target: { value: 'ARGOTEST' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/',
        {
          name: mockMetric.name,
          mtype: mockMetric.mtype,
          group: 'ARGOTEST',
          description: mockMetric.description,
          parent: mockMetric.parent,
          probeversion: mockMetric.probeversion,
          probeexecutable: mockMetric.probeexecutable,
          config: [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '70' },
            { key: 'interval', value: '4' },
            { key: 'retryInterval', value: '2' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo'}
          ],
          attribute: mockMetric.attribute,
          dependancy: mockMetric.dependancy,
          flags: mockMetric.flags,
          parameter: mockMetric.parameter,
          fileparameter: mockMetric.fileparameter
        }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})