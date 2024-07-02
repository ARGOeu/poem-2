import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CompareMetrics, ListOfMetrics, MetricChange, MetricVersionDetails } from '../Metrics';
import { Backend, WebApi } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { QueryClientProvider, QueryClient, setLogger } from 'react-query';
import  selectEvent from 'react-select-event';


const mockListOfMetrics = [
  {
    id: 1,
    name: 'argo.AMS-Check',
    mtype: 'Active',
    tags: ['test_tag1', 'test_tag2'],
    profiles: ["ARGO_MON", "TEST_PROFILE"],
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
    profiles: ["ARGO_MON_INTERNAL"],
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
    profiles: [],
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

const mockMetric = {
  id: 1,
  name: 'argo.AMS-Check',
  mtype: 'Active',
  tags: ['test_tag1', 'test_tag2'],
  profiles: ["ARGO_MON", "TEST_PROFILE"],
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
  dependancy: [],
  flags: [
    { key: 'OBSESS', value: '1' }
  ],
  parameter: [
    { key: '--project', value: 'EGI' }
  ],
  files: [],
  fileparameter: []
};

const mockMetricWithDependency = {
  id: 422,
  name: "srce.gridproxy.validity",
  mtype: "Active",
  tags: [
    "test_tag1",
    "test_tag2",
    "internal"
  ],
  probeversion: "GridProxy-probe (0.2.0)",
  group: "EGI",
  description: "",
  parent: "",
  probeexecutable: "GridProxy-probe",
  config: [
    {
      key: "maxCheckAttempts",
      value: "3"
    },
    {
      key: "timeout",
      value: "30"
    },
    {
      key: "path",
      value: "/usr/libexec/argo/probes/globus"
    },
    {
      key: "interval",
      value: "15"
    },
    {
      key: "retryInterval",
      value: "3"
    }
  ],
  attribute: [
    {
      key: "VONAME",
      value: "--vo"
    },
    {
      key: "X509_USER_PROXY",
      value: "-x"
    }
  ],
  dependancy: [
    {
      key: "hr.srce.GridProxy-Get",
      value: "0"
    }
  ],
  flags: [
    {
      key: "NOHOSTNAME",
      value: "1"
    },
    {
      key: "VO",
      value: "1"
    },
    {
      key: "NOPUBLISH",
      value: "1"
    }
  ],
  files: [],
  parameter: [],
  fileparameter: []
}

const mockPassiveMetric = {
    id: 2,
    name: 'org.apel.APEL-Pub',
    mtype: 'Passive',
    tags: [],
    profiles: [],
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

const mockProbe2 = [{
    id: '64',
    object_repr: "GridProxy-probe (0.2.0)",
    fields: {
        name: "GridProxy-probe",
        version: "0.2.0",
        package: "argo-probe-globus (0.2.0)",
        description: "Probe for functional checking of MyProxy service.",
        comment: "Harmonized version.",
        repository: "https://github.com/ARGOeu-Metrics/argo-probe-globus",
        docurl: "https://github.com/ARGOeu-Metrics/argo-probe-globus/blob/master/README.md"
    },
    user: "poem",
    date_created: "2019-12-09 09:24:20",
    comment: "Initial version.",
    version: "0.2.0"
}]

const mockUserGroups = {
  'aggregations': ['EGI'],
  'metrics': ['EGI', 'ARGOTEST'],
  'metricprofiles': ['EGI'],
  'thresholdsprofiles': ['EGI']
}

const mockActiveSession = {
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
}

const mockMetricVersion = [
  {
    id: 14,
    object_repr: 'argo.AMS-Check-new',
    fields: {
      name: 'argo.AMS-Check-new',
      mtype: 'Active',
      tags: ['test_tag1', 'test_tag2'],
      group: 'ARGOTEST',
      probeversion: 'ams-probe (0.1.13)',
      description: 'Description of argo.AMS-Check-new',
      parent: 'new-parent',
      probeexecutable: 'ams-probe-2',
      config: [
        { key: 'maxCheckAttempts', value: '4' },
        { key: 'timeout', value: '70' },
        { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo2' },
        { key: 'interval', value: '5' },
        { key: 'retryInterval', value: '4' }
      ],
      attribute: [
        { key: 'argo.ams_TOKEN2', value: '--token' }
      ],
      dependancy: [
        { key: 'new-key', value: 'new-value' }
      ],
      flags: [],
      files: [],
      parameter: [],
      fileparameter: [
        { key: 'new-key', value: 'new-value' }
      ]
    },
    user: 'testuser',
    date_created: '2020-12-07 13:18:23',
    comment: 'Changed config fields "maxCheckAttempts", "retryInterval" and "timeout". Added description. Changed group and probekey.',
    version: '20201207-131823'
  },
  {
    id: 10,
    object_repr: 'argo.AMS-Check',
    fields: {
      name: 'argo.AMS-Check',
      mtype: 'Active',
      tags: ['test_tag1', 'test_tag2'],
      group: 'EGI',
      probeversion: 'ams-probe (0.1.12)',
      description: '',
      parent: '',
      probeexecutable: 'ams-probe',
      config: [
        { key: 'maxCheckAttempts', value: '3' },
        { key: 'timeout', value: '60' },
        { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
        { key: 'interval', value: '5' },
        { key: 'retryInterval', value: '3' }
      ],
      attribute: [
        { key: 'argo.ams_TOKEN', value: '--token' }
      ],
      dependancy: [],
      flags: [
        { key: 'OBSESS', value: '1' }
      ],
      files: [],
      parameter: [
        { key: '--project', value: 'EGI' }
      ],
      fileparameter: []
    },
    user: 'testuser',
    date_created: '2020-11-30 13:23:48',
    comment: 'Initial version.',
    version: '20201130-132348'
  }
]

const mockMetricTags = [
  {
    id: 1,
    name: "test_tag1"
  },
  {
    id: 2,
    name: "test_tag2"
  },
  {
    id: 3,
    name: "internal"
  }
]

const mockMetricProfiles = [
  {
    id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    date: "2022-08-10",
    name: "ARGO_MON",
    description: "Central ARGO-MON profile",
    services: [
      {
        service: "argo.ams",
        metrics: [
          "argo.AMS-Check",
          "argo.AMS-Publisher"
        ]
      }
    ]
  },
  {
    id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    date: "2022-08-10",
    name: "TEST_PROFILE",
    description: "Profile for testing",
    services: [
      {
        service: "argo.test",
        metrics: [
          "argo.AMS-Check"
        ]
      }
    ]
  }
]

const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

const queryClient = new QueryClient();

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})

beforeEach(() => {
  jest.clearAllMocks()
  queryClient.clear();
})


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? "public_" : ""}metrics`

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ListOfMetrics
              type='metrics'
              isTenantSchema={ true }
              publicView={ true }
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ListOfMetrics
              type='metrics'
              isTenantSchema={ true }
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(options = {}) {
  const publicView = options.publicView ? options.publicView : false;
  const route = options.route ?
    options.route
  :
    `/ui/${publicView ? 'public_' : ''}metrics/argo.AMS-Check`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_metrics/:name"
                element={
                  <MetricChange
                    publicView={ true }
                  />
                }
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
                path="/ui/metrics/:name"
                element={ <MetricChange /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderVersionDetailsView() {
  const route = '/ui/metrics/argo.AMS-Check/history/20201130-132348';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/metrics/:name/history/:version"
              element={ <MetricVersionDetails /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderCompareView() {
  const route = '/ui/metrics/argo.AMS-Check/history/compare/20201130-132348/20201207-131823';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/metrics/:name/history/compare/:id1/:id2"
              element={ <CompareMetrics type="metric" /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Tests for metrics listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/metric':
              return Promise.resolve(mockListOfMetrics)

            case '/api/v2/internal/public_metric':
              return Promise.resolve(mockListOfMetrics)

            case '/api/v2/internal/public_mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(mockMetricTags)
          }
        },
        fetchResult: () => Promise.resolve(mockUserGroups),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles)
      }
    })
  })

  test('Test that metrics listview renders properly', async () => {
    renderListView();

    await waitFor(() => {
      // double column header length because search fields are also th
      expect(screen.getAllByRole('columnheader')).toHaveLength(14);
    })

    expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric to change')

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe('Group');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getByRole('columnheader', { name: /profile/i }).textContent).toBe('Metric profile');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getByRole("option", { name: /argo_mon/i })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /test_profile/i })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2ARGO_MONTEST_PROFILE')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('3org.apel.APEL-PubPassiveARGOTESTnonenone')
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
      expect(screen.getAllByRole("columnheader")).toHaveLength(14)
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2ARGO_MONTEST_PROFILE')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[2], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
  })

  test('Test render public listview', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(14)
    })

    expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric for details')
      
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe('Group');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getByRole('columnheader', { name: /profile/i }).textContent).toBe('Metric profile');
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getByRole("option", { name: "ARGO_MON" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "TEST_PROFILE" })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2ARGO_MONTEST_PROFILE')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('3org.apel.APEL-PubPassiveARGOTESTnonenone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/org.apel.APEL-Pub');
    expect(screen.queryByText(/add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  })

  test('Test filter metrics in public list view', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(14)
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveEGItest_tag1test_tag2ARGO_MONTEST_PROFILE')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[2], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveEGIinternalARGO_MON')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrics/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/public_probes/ams-publisher-probe/history/0.1.12')
  })

  test('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/metric':
              return Promise.resolve([])
          }
        },
        fetchResult: () => Promise.resolve(mockUserGroups),
        isTenantSchema: () => Promise.resolve(true),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })

    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles)
      }
    })

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(14);
    })

    expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric to change')

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe('Group');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getByRole('columnheader', { name: /profile/i }).textContent).toBe('Metric profile')
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(4);
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /passive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /egi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /argotest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /internal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /test_tag/i })).toHaveLength(2);
    expect(screen.getByRole("option", { name: "ARGO_MON" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "TEST_PROFILE" })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metrics');
    expect(screen.queryByText(/add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  })
})


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

            case '/api/v2/internal/metric/org.apel.APEL-Pub':
              return Promise.resolve(mockPassiveMetric)

            case "/api/v2/internal/metric/srce.gridproxy.validity":
              return Promise.resolve(mockMetricWithDependency)

            case '/api/v2/internal/public_metric/argo.AMS-Check':
              return Promise.resolve(mockMetric)

            case '/api/v2/internal/public_metric/org.apel.APEL-Pub':
              return Promise.resolve(mockPassiveMetric)

            case "/api/v2/internal/public_metric/srce.gridproxy.validity":
              return Promise.resolve(mockMetricWithDependency)

            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(mockProbe)
            
            case "/api/v2/internal/version/probe/GridProxy-probe":
              return Promise.resolve(mockProbe2)

            case '/api/v2/internal/public_version/probe/ams-probe':
              return Promise.resolve(mockProbe)
            
            case "/api/v2/internal/public_version/probe/GridProxy-probe":
              return Promise.resolve(mockProbe2)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()

    const probeField = screen.getByTestId('probeversion');
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();

    const packageField = screen.getByTestId('package');
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();

    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe('Description of argo.AMS-Check metric');
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByText('EGI');
    expect(groupField).toBeEnabled()

    expect(screen.queryByText('ARGOTEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGOTEST')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /metric configuration/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /executable/i }).textContent).toBe('probe executable');
    const executableField = screen.getByTestId('probeexecutable');
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()

    const configKey1 = screen.getByTestId('config.0.key');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()

    const configKey2 = screen.getByTestId('config.1.key');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()

    const configKey3 = screen.getByTestId('config.2.key');
    expect(configKey3.value).toBe('interval');
    expect(configKey3).toBeDisabled()

    const configKey4 = screen.getByTestId('config.3.key');
    expect(configKey4.value).toBe('retryInterval');
    expect(configKey4).toBeDisabled()

    const configKey5 = screen.getByTestId('config.4.key');
    expect(configKey5.value).toBe('path');
    expect(configKey5).toBeDisabled()

    const configVal1 = screen.getByTestId('config.0.value');
    expect(configVal1.value).toBe('3');
    expect(configVal1).not.toBeDisabled()

    const configVal2 = screen.getByTestId('config.1.value');
    expect(configVal2.value).toBe('60');
    expect(configVal2).not.toBeDisabled()

    const configVal3 = screen.getByTestId('config.2.value');
    expect(configVal3.value).toBe('5')
    expect(configVal3).not.toBeDisabled()

    const configVal4 = screen.getByTestId('config.3.value');
    expect(configVal4.value).toBe('3')
    expect(configVal4).not.toBeDisabled()

    const configVal5 = screen.getByTestId('config.4.value');
    expect(configVal5.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal5).toBeDisabled()

    const attributeKey = screen.getByTestId('attributes.0.key');
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()

    const attributeVal = screen.getByTestId('attributes.0.value')
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    const parameterKey = screen.getByTestId('parameter.0.key');
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()

    const parameterVal = screen.getByTestId('parameter.0.value');
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()

    const flagKey = screen.getByTestId('flags.0.key');
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()

    const flagVal = screen.getByTestId('flags.0.value');
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()

    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check/history')
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that page renders properly if metric with dependency', async () => {
    renderChangeView({ route: "/ui/metrics/srce.gridproxy.validity" })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe("srce.gridproxy.validity")
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()

    const probeField = screen.getByTestId('probeversion');
    expect(probeField.value).toBe('GridProxy-probe (0.2.0)');
    expect(probeField).toBeDisabled();

    const packageField = screen.getByTestId('package');
    expect(packageField.value).toBe('argo-probe-globus (0.2.0)');
    expect(packageField).toBeDisabled();

    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);
    expect(screen.getByText("internal")).toBeInTheDocument()

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe("")
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByText('EGI');
    expect(groupField).toBeEnabled()

    expect(screen.queryByText('ARGOTEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGOTEST')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /metric configuration/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /executable/i }).textContent).toBe('probe executable');
    const executableField = screen.getByTestId('probeexecutable');
    expect(executableField.value).toBe('GridProxy-probe');
    expect(executableField).toBeDisabled()

    const configKey1 = screen.getByTestId('config.0.key');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()

    const configKey2 = screen.getByTestId('config.1.key');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()

    const configKey3 = screen.getByTestId('config.2.key');
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()

    const configKey4 = screen.getByTestId('config.3.key');
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()

    const configKey5 = screen.getByTestId('config.4.key');
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()

    const configVal1 = screen.getByTestId('config.0.value');
    expect(configVal1.value).toBe('3');
    expect(configVal1).not.toBeDisabled()

    const configVal2 = screen.getByTestId('config.1.value');
    expect(configVal2.value).toBe('30');
    expect(configVal2).not.toBeDisabled()

    const configVal3 = screen.getByTestId('config.2.value');
    expect(configVal3.value).toBe("/usr/libexec/argo/probes/globus")
    expect(configVal3).toBeDisabled()

    const configVal4 = screen.getByTestId('config.3.value');
    expect(configVal4.value).toBe('15')
    expect(configVal4).not.toBeDisabled()

    const configVal5 = screen.getByTestId('config.4.value');
    expect(configVal5.value).toBe("3")
    expect(configVal5).not.toBeDisabled()

    const attributeKey1 = screen.getByTestId('attributes.0.key');
    expect(attributeKey1.value).toBe("VONAME");
    expect(attributeKey1).toBeDisabled()

    const attributeVal1 = screen.getByTestId('attributes.0.value')
    expect(attributeVal1.value).toBe('--vo');
    expect(attributeVal1).toBeDisabled()

    const attributeKey2 = screen.getByTestId("attributes.1.key")
    expect(attributeKey2.value).toBe("X509_USER_PROXY")
    expect(attributeKey2).toBeDisabled()

    const attributeVal2 = screen.getByTestId("attributes.1.value")
    expect(attributeVal2.value).toBe("-x")
    expect(attributeVal2).toBeDisabled()

    expect(screen.queryByTestId("attributes.2.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("attributes.2.value")).not.toBeInTheDocument()

    const dependencyKey = screen.getByTestId("dependency.0.key")
    expect(dependencyKey.value).toBe("hr.srce.GridProxy-Get")
    expect(dependencyKey).toBeDisabled()

    const dependencyVal= screen.getByTestId("dependency.0.value")
    expect(dependencyVal.value).toBe("0")
    expect(dependencyVal).toBeDisabled()

    const parameterKey = screen.getByTestId("parameter.0.key")
    expect(parameterKey.value).toBe("")
    expect(parameterKey).toBeDisabled()

    const parameterVal = screen.getByTestId("parameter.0.value")
    expect(parameterVal.value).toBe("")
    expect(parameterVal).toBeDisabled()

    const flagKey1 = screen.getByTestId('flags.0.key');
    expect(flagKey1.value).toBe('NOHOSTNAME');
    expect(flagKey1).toBeDisabled()

    const flagVal1 = screen.getByTestId('flags.0.value');
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()

    const flagKey2 = screen.getByTestId("flags.1.key")
    expect(flagKey2.value).toBe("VO")
    expect(flagKey2).toBeDisabled()

    const flagVal2 = screen.getByTestId("flags.1.value")
    expect(flagVal2.value).toBe("1")

    const flagKey3 = screen.getByTestId("flags.2.key")
    expect(flagKey3.value).toBe("NOPUBLISH")
    expect(flagKey3).toBeDisabled()

    const flagVal3 = screen.getByTestId("flags.2.value")
    expect(flagVal3.value).toBe("1")
    expect(flagVal3).toBeDisabled()

    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/srce.gridproxy.validity/history')
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    Backend.mockImplementationOnce(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/public_metric/argo.AMS-Check':
              return Promise.resolve(mockMetric)

            case '/api/v2/internal/public_version/probe/ams-probe':
              return Promise.resolve(mockProbe)
          }
        },
        isActiveSession: () => Promise.resolve({
          json: () => Promise.resolve({ detail: 'Authentication credentials were not provided.'}),
          status: 403,
          statusText: 'FORBIDDEN'
        })
      }
    })

    renderChangeView({ publicView: true });

    await waitFor(() => {
      expect(screen.getByTestId("config.0.key")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Metric details');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()

    const probeField = screen.getByTestId('probeversion');
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();

    const packageField = screen.getByTestId('package');
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();

    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe('Description of argo.AMS-Check metric');
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByTestId('group');
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeDisabled();
    expect(screen.queryByRole('option', { name: /egi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /argotest/i })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /metric conf/i }).textContent).toBe('Metric configuration');

    expect(screen.getByRole('heading', { name: /exec/i }).textContent).toBe('probe executable');
    const executableField = screen.getByTestId('probeexecutable');
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()

    const configKey1 = screen.getByTestId('config.0.key');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()

    const configKey2 = screen.getByTestId('config.1.key');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()

    const configKey3 = screen.getByTestId('config.2.key');
    expect(configKey3.value).toBe('interval');
    expect(configKey3).toBeDisabled()

    const configKey4 = screen.getByTestId('config.3.key');
    expect(configKey4.value).toBe('retryInterval');
    expect(configKey4).toBeDisabled()

    const configKey5 = screen.getByTestId('config.4.key');
    expect(configKey5).toBeDisabled()
    expect(configKey5.value).toBe('path');

    const configVal1 = screen.getByTestId('config.0.value');
    expect(configVal1.value).toBe('3');
    expect(configVal1).toBeDisabled()

    const configVal2 = screen.getByTestId('config.1.value');
    expect(configVal2.value).toBe('60');
    expect(configVal2).toBeDisabled()

    const configVal3 = screen.getByTestId('config.2.value');
    expect(configVal3.value).toBe('5')
    expect(configVal3).toBeDisabled()

    const configVal4 = screen.getByTestId('config.3.value');
    expect(configVal4.value).toBe('3')
    expect(configKey5).toBeDisabled()

    const configVal5 = screen.getByTestId('config.4.value');
    expect(configVal5.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal5).toBeDisabled()

    const attributeKey = screen.getByTestId('attributes.0.key');
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()

    const attributeVal = screen.getByTestId('attributes.0.value')
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    const parameterKey = screen.getByTestId('parameter.0.key');
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()

    const parameterVal = screen.getByTestId('parameter.0.value');
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()

    const flagKey = screen.getByTestId('flags.0.key');
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()

    const flagVal = screen.getByTestId('flags.0.value');
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()

    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test('Test that public page renders properly if metric with dependency', async () => {
    Backend.mockImplementationOnce(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/public_metric/srce.gridproxy.validity':
              return Promise.resolve(mockMetricWithDependency)

            case '/api/v2/internal/public_version/probe/GridProxy-probe':
              return Promise.resolve(mockProbe2)
          }
        },
        isActiveSession: () => Promise.resolve({
          json: () => Promise.resolve({ detail: 'Authentication credentials were not provided.'}),
          status: 403,
          statusText: 'FORBIDDEN'
        })
      }
    })
    renderChangeView({ publicView: true, route: "/ui/public_metrics/srce.gridproxy.validity" })

    await waitFor(() => {
      expect(screen.getByTestId("config.0.key")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Metric details');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe("srce.gridproxy.validity")
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()

    const probeField = screen.getByTestId('probeversion');
    expect(probeField.value).toBe('GridProxy-probe (0.2.0)');
    expect(probeField).toBeDisabled();

    const packageField = screen.getByTestId('package');
    expect(packageField.value).toBe('argo-probe-globus (0.2.0)');
    expect(packageField).toBeDisabled();

    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);
    expect(screen.getByText("internal")).toBeInTheDocument()

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe("")
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByTestId("group")
    expect(groupField.value).toBe("EGI")
    expect(groupField).toBeDisabled()

    expect(screen.getByRole('heading', { name: /metric configuration/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /executable/i }).textContent).toBe('probe executable');
    const executableField = screen.getByTestId('probeexecutable');
    expect(executableField.value).toBe('GridProxy-probe');
    expect(executableField).toBeDisabled()

    const configKey1 = screen.getByTestId('config.0.key');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()

    const configKey2 = screen.getByTestId('config.1.key');
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()

    const configKey3 = screen.getByTestId('config.2.key');
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()

    const configKey4 = screen.getByTestId('config.3.key');
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()

    const configKey5 = screen.getByTestId('config.4.key');
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()

    const configVal1 = screen.getByTestId('config.0.value');
    expect(configVal1.value).toBe('3');
    expect(configVal1).toBeDisabled()

    const configVal2 = screen.getByTestId('config.1.value');
    expect(configVal2.value).toBe('30');
    expect(configVal2).toBeDisabled()

    const configVal3 = screen.getByTestId('config.2.value');
    expect(configVal3.value).toBe("/usr/libexec/argo/probes/globus")
    expect(configVal3).toBeDisabled()

    const configVal4 = screen.getByTestId('config.3.value');
    expect(configVal4.value).toBe('15')
    expect(configVal4).toBeDisabled()

    const configVal5 = screen.getByTestId('config.4.value');
    expect(configVal5.value).toBe("3")
    expect(configVal5).toBeDisabled()

    const attributeKey1 = screen.getByTestId('attributes.0.key');
    expect(attributeKey1.value).toBe("VONAME");
    expect(attributeKey1).toBeDisabled()

    const attributeVal1 = screen.getByTestId('attributes.0.value')
    expect(attributeVal1.value).toBe('--vo');
    expect(attributeVal1).toBeDisabled()

    const attributeKey2 = screen.getByTestId("attributes.1.key")
    expect(attributeKey2.value).toBe("X509_USER_PROXY")
    expect(attributeKey2).toBeDisabled()

    const attributeVal2 = screen.getByTestId("attributes.1.value")
    expect(attributeVal2.value).toBe("-x")
    expect(attributeVal2).toBeDisabled()

    expect(screen.queryByTestId("attributes.2.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("attributes.2.value")).not.toBeInTheDocument()

    const dependencyKey = screen.getByTestId("dependency.0.key")
    expect(dependencyKey.value).toBe("hr.srce.GridProxy-Get")
    expect(dependencyKey).toBeDisabled()

    const dependencyVal= screen.getByTestId("dependency.0.value")
    expect(dependencyVal.value).toBe("0")
    expect(dependencyVal).toBeDisabled()

    const parameterKey = screen.getByTestId("parameter.0.key")
    expect(parameterKey.value).toBe("")
    expect(parameterKey).toBeDisabled()

    const parameterVal = screen.getByTestId("parameter.0.value")
    expect(parameterVal.value).toBe("")
    expect(parameterVal).toBeDisabled()

    const flagKey1 = screen.getByTestId('flags.0.key');
    expect(flagKey1.value).toBe('NOHOSTNAME');
    expect(flagKey1).toBeDisabled()

    const flagVal1 = screen.getByTestId('flags.0.value');
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()

    const flagKey2 = screen.getByTestId("flags.1.key")
    expect(flagKey2.value).toBe("VO")
    expect(flagKey2).toBeDisabled()

    const flagVal2 = screen.getByTestId("flags.1.value")
    expect(flagVal2.value).toBe("1")

    const flagKey3 = screen.getByTestId("flags.2.key")
    expect(flagKey3.value).toBe("NOPUBLISH")
    expect(flagKey3).toBeDisabled()

    const flagVal3 = screen.getByTestId("flags.2.value")
    expect(flagVal3.value).toBe("1")
    expect(flagVal3).toBeDisabled()

    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  test('Test that passive metric changeview renders properly', async () => {
    renderChangeView({ route: '/ui/metrics/org.apel.APEL-Pub' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Passive');
    expect(typeField).toBeDisabled()

    const probeField = screen.queryByTestId('probeversion');
    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();

    const packageField = screen.queryByTestId('package');
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByText('ARGOTEST');
    expect(groupField).toBeInTheDocument()

    expect(screen.queryByText('EGI')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('EGI')).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /metric configuration/i })).toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /probe executable/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('probeexecutable')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: "config" })).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.1.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.2.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.3.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.4.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.0.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.1.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.2.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.3.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.4.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /attributes/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('attributes.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attributes.0.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /dependency/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('dependency.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dependency.0.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /parameter/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('parameter.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('parameter.0.value')).not.toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /flags/i }).textContent).toBe('flags');
    const flagKey1 = screen.getByTestId('flags.0.key');
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagKey1).toBeDisabled()

    const flagVal1 = screen.getByTestId('flags.0.value');
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()

    const flagKey2 = screen.getByTestId('flags.1.key');
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagKey2).toBeDisabled()

    const flagVal2 = screen.getByTestId('flags.1.value');
    expect(flagVal2.value).toBe('1');
    expect(flagVal2).toBeDisabled()

    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/org.apel.APEL-Pub/history')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that passive metric public changeview renders properly', async () => {
    renderChangeView({ publicView: true, route: '/ui/public_metrics/org.apel.APEL-Pub' });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /detail/i }).textContent).toBe('Metric details');

    const nameField = screen.getByTestId('name');
    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(nameField).toBeDisabled()

    const typeField = screen.getByTestId('mtype');
    expect(typeField.value).toBe('Passive');
    expect(typeField).toBeDisabled()

    const probeField = screen.queryByTestId('probeversion');
    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();

    const packageField = screen.queryByTestId('package');
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();

    const descriptionField = screen.getByTestId('description');
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();

    const groupField = screen.getByTestId('group');
    expect(groupField.value).toBe('ARGOTEST');
    expect(screen.queryByRole('option', { name: /egi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /argotest/i })).not.toBeInTheDocument();

    expect(screen.queryByTestId('probeexecutable')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: "config" })).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.1.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.2.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.3.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.4.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.0.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.1.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.2.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.3.value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.4.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /attributes/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('attributes.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attributes.0.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /dependency/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('dependency.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dependency.0.value')).not.toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /parameter/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('parameter.0.key')).not.toBeInTheDocument()
    expect(screen.queryByTestId('parameter.0.value')).not.toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /flags/i })).toBeInTheDocument()
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.getByTestId('flags.1.key');
    const flagVal2 = screen.getByTestId('flags.1.value');
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagKey1).toBeDisabled()
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagKey2).toBeDisabled()
    expect(flagVal2.value).toBe('1');
    expect(flagVal2).toBeDisabled()

    expect(screen.getByRole('heading', { name: /parent/i })).toBeInTheDocument()
    const parentField = screen.getByTestId('parent');
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test successfully changing metric', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '70' } });
    fireEvent.change(screen.getByTestId("config.2.value"), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '2' } });

    await selectEvent.select(screen.getByText("EGI"), 'ARGOTEST')

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
          parameter: mockMetric.parameter
        }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric successfully changed', 'Changed', 2000
    )
  })

  test('Test error in saving metric with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; There has been an error.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const groupField = screen.getByText('EGI');

    fireEvent.change(configVal1, { target: { value: '4' } });
    fireEvent.change(configVal2, { target: { value: '70' } });
    fireEvent.change(configVal3, { target: { value: '4' } });
    fireEvent.change(configVal4, { target: { value: '2' } });

    await selectEvent.select(groupField, 'ARGOTEST')

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
          parameter: mockMetric.parameter
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

  test('Test error in saving metric without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const configVal1 = screen.getByTestId('config.0.value');
    const configVal2 = screen.getByTestId('config.1.value');
    const configVal3 = screen.getByTestId('config.2.value');
    const configVal4 = screen.getByTestId('config.3.value');
    const groupField = screen.getByText('EGI');

    fireEvent.change(configVal1, { target: { value: '4' } });
    fireEvent.change(configVal2, { target: { value: '70' } });
    fireEvent.change(configVal3, { target: { value: '4' } });
    fireEvent.change(configVal4, { target: { value: '2' } });

    await selectEvent.select(groupField, 'ARGOTEST')

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
          parameter: mockMetric.parameter
        }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting metric', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/argo.AMS-Check',
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error in deleting metric with error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/argo.AMS-Check',
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in deleting metric without error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metric/argo.AMS-Check',
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting metric</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test metric changeview for user without permissions', async () => {
    let newActiveSession = mockActiveSession;
    newActiveSession.userdetails.groups.metrics = ['ARGOTEST'];

    Backend.mockImplementationOnce(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metric/argo.AMS-Check':
              return Promise.resolve(mockMetric)

            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(mockProbe)
          }
        },
        isActiveSession: () => Promise.resolve(newActiveSession),
        changeObject: mockChangeObject
      }
    })

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByTestId("config.0.key")).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion');
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.getByText('EGI');
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
    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');
    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');
    const parentField = screen.getByTestId('parent');
    
    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(screen.getByRole('alert').textContent).toBe(
      'This is a read-only instance, please request the corresponding permissions to perform any changes in this form.'
    )
    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toBeDisabled()
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();
    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);
    expect(descriptionField.value).toBe('Description of argo.AMS-Check metric');
    expect(descriptionField).toBeDisabled();
    expect(groupField).toBeEnabled()

    expect(screen.queryByText('ARGOTEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGOTEST')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /metric conf/i }).textContent).toBe('Metric configuration');
    expect(screen.getByRole('heading', { name: /exec/i }).textContent).toBe('probe executable');
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('3');
    expect(configVal1).not.toBeDisabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('60');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('interval');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('5')
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('retryInterval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('3')
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('path');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal5).toBeDisabled()
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrics/argo.AMS-Check/history')
    expect(screen.queryByText(/save/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })
})


describe('Tests for metric history', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/tenantversion/metric/argo.AMS-Check':
              return Promise.resolve(mockMetricVersion)

            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(mockProbe)
          }
        }
      }
    })
  })

  test('Test that version details page renders properly', async () => {
    renderVersionDetailsView();

    await waitFor(() => {
      expect(screen.getByTestId("config.0.key")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /argo/i }).textContent).toBe('argo.AMS-Check (2020-11-30 13:23:48)');

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
    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');
    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');
    const parentField = screen.getByTestId('parent');

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toBeDisabled()
    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField).toBeDisabled();
    expect(screen.queryAllByText(/test_tag/i)).toHaveLength(2);
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeDisabled();
    expect(screen.getByRole('heading', { name: /metric conf/i }).textContent).toBe('Metric configuration');
    expect(screen.getByRole('heading', { name: /exec/i }).textContent).toBe('probe executable');
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('3');
    expect(configVal1).toBeDisabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('60');
    expect(configVal2).toBeDisabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal3).toBeDisabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5')
    expect(configVal4).toBeDisabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3')
    expect(configVal5).toBeDisabled()
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/save/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })

  test('Test for metric compare versions view', async () => {
    renderCompareView();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "name" })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /compare/i }).textContent).toBe('Compare argo.AMS-Check');

    expect(screen.getByRole('heading', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'probe version' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'tags' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'group' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'description' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'probe executable' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'parent' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'config' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'attribute' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'dependency' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'parameter' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'flags' })).toBeInTheDocument();
  })
})