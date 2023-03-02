import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ThresholdsProfilesChange, ThresholdsProfilesList, ThresholdsProfileVersionDetail } from '../ThresholdProfiles';
import { Backend, WebApi } from '../DataManager';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

jest.setTimeout(50000);

const mockChangeObject = jest.fn();
const mockChangeThresholdsProfile = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteThresholdsProfile = jest.fn();
const mockAddObject = jest.fn();
const mockAddThresholdsProfile = jest.fn();
const mockFetchReports = jest.fn()
const mockChangeReport = jest.fn()

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


const mockThresholdsProfiles = [
  {
    name: 'PROFILE1',
    description: 'Description of PROFILE1',
    appid: '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: ''
  },
  {
    name: 'PROFILE2',
    description: 'Description of PROFILE2',
    apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: 'TEST'
  }
]

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
    id: '1',
    groups: {
      aggregations: ['TEST1'],
      metricprofiles: ['TEST2'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
}

const mockWebApiProfile = {
  id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
  date: '2020-12-03',
  name: 'TEST_PROFILE',
  rules: [
    {
      host: 'argo.egi.eu',
      metric: 'org.nagios.ARGOWeb-Status',
      thresholds: 'time=1s;0:0.5;0.5:1;0;10 freshness=1s;0:10;9:;0;25'
    },
    {
      endpoint_group: 'prague_cesnet_lcg2',
      metric: 'org.nagios.BDII-Check',
      thresholds: 'time=1s;0.1:0.2;0.2:0.5;0;10'
    },
    {
      endpoint_group: 'UNI-FREIBURG',
      metric: 'org.nagios.GridFTP-Check',
      thresholds: 'time=1s;0.001:0.2;0.2:0.5;0;10'
    }
  ]
}

const mockBackendProfile = {
  name: 'TEST_PROFILE',
  description: 'Description of TEST_PROFILE',
  apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
  groupname: 'TEST'
}

const mockMetricProfiles = [
  {
    id: 'fiev7Mei-82LG-oN0K-N7YD-quigh6Phohpa',
    date: '2021-02-03',
    name: 'ARGO-MOCK',
    description: 'Mock ARGO metric profile',
    services: [
      {
        service: 'org.opensciencegrid.htcondorce',
        metrics: [
          'ch.cern.HTCondorCE-JobState',
          'ch.cern.HTCondorCE-JobSubmit'
        ]
      },
      {
        service: 'argo.webui',
        metrics: [
          'org.nagios.ARGOWeb-AR',
          'org.nagios.ARGOWeb-Status'
        ]
      }
    ]
  },
  {
    id: 'Bei5laic-cNO0-qC3o-M8Wj-Phaequi4thee',
    date: '2021-11-04',
    name: 'TEST-PROFILE',
    description: '',
    services: [
      {
        service: 'eu.argo.ams',
        metrics: [
          'argo.AMS-Check'
        ]
      },
      {
        service: 'globus-GRIDFTP',
        metrics: [
          'org.nagios.GridFTP-Check'
        ]
      },
      {
        service: 'Site-BDII',
        metrics: [
          'org.bdii.Entries',
          'org.bdii.Freshness',
          'org.nagios.BDII-Check'
        ]
      },
      {
        service: 'Top-BDII',
        metrics: [
          'org.bdii.Entries',
          'org.bdii.Freshness',
          'org.nagios.BDII-Check'
        ]
      }
    ]
  }
]

const mockAllMetrics = [
  'argo.AMS-Check',
  'argo.AMSPublisher-Check',
  'argo.POEM-API-MON',
  'argo.API-Status-Check',
  'ch.cern.HTCondorCE-JobState',
  'ch.cern.HTCondorCE-JobSubmit',
  'org.bdii.Entries',
  'org.bdii.Freshness',
  'org.nagios.ARGOWeb-AR',
  'org.nagios.ARGOWeb-Status',
  'org.nagios.BDII-Check',
  'org.nagios.GridFTP-Check'
]

const mockTopologyEndpoints = [
  {
    date: '2021-11-20',
    group: 'GRIDOPS-MSG',
    type: 'SITES',
    service: 'eu.argo.ams',
    hostname: 'msg.argo.grnet.gr',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI, EOSCCore'
    }
  },
  {
    date: '2021-11-20',
    group: 'EOSC_Messaging',
    type: 'SERVICEGROUPS',
    service: 'eu.argo.ams',
    hostname: 'msg.argo.grnet.gr',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI, EOSCCore'
    }
  },
  {
    date: '2021-11-20',
    group: 'UNI-FREIBURG',
    type: 'SITES',
    service: 'globus-GRIDFTP',
    hostname: 'sedoor1.bfg.uni-freiburg.de',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI, wlcg, tier2, atlas'
    }
  },
  {
    date: '2021-11-20',
    group: 'UNI-FREIBURG',
    type: 'SITES',
    service: 'globus-GRIDFTP',
    hostname: 'sedoor2.bfg.uni-freiburg.de',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI, wlcg, tier2, atlas'
    }
  },
  {
    date: '2021-11-20',
    group: 'EOSC_Core_Monitoring',
    type: 'SERVICEGROUPS',
    service: 'argo.webui',
    hostname: 'eosccore.ui.argo.grnet.gr',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EOSCCore'
    }
  },
  {
    date: '2021-11-20',
    group: 'EOSC_Exchange_Monitoring',
    type: 'SERVICEGROUPS',
    service: 'argo.webui',
    hostname: 'argo.eosc-portal.eu',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EOSCCore'
    }
  },
  {
    date: '2021-11-20',
    group: 'GRIDOPS-SAM',
    type: 'SITES',
    service: 'argo.webui',
    hostname: 'argo.egi.eu',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'GRIDOPS-SAM',
    type: 'SITES',
    service: 'argo.webui',
    hostname: 'argo.eosc-portal.eu',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'GRIDOPS-SAM',
    type: 'SITES',
    service: 'argo.webui',
    hostname: 'eosccore.ui.argo.grnet.gr',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'prague_cesnet_lcg2',
    type: 'SITES',
    service: 'org.opensciencegrid.htcondorce',
    hostname: 'ce1.grid.cesnet.cz',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'prague_cesnet_lcg2',
    type: 'SITES',
    service: 'globus-GRIDFTP',
    hostnamne: 'se1.grid.cesnet.cz',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'prague_cesnet_lcg2',
    type: 'SITES',
    service: 'Site-BDII',
    hostname: 'sbdii.grid.cesnet.cz',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'prague_cesnet_lcg2',
    type: 'SITES',
    service: 'Top-BDII',
    hostname: 'bdii.grid.cesnet.cz',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  },
  {
    date: '2021-11-20',
    group: 'BUDAPEST',
    type: 'SITES',
    service: 'org.opensciencegrid.htcondorce',
    hostname: 'grid108.kfki.hu',
    tags: {
      monitored: '1',
      production: '1',
      scope: 'EGI'
    }
  }
]

const mockThresholdProfileVersions = [
  {
    id: '14',
    object_repr: 'TEST_PROFILE2',
    fields: {
      name: 'TEST_PROFILE2',
      description: '',
      groupname: 'NEW_GROUP',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      rules: [
        {
          host: 'hostFoo',
          metric: 'newMetric',
          endpoint_group: 'test',
          thresholds: 'entries=1;3:;0:2'
        }
      ]
    },
    user: 'testuser',
    date_created: '2021-03-26 10:21:48',
    comment: 'Changed name and groupname. Added rule for metric "newMetric". Deleted rule for metric "metricA".',
    version: '20210326-102148'
  },
  {
    id: '10',
    object_repr: 'TEST_PROFILE',
    fields: {
      name: 'TEST_PROFILE',
      description: '',
      groupname: 'GROUP',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      rules: [
        {
          host: 'hostFoo',
          metric: 'metricA',
          thresholds: 'freshness=1s;10:;9:;0;25 entries=1;3:;0:2'
        }
      ]
    },
    user: 'testuser',
    date_created: '2020-12-24 03:58:47',
    comment: 'Initial version.',
    version: '20201224-035847'
  }
];

const mockReports = [
  {
    id: "aaaa1111-1111-2222-3333-4444-000000000000",
    tenant: "TENANT",
    disabled: false,
    info: {
      name: "CORE",
      description: "Some report",
      created: "2022-05-25 17:59:54",
      updated: "2022-12-28 10:46:30"
    },
    computations: {
      ar: true,
      status: true,
      trends: [
        "flapping",
        "status",
        "tags"
      ]
    },
    thresholds: {
      availability: 80,
      reliability: 90,
      uptime: 0.8,
      unknown: 0.1,
      downtime: 0.1
    },
    topology_schema: {
      group: {
        type: "PROJECT",
        group: {
          type: "SERVICEGROUPS"
        }
      }
    },
    profiles: [
      {
        id: "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv",
        name: "ARGO_MON",
        type: "metric"
      },
      {
        id: "00000000-1111-1111-1111-222222222222",
        name: "aggr1",
        type: "aggregation"
      },
      {
        id: "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
        name: "TEST_PROFILE",
        type: "thresholds"
      },
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "ops",
        type: "operations"
      }
    ],
    filter_tags: []
  },
  {
    id: "aaaa1111-1111-2222-3333-4444-999999999999",
    tenant: "TENANT",
    disabled: false,
    info: {
      name: "ANOTHER",
      description: "Some report",
      created: "2022-05-25 17:59:54",
      updated: "2022-12-28 10:46:30"
    },
    computations: {
      ar: true,
      status: true,
      trends: [
        "flapping",
        "status",
        "tags"
      ]
    },
    thresholds: {
      availability: 80,
      reliability: 90,
      uptime: 0.8,
      unknown: 0.1,
      downtime: 0.1
    },
    topology_schema: {
      group: {
        type: "PROJECT",
        group: {
          type: "SERVICEGROUPS"
        }
      }
    },
    profiles: [
      {
        id: "uiwee7um-cq51-pez2-6g85-aeghei1yeeph",
        name: "ARGO_MON2",
        type: "metric"
      },
      {
        id: "99999999-1111-1111-1111-222222222222",
        name: "aggr2",
        type: "aggregation"
      },
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "ops",
        type: "operations"
      }
    ],
    filter_tags: []
  },
  {
    id: "aaaabbbb-1111-2222-3333-4444-000000000000",
    tenant: "TENANT",
    disabled: false,
    info: {
      name: "TEST",
      description: "Some report",
      created: "2022-05-25 17:59:54",
      updated: "2022-12-28 10:46:30"
    },
    computations: {
      ar: true,
      status: true,
      trends: [
        "flapping",
        "status",
        "tags"
      ]
    },
    thresholds: {
      availability: 80,
      reliability: 90,
      uptime: 0.8,
      unknown: 0.1,
      downtime: 0.1
    },
    topology_schema: {
      group: {
        type: "PROJECT",
        group: {
          type: "SERVICEGROUPS"
        }
      }
    },
    profiles: [
      {
        id: "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv",
        name: "ARGO_MON",
        type: "metric"
      },
      {
        id: "00000000-1111-1111-1111-222222222222",
        name: "aggr1",
        type: "aggregation"
      },
      {
        id: "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
        name: "TEST_PROFILE",
        type: "thresholds"
      },
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "ops",
        type: "operations"
      }
    ],
    filter_tags: []
  }
]


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}thresholdsprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] })

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              render={ props => <ThresholdsProfilesList
                {...props}
                webapithresholds='https://mock.thresholds.com'
                webapitoken='token'
                publicView={true}
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              render={ props => <ThresholdsProfilesList
                {...props}
                webapithresholds='https://mock.thresholds.com'
                webapitoken='token'
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}thresholdsprofiles/TEST_PROFILE`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_thresholdsprofiles/:name'
              render={ props => <ThresholdsProfilesChange
                {...props}
                webapithresholds='https://mock.thresholds.com'
                webapitoken='token'
                tenantname='TENANT'
                publicView={true}
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/thresholdsprofiles/:name'
              render={ props => <ThresholdsProfilesChange
                {...props}
                webapithresholds='https://mock.thresholds.com'
                webapitoken='token'
                tenantname='TENANT'
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = '/ui/thresholdsprofiles/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/thresholdsprofiles/add'
            render={ props => <ThresholdsProfilesChange
              {...props}
              webapithresholds='https://mock.thresholds.com'
              webapitoken='token'
              tenantname='TENANT'
              addview={true}
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView() {
  const route = '/ui/thresholdsprofiles/TEST_PROFILE/history/20201224-035847';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/thresholdsprofiles/:name/history/:version'
            render={ props =>  <ThresholdsProfileVersionDetail {...props} />}
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe('Tests for thresholds profiles listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/thresholdsprofiles':
              return Promise.resolve(mockThresholdsProfiles)

            case '/api/v2/internal/public_thresholdsprofiles':
              return Promise.resolve(mockThresholdsProfiles)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select thresholds profile to change')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /profile1/i }).textContent).toBe('1PROFILE1Description of PROFILE1');
    expect(screen.getByRole('link', { name: /profile1/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/PROFILE1');
    expect(screen.getByRole('row', { name: /profile2/i }).textContent).toBe('2PROFILE2Description of PROFILE2TEST');
    expect(screen.getByRole('link', { name: /profile2/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/PROFILE2');

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select thresholds profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /profile1/i }).textContent).toBe('1PROFILE1Description of PROFILE1');
    expect(screen.getByRole('link', { name: /profile1/i }).closest('a')).toHaveAttribute('href', '/ui/public_thresholdsprofiles/PROFILE1');
    expect(screen.getByRole('row', { name: /profile2/i }).textContent).toBe('2PROFILE2Description of PROFILE2TEST');
    expect(screen.getByRole('link', { name: /profile2/i }).closest('a')).toHaveAttribute('href', '/ui/public_thresholdsprofiles/PROFILE2');

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Tests for threshols profile changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(NotificationManager, "info")
  jest.spyOn(NotificationManager, "warning")
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    mockFetchReports.mockReturnValue([mockReports[1]])
    WebApi.mockImplementation(() => {
      return {
        fetchThresholdsProfile: () => Promise.resolve(mockWebApiProfile),
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles),
        fetchReportsTopologyEndpoints: () => Promise.resolve(mockTopologyEndpoints),
        fetchReports: mockFetchReports,
        changeThresholdsProfile: mockChangeThresholdsProfile,
        deleteThresholdsProfile: mockDeleteThresholdsProfile,
        changeReport: mockChangeReport
      }
    })
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockBackendProfile),
        fetchListOfNames: () => Promise.resolve(mockAllMetrics),
        isActiveSession: (path) => {
          switch (path) {
            case true:
              return Promise.resolve(mockActiveSession)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByText('TEST');

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TESTa')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TESTa')).toBeInTheDocument()

    const rule1 = within(screen.getByTestId('rules.0'))
    expect(screen.getByTestId('rules.0.remove')).toBeInTheDocument();
    const rule2 = within(screen.getByTestId('rules.1'));
    expect(screen.getByTestId('rules.1.remove')).toBeInTheDocument();
    const rule3 = within(screen.getByTestId('rules.2'))
    expect(screen.getByTestId('rules.2.remove')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.3.remove')).not.toBeInTheDocument();

    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status');
    const host1 = rule1.getByText('argo.egi.eu')
    const endpoint1 = rule1.getAllByText(/select/i)[0]
    const table1 = within(screen.getByTestId('rules.0.thresholds'));
    const metric2 = rule2.getByText('org.nagios.BDII-Check');
    const host2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getByText('prague_cesnet_lcg2')
    const table2 = within(screen.getByTestId('rules.1.thresholds'));
    const metric3 = rule3.getByText('org.nagios.GridFTP-Check')
    const host3 = rule3.getAllByText(/select/i)[0]
    const endpoint3 = rule3.getByText('UNI-FREIBURG')
    const table3 = within(screen.getByTestId('rules.2.thresholds'))

    expect(metric1).toBeEnabled();
    expect(host1).toBeEnabled();
    expect(endpoint1).toBeEnabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(3);
    expect(table1.getAllByRole('columnheader')).toHaveLength(8);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.0.label').value).toBe('time');
    expect(screen.getByTestId('values.rules.0.thresholds.0.value').value).toBe('1');
    expect(screen.getByTestId('values.rules.0.thresholds.0.uom').value).toBe('s');
    expect(screen.getByTestId('values.rules.0.thresholds.0.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.0.warn2').value).toBe('0.5');
    expect(screen.getByTestId('values.rules.0.thresholds.0.crit1').value).toBe('0.5');
    expect(screen.getByTestId('values.rules.0.thresholds.0.crit2').value).toBe('1');
    expect(screen.getByTestId('values.rules.0.thresholds.0.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.0.max').value).toBe('10');
    expect(screen.getByTestId('values.rules.0.thresholds.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.0.add')).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.1.label').value).toBe('freshness');
    expect(screen.getByTestId('values.rules.0.thresholds.1.value').value).toBe('1');
    expect(screen.getByTestId('values.rules.0.thresholds.1.uom').value).toBe('s');
    expect(screen.getByTestId('values.rules.0.thresholds.1.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.1.warn2').value).toBe('10');
    expect(screen.getByTestId('values.rules.0.thresholds.1.crit1').value).toBe('9');
    expect(screen.getByTestId('values.rules.0.thresholds.1.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.1.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.1.max').value).toBe('25');
    expect(screen.getByTestId('values.rules.0.thresholds.1.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.1.add')).toBeInTheDocument();

    expect(metric2).toBeEnabled();
    expect(host2).toBeEnabled();
    expect(endpoint2).toBeEnabled();

    const table2Rows = table2.getAllByRole('row');
    expect(table2Rows).toHaveLength(2);
    expect(table2.getAllByRole('columnheader')).toHaveLength(8);
    expect(table2.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.1.thresholds.0.label').value).toBe('time');
    expect(screen.getByTestId('values.rules.1.thresholds.0.value').value).toBe('1');
    expect(screen.getByTestId('values.rules.1.thresholds.0.uom').value).toBe('s');
    expect(screen.getByTestId('values.rules.1.thresholds.0.warn1').value).toBe('0.1');
    expect(screen.getByTestId('values.rules.1.thresholds.0.warn2').value).toBe('0.2');
    expect(screen.getByTestId('values.rules.1.thresholds.0.crit1').value).toBe('0.2');
    expect(screen.getByTestId('values.rules.1.thresholds.0.crit2').value).toBe('0.5');
    expect(screen.getByTestId('values.rules.1.thresholds.0.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.1.thresholds.0.max').value).toBe('10');
    expect(screen.getByTestId('values.rules.1.thresholds.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.1.thresholds.0.add')).toBeInTheDocument();

    expect(metric3).toBeEnabled();
    expect(host3).toBeEnabled();
    expect(endpoint3).toBeEnabled();

    const table3Rows = table3.getAllByRole('row');
    expect(table3Rows).toHaveLength(2);
    expect(table3.getAllByRole('columnheader')).toHaveLength(8);
    expect(table3.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.2.thresholds.0.label').value).toBe('time');
    expect(screen.getByTestId('values.rules.2.thresholds.0.value').value).toBe('1');
    expect(screen.getByTestId('values.rules.2.thresholds.0.uom').value).toBe('s');
    expect(screen.getByTestId('values.rules.2.thresholds.0.warn1').value).toBe('0.001');
    expect(screen.getByTestId('values.rules.2.thresholds.0.warn2').value).toBe('0.2');
    expect(screen.getByTestId('values.rules.2.thresholds.0.crit1').value).toBe('0.2');
    expect(screen.getByTestId('values.rules.2.thresholds.0.crit2').value).toBe('0.5');
    expect(screen.getByTestId('values.rules.2.thresholds.0.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.2.thresholds.0.max').value).toBe('10');
    expect(screen.getByTestId('values.rules.2.thresholds.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.2.thresholds.0.add')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Add new rule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/TEST_PROFILE/history')
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Thresholds profile details');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(screen.getByTestId('rules.0')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.getByTestId('rules.1')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.1.remove')).not.toBeInTheDocument();
    expect(screen.getByTestId('rules.2')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.2.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.3.remove')).not.toBeInTheDocument();

    const metric1 = screen.getByTestId('rules.0.metric');
    const host1 = screen.getByTestId('rules.0.host');
    const endpoint1 = screen.getByTestId('rules.0.endpoint_group');
    const table1 = within(screen.getByTestId('rules.0.thresholds'));
    const metric2 = screen.getByTestId('rules.1.metric');
    const host2 = screen.getByTestId('rules.1.host');
    const endpoint2 = screen.getByTestId('rules.1.endpoint_group');
    const table2 = within(screen.getByTestId('rules.1.thresholds'));
    const metric3 = screen.getByTestId('rules.2.metric')
    const host3 = screen.getByTestId('rules.2.host')
    const endpoint3 = screen.getByTestId('rules.2.endpoint_group')
    const table3 = within(screen.getByTestId('rules.2.thresholds'))

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('TEST');
    expect(groupField).toBeDisabled();

    expect(metric1.value).toBe('org.nagios.ARGOWeb-Status');
    expect(metric1).toBeDisabled();
    expect(host1.value).toBe('argo.egi.eu');
    expect(host1).toBeDisabled();
    expect(endpoint1.value).toBe('');
    expect(endpoint1).toBeDisabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(3);
    expect(table1.getAllByRole('columnheader')).toHaveLength(7);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1Rows[1].textContent).toBe('1time1s0:0.50.5:1010')
    expect(table1Rows[2].textContent).toBe('2freshness1s0:109:025')

    expect(metric2.value).toBe('org.nagios.BDII-Check');
    expect(metric2).toBeDisabled();
    expect(host2.value).toBe('');
    expect(host2).toBeDisabled();
    expect(endpoint2.value).toBe('prague_cesnet_lcg2');
    expect(endpoint2).toBeDisabled();

    const table2Rows = table2.getAllByRole('row');
    expect(table2Rows).toHaveLength(2);
    expect(table2.getAllByRole('columnheader')).toHaveLength(7);
    expect(table2.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table2Rows[1].textContent).toBe('1time1s0.1:0.20.2:0.5010')

    expect(metric3.value).toBe('org.nagios.GridFTP-Check');
    expect(metric3).toBeDisabled();
    expect(host3.value).toBe('');
    expect(host3).toBeDisabled();
    expect(endpoint3.value).toBe('UNI-FREIBURG');
    expect(endpoint3).toBeDisabled();

    const table3Rows = table3.getAllByRole('row');
    expect(table3Rows).toHaveLength(2);
    expect(table3.getAllByRole('columnheader')).toHaveLength(7);
    expect(table3.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table3.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table3Rows[1].textContent).toBe('1time1s0.001:0.20.2:0.5010')

    expect(screen.queryByRole('button', { name: 'Add new rule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test change thresholds profile and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    const host1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(host1)

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    const endpoint1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(endpoint1)
    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]
    const endpoint2 = newRule.getAllByText(/select/i)[2]

    expect(newRule.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();
    selectEvent.openMenu(metric2)
    expect(newRule.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(newRule.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'org.bdii.Entries')

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host2)

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.getByText('sbdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.getByText('bdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)
    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.getByText('prague_cesnet_lcg2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('thresholdsprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_thresholdsprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully changed', 'Changed', 2000
    )
  })

  test('Test change thresholds profile with empty threshold value and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    const host1 = rule1.getAllByText(/select/i)[0]
    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    const endpoint1 = rule1.getAllByText(/select/i)[0]
    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]

    await selectEvent.select(metric2, 'org.bdii.Entries')
    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=0;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
            {
              endpoint_group: 'GRIDOPS-MSG',
              host: 'msg.argo.grnet.gr',
              metric: 'argo.AMS-Check',
              thresholds: 'time=1s;1:15;10:20;0;10'
            },
            {
              metric: 'org.bdii.Entries',
              host: 'bdii.grid.cesnet.cz',
              thresholds: 'entries=0;0:;2:'
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('thresholdsprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_thresholdsprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing thresholds profile on web api with error message', async () => {
    mockChangeThresholdsProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    const host1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(host1)

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    const endpoint1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(endpoint1)
    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]
    const endpoint2 = newRule.getAllByText(/select/i)[2]

    expect(newRule.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();
    selectEvent.openMenu(metric2)
    expect(newRule.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(newRule.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'org.bdii.Entries')

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host2)

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.getByText('sbdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.getByText('bdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)
    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.getByText('prague_cesnet_lcg2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>406 Content Not acceptable: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing thresholds profile on web api without error message', async () => {
    mockChangeThresholdsProfile.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    const host1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(host1)

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    const endpoint1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(endpoint1)
    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]
    const endpoint2 = newRule.getAllByText(/select/i)[2]

    expect(newRule.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();
    selectEvent.openMenu(metric2)
    expect(newRule.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(newRule.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'org.bdii.Entries')

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host2)

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.getByText('sbdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.getByText('bdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)
    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.getByText('prague_cesnet_lcg2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing thresholds profile on internal backend with error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    const host1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(host1)

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    const endpoint1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(endpoint1)
    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]
    const endpoint2 = newRule.getAllByText(/select/i)[2]

    expect(newRule.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();
    selectEvent.openMenu(metric2)
    expect(newRule.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(newRule.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'org.bdii.Entries')

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host2)

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.getByText('sbdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.getByText('bdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)
    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.getByText('prague_cesnet_lcg2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
          ]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing thresholds profile on internal backend without error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    await selectEvent.select(screen.getByText('TEST'), 'TESTa')

    const rule1 = within(screen.getByTestId('rules.0'))
    const metric1 = rule1.getByText('org.nagios.ARGOWeb-Status')

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    const host1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(host1)

    expect(rule1.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    const endpoint1 = rule1.getAllByText(/select/i)[0]

    selectEvent.openMenu(endpoint1)
    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'GRIDOPS-MSG')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.2.remove'))
    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));

    const newRule = within(screen.getByTestId('rules.1'))
    const metric2 = newRule.getAllByText(/select/i)[0]
    const host2 = newRule.getAllByText(/select/i)[1]
    const endpoint2 = newRule.getAllByText(/select/i)[2]

    expect(newRule.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(newRule.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(newRule.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();
    selectEvent.openMenu(metric2)
    expect(newRule.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(newRule.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(newRule.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(newRule.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(newRule.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(newRule.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'org.bdii.Entries')

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host2)

    expect(newRule.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(newRule.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('argo.egi.eu')).not.toBeInTheDocument();
    expect(newRule.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(newRule.getByText('sbdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.getByText('bdii.grid.cesnet.cz')).toBeInTheDocument();
    expect(newRule.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host2, 'bdii.grid.cesnet.cz')

    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)
    expect(newRule.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(newRule.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(newRule.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(newRule.getByText('prague_cesnet_lcg2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
          {
            endpoint_group: 'GRIDOPS-MSG',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'time=1s;1:15;10:20;0;10'
          },
          {
            metric: 'org.bdii.Entries',
            host: 'bdii.grid.cesnet.cz',
            thresholds: 'entries=2B;0:;2:'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting thresholds profile', async () => {
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    await waitFor(() => {
      expect(mockChangeReport).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('thresholdsprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_thresholdsprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully deleted', 'Deleted', 2000
    )
    expect(NotificationManager.info).not.toHaveBeenCalled()
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test error deleting thresholds profile on web api with error message', async () => {
    mockDeleteThresholdsProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockChangeReport).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>406 Content Not acceptable: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
    expect(NotificationManager.info).not.toHaveBeenCalled()
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test error deleting thresholds profile on web api without error message', async () => {
    mockDeleteThresholdsProfile.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockChangeReport).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
    expect(NotificationManager.info).not.toHaveBeenCalled()
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test error deleting thresholds profile on internal api with error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    await waitFor(() => {
      expect(mockChangeReport).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
    expect(NotificationManager.info).not.toHaveBeenCalled()
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test error deleting thresholds profile on internal api without error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    await waitFor(() => {
      expect(mockChangeReport).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
    expect(NotificationManager.info).not.toHaveBeenCalled()
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test("Test delete thresholds profile when associated with report", async () => {
    mockFetchReports.mockReturnValueOnce(mockReports)
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Thresholds profile is associated with reports: CORE, TEST</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for thresholds profiles addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles),
        fetchReportsTopologyEndpoints: () => Promise.resolve(mockTopologyEndpoints),
        addThresholdsProfile: mockAddThresholdsProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        fetchListOfNames: () => Promise.resolve(mockAllMetrics),
        isActiveSession: (path) => {
          switch (path) {
            case true:
              return Promise.resolve(mockActiveSession)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByText(/select/i);

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    expect(screen.queryByText('TESTa')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()
    expect(screen.getByText('TESTa')).toBeInTheDocument()

    expect(screen.queryByTestId('rules.0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('table')).toHaveLength(0);

    expect(screen.getByRole('button', { name: 'Add a rule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test('Test successfully adding thresholds profile', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Thresholds profile Created',
          code: "200"
        },
        data: {
          id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    expect(rule1.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric1)

    expect(rule1.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule1.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host1)

    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint1)

    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    expect(rule2.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric2)

    expect(rule2.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule2.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule2.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.getByText('prague_cesnet_lcg2')).toBeInTheDocument();
    expect(rule2.getByText('BUDAPEST')).toBeInTheDocument();

    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('thresholdsprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_thresholdsprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully added', 'Added', 2000
    )
  })

  test('Test successfully adding thresholds profile with threshold without value', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Thresholds profile Created',
          code: "200"
        },
        data: {
          id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    await selectEvent.select(metric1, 'argo.AMS-Check')
    await selectEvent.select(host1, 'msg.argo.grnet.gr')
    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')
    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20 entries=0;0:;2:'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20 entries=0;0:;2:'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('thresholdsprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_thresholdsprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully added', 'Added', 2000
    )
  })

  test('Test error adding thresholds profile in web api with error message', async () => {
    mockAddThresholdsProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    expect(rule1.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric1)

    expect(rule1.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule1.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host1)

    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint1)

    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    expect(rule2.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric2)

    expect(rule2.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule2.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule2.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.getByText('prague_cesnet_lcg2')).toBeInTheDocument();
    expect(rule2.getByText('BUDAPEST')).toBeInTheDocument();

    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>406 Content Not acceptable: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding thresholds profile in web api without error message', async () => {
    mockAddThresholdsProfile.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    expect(rule1.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric1)

    expect(rule1.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule1.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host1)

    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint1)

    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    expect(rule2.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric2)

    expect(rule2.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule2.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule2.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.getByText('prague_cesnet_lcg2')).toBeInTheDocument();
    expect(rule2.getByText('BUDAPEST')).toBeInTheDocument();

    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding thresholds profile in internal api with error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Thresholds profile Created',
          code: "200"
        },
        data: {
          id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    expect(rule1.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric1)

    expect(rule1.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule1.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host1)

    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint1)

    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    expect(rule2.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric2)

    expect(rule2.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule2.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule2.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.getByText('prague_cesnet_lcg2')).toBeInTheDocument();
    expect(rule2.getByText('BUDAPEST')).toBeInTheDocument();

    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding thresholds profile in internal api without error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Thresholds profile Created',
          code: "200"
        },
        data: {
          id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });

    await selectEvent.select(screen.getByText(/select/i), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    const rule1 = within(screen.getByTestId('rules.0'))

    const metric1 = rule1.getAllByText(/select/i)[0]
    const host1 = rule1.getAllByText(/select/i)[1]
    const endpoint1 = rule1.getAllByText(/select/i)[2]

    expect(rule1.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule1.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule1.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric1)

    expect(rule1.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule1.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule1.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule1.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule1.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule1.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric1, 'argo.AMS-Check')

    expect(rule1.queryByText('msg.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    selectEvent.openMenu(host1)

    expect(rule1.getByText('msg.argo.grnet.gr')).toBeInTheDocument();
    expect(rule1.queryByText('sedoor1.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('sedoor2.bfg.uni-freiburg.de')).not.toBeInTheDocument();
    expect(rule1.queryByText('eosccore.ui.argo.grnet.gr')).not.toBeInTheDocument();
    expect(rule1.queryByText('argo.eosc-portal.eu')).not.toBeInTheDocument();
    expect(rule1.queryByText('ce1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('se1.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('sbdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('bdii.grid.cesnet.cz')).not.toBeInTheDocument();
    expect(rule1.queryByText('grid108.kfki.hu')).not.toBeInTheDocument();

    await selectEvent.select(host1, 'msg.argo.grnet.gr')

    expect(rule1.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint1)

    expect(rule1.getByText('GRIDOPS-MSG')).toBeInTheDocument();
    expect(rule1.getByText('EOSC_Messaging')).toBeInTheDocument();
    expect(rule1.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule1.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule1.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule1.queryByText('BUDAPEST')).not.toBeInTheDocument();

    await selectEvent.select(endpoint1, 'EOSC_Messaging')

    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    const rule2 = within(screen.getByTestId('rules.1'))

    const metric2 = rule2.getAllByText(/select/i)[0]
    const endpoint2 = rule2.getAllByText(/select/i)[2]

    expect(rule2.queryByText('argo.AMS-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.AMSPublisher-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.POEM-API-MON')).not.toBeInTheDocument();
    expect(rule2.queryByText('argo.API-Status-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobState')).not.toBeInTheDocument();
    expect(rule2.queryByText('ch.cern.HTCondorCE-JobSubmit')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Entries')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.bdii.Freshness')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-AR')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.ARGOWeb-Status')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.BDII-Check')).not.toBeInTheDocument();
    expect(rule2.queryByText('org.nagios.GridFTP-Check')).not.toBeInTheDocument();

    selectEvent.openMenu(metric2)

    expect(rule2.getByText('argo.AMS-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.AMSPublisher-Check')).toBeInTheDocument();
    expect(rule2.getByText('argo.POEM-API-MON')).toBeInTheDocument();
    expect(rule2.getByText('argo.API-Status-Check')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobState')).toBeInTheDocument();
    expect(rule2.getByText('ch.cern.HTCondorCE-JobSubmit')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Entries')).toBeInTheDocument();
    expect(rule2.getByText('org.bdii.Freshness')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-AR')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.ARGOWeb-Status')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.BDII-Check')).toBeInTheDocument();
    expect(rule2.getByText('org.nagios.GridFTP-Check')).toBeInTheDocument();

    await selectEvent.select(metric2, 'ch.cern.HTCondorCE-JobState')

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.queryByText('prague_cesnet_lcg2')).not.toBeInTheDocument();
    expect(rule2.queryByText('BUDAPEST')).not.toBeInTheDocument();

    selectEvent.openMenu(endpoint2)

    expect(rule2.queryByText('GRIDOPS-MSG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Messaging')).not.toBeInTheDocument();
    expect(rule2.queryByText('UNI-FREIBURG')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Core_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('EOSC_Exchange_Monitoring')).not.toBeInTheDocument();
    expect(rule2.queryByText('GRIDOPS-SAM')).not.toBeInTheDocument();
    expect(rule2.getByText('prague_cesnet_lcg2')).toBeInTheDocument();
    expect(rule2.getByText('BUDAPEST')).toBeInTheDocument();

    await selectEvent.select(endpoint2, 'BUDAPEST')

    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
          {
            endpoint_group: 'EOSC_Messaging',
            host: 'msg.argo.grnet.gr',
            metric: 'argo.AMS-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'BUDAPEST',
            metric: 'ch.cern.HTCondorCE-JobState',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for thresholds profile version detail page', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockThresholdProfileVersions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderVersionDetailsView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('TEST_PROFILE (2020-12-24 03:58:47)');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(screen.getByTestId('rules.0')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.1.remove')).not.toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(1);

    const metric1 = screen.getByTestId('rules.0.metric');
    const host1 = screen.getByTestId('rules.0.host');
    const endpoint1 = screen.getByTestId('rules.0.endpoint_group');
    const table1 = within(screen.getByTestId('rules.0.thresholds'));

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('GROUP');
    expect(groupField).toBeDisabled();

    expect(metric1.value).toBe('metricA');
    expect(metric1).toBeDisabled();
    expect(host1.value).toBe('hostFoo');
    expect(host1).toBeDisabled();
    expect(endpoint1.value).toBe('');
    expect(endpoint1).toBeDisabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(3);
    expect(table1.getAllByRole('columnheader')).toHaveLength(7);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1Rows[1].textContent).toBe('1freshness1s10:9:025')
    expect(table1Rows[2].textContent).toBe('2entries13:0:2')

    expect(screen.queryByRole('button', { name: 'Add new rule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })
})