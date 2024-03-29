import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Backend, WebApi } from '../DataManager';
import {
  AggregationProfilesChange,
  AggregationProfilesList,
  AggregationProfileVersionDetails
} from '../AggregationProfiles';
import { QueryClientProvider, QueryClient, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';
import useEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

jest.setTimeout(20000);

const mockChangeObject = jest.fn();
const mockChangeAggregation = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteAggregation = jest.fn();
const mockAddAggregation = jest.fn();
const mockAddObject = jest.fn();
const mockFetchReports = jest.fn()

const queryClient = new QueryClient();

setLogger({
  log: () => { },
  warn: () => { },
  error: () => { }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear()
})


const mockAggregationProfiles = [
  {
    name: 'ANOTHER-PROFILE',
    description: '',
    apiid: '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: ''
  },
  {
    name: 'TEST_PROFILE',
    description: 'Description of TEST_PROFILE.',
    apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: 'EGI'
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
    id: '1',
    groups: {
      aggregations: [ 'ARGO', 'EGI' ],
      metricprofiles: [ 'TEST2' ],
      metrics: [ 'TEST3', 'TEST4' ],
      thresholdsprofiles: [ 'TEST', 'TESTa' ]
    }
  }
}

const mockWebApiProfile = {
  id: "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
  date: "2021-02-03",
  name: "TEST_PROFILE",
  namespace: "",
  endpoint_group: "servicegroups",
  metric_operation: "AND",
  profile_operation: "AND",
  metric_profile: {
    name: "ARGO_MON_CRITICAL",
    id: "12341234-oooo-kkkk-aaaa-aaeekkccnnee"
  },
  groups: [
    {
      name: "compute",
      operation: "OR",
      services: [
        {
          name: "ARC-CE",
          operation: "OR"
        },
        {
          name: "GRAM5",
          operation: "OR"
        },
        {
          name: "QCG.Computing",
          operation: "OR"
        },
        {
          name: "org.opensciencegrid.htcondorce",
          operation: "OR"
        }
      ]
    },
    {
      name: "storage",
      operation: "OR",
      services: [
        {
          name: "SRM",
          operation: "OR"
        }
      ]
    },
    {
      name: "information",
      operation: "OR",
      services: [
        {
          name: "Site-BDII",
          operation: "OR"
        }
      ]
    },
    {
      name: "cloud",
      operation: "OR",
      services: [
        {
          name: "org.openstack.nova",
          operation: "OR"
        }
      ]
    }
  ]
};

const mockWebApiMetricProfiles = [
  {
    id: "56785678-oooo-kkkk-aaaa-aaeekkccnnee",
    date: "2021-02-03",
    name: "FEDCLOUD",
    description: "Profile for Fedcloud CentOS 7 instance",
    services: [
      {
        service: "org.opensciencegrid.htcondorce",
        metrics: [
          "ch.cern.HTCondorCE-JobState",
          "ch.cern.HTCondorCE-JobSubmit"
        ]
      }
    ]
  },
  {
    id: "12341234-oooo-kkkk-aaaa-aaeekkccnnee",
    date: "2021-03-01",
    name: "ARGO_MON_CRITICAL",
    description: "Central ARGO-MON_CRITICAL profile",
    services: [
      {
        service: "ARC-CE",
        metrics: [
          "org.nordugrid.ARC-CE-ARIS",
          "org.nordugrid.ARC-CE-IGTF",
          "org.nordugrid.ARC-CE-result",
          "org.nordugrid.ARC-CE-srm"
        ]
      },
      {
        service: "GRAM5",
        metrics: [
          "eu.egi.GRAM-CertValidity",
          "hr.srce.GRAM-Auth",
          "hr.srce.GRAM-Command"
        ]
      },
      {
        service: "org.opensciencegrid.htcondorce",
        metrics: [
          "ch.cern.HTCondorCE-JobState",
          "ch.cern.HTCondorCE-JobSubmit"
        ]
      },
      {
        service: "org.openstack.nova",
        metrics: [
          "eu.egi.cloud.OpenStack-VM",
          "org.nagios.Keystone-TCP"
        ]
      },
      {
        service: "QCG.Computing",
        metrics: [
          "eu.egi.QCG-Computing-CertValidity",
          "pl.plgrid.QCG-Computing"
        ]
      },
      {
        service: "Site-BDII",
        metrics: [
          "org.bdii.Entries",
          "org.bdii.Freshness",
          "org.nagios.BDII-Check"
        ]
      },
      {
        service: "SRM",
        metrics: [
          "eu.egi.SRM-CertValidity",
          "eu.egi.SRM-GetSURLs",
          "eu.egi.SRM-VODel",
          "eu.egi.SRM-VOGet",
          "eu.egi.SRM-VOGetTurl",
          "eu.egi.SRM-VOLs",
          "eu.egi.SRM-VOLsDir",
          "eu.egi.SRM-VOPut"
        ]
      },
    ]
  },
  {
    id: "Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze",
    date: "2022-02-07",
    name: "ARGO_MON_TEST",
    description: "Profile for testing",
    services: [
      {
        service: "ARC-CE",
        metrics: [
          "org.nordugrid.ARC-CE-ARIS",
          "org.nordugrid.ARC-CE-IGTF",
          "org.nordugrid.ARC-CE-result",
          "org.nordugrid.ARC-CE-srm"
        ]
      },
      {
        service: "GRAM5",
        metrics: [
          "eu.egi.GRAM-CertValidity",
          "hr.srce.GRAM-Auth",
          "hr.srce.GRAM-Command"
        ]
      },
      {
        service: "org.opensciencegrid.htcondorce",
        metrics: [
          "ch.cern.HTCondorCE-JobState",
          "ch.cern.HTCondorCE-JobSubmit"
        ]
      },
      {
        service: "org.openstack.nova",
        metrics: [
          "eu.egi.cloud.OpenStack-VM",
          "org.nagios.Keystone-TCP"
        ]
      },
      {
        service: "QCG.Computing",
        metrics: [
          "eu.egi.QCG-Computing-CertValidity",
          "pl.plgrid.QCG-Computing"
        ]
      },
      {
        service: "Site-BDII",
        metrics: [
          "org.bdii.Entries",
          "org.bdii.Freshness",
          "org.nagios.BDII-Check"
        ]
      },
      {
        service: "SRM",
        metrics: [
          "eu.egi.SRM-CertValidity",
          "eu.egi.SRM-GetSURLs",
          "eu.egi.SRM-VODel",
          "eu.egi.SRM-VOGet",
          "eu.egi.SRM-VOGetTurl",
          "eu.egi.SRM-VOLs",
          "eu.egi.SRM-VOLsDir",
          "eu.egi.SRM-VOPut"
        ]
      },
      {
        service: "webdav",
        metrics: [
          "ch.cern.WebDAV"
        ]
      }
    ]
  }
];

const mockBackendProfile = {
  name: 'TEST_PROFILE',
  groupname: 'EGI',
  description: '',
  apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
};

const mockAggregationVersions = [
  {
    id: '7',
    object_repr: 'TEST_PROFILE',
    fields: {
      name: 'TEST_PROFILE2',
      description: '',
      groupname: 'TEST2',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      endpoint_group: 'servicegroups',
      metric_operation: 'OR',
      profile_operation: 'OR',
      metric_profile: 'TEST_PROFILE2',
      groups: [
        {
          'name': 'Group1a',
          'operation': 'AND',
          'services': [
            {
              'name': 'AMGA',
              'operation': 'OR'
            },
            {
              'name': 'APEL',
              'operation': 'OR'
            }
          ]
        },
        {
          'name': 'Group2',
          'operation': 'OR',
          'services': [
            {
              'name': 'argo.api',
              'operation': 'OR'
            }
          ]
        }
      ]
    },
    user: 'testuser',
    date_created: '2021-03-31 13:56:48',
    comment: 'Changed endpoint_group, groupname, metric_operation, metric_profile, name and profile_operation. Deleted groups field "Group1". Added groups field "Group1a". Changed groups field "Group2".',
    version: '20210331-135648'
  },
  {
    id: '6',
    object_repr: 'TEST_PROFILE',
    fields: {
      name: 'TEST_PROFILE',
      description: '',
      groupname: 'EGI',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      endpoint_group: 'sites',
      metric_operation: 'AND',
      profile_operation: 'AND',
      metric_profile: 'TEST_PROFILE',
      groups: [
        {
          name: 'Group1',
          operation: 'AND',
          services: [
            {
              name: 'AMGA',
              operation: 'OR'
            },
            {
              name: 'APEL',
              operation: 'OR'
            }
          ]
        },
        {
          name: 'Group2',
          operation: 'AND',
          services: [
            {
              name: 'VOMS',
              operation: 'OR'
            },
            {
              name: 'argo.api',
              operation: 'OR'
            }
          ]
        }
      ]
    },
    user: 'testuser',
    date_created: '2020-12-28 14:53:48',
    comment: 'Initial version.',
    version: '20201228-145348'
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
    id: "bbbb1111-1111-2222-3333-4444-000000000000",
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
        id: "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
        name: "aggr1",
        type: "aggregation"
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


function renderListView(publicView = false) {
  const route = `/ui/${publicView ? 'public_' : ''}aggregationprofiles`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <AggregationProfilesList
              publicView={true}
              webapimetric='https://mock.metrics.com'
              webapiaggregation='https://mock.aggregations.com'
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
            <AggregationProfilesList
              webapimetric='https://mock.metrics.com'
              webapiaggregation='https://mock.aggregations.com'
              webapitoken='token'
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView = false) {
  const route = `/ui/${publicView ? 'public_' : ''}aggregationprofiles/TEST_PROFILE`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route 
                path="/ui/public_aggregationprofiles/:name"
                element={
                  <AggregationProfilesChange
                    webapimetric='https://mock.metrics.com'
                    webapiaggregation='https://mock.aggregations.com'
                    webapireports={{
                      main: 'https://reports.com',
                      tags: 'https://reports-tags.com',
                      topologygroups: 'https://topology-groups.com',
                      topologyendpoints: 'https://endpoints.com'
                    }}
                    webapitoken='token'
                    tenantname='TENANT'
                    publicView={true}
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
                path="/ui/aggregationprofiles/:name"
                element={
                  <AggregationProfilesChange
                    webapiaggregation='https://mock.aggregations.com'
                    webapimetric='https://mock.metrics.com'
                    webapitoken='token'
                    tenantname='TENANT' 
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddview() {
  const route = '/ui/aggregationprofiles/add';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <AggregationProfilesChange
            webapiaggregation='https://mock.aggregations.com'
            webapimetric='https://mock.metrics.com'
            webapitoken='token'
            tenantname='TENANT'
            addview={true}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView() {
  const route = '/ui/aggregationprofiles/TEST_PROFILE/history/20201228-145348';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/aggregationprofiles/:name/history/:version"
              element={ <AggregationProfileVersionDetails /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Tests for aggregation profiles listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockAggregationProfiles),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select aggregation profile to change')

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /another/i }).textContent).toBe('1ANOTHER-PROFILE')
    expect(screen.getByRole('link', { name: /another/i }).closest('a')).toHaveAttribute('href', '/ui/aggregationprofiles/ANOTHER-PROFILE');
    expect(screen.getByRole('row', { name: /test/i }).textContent).toBe('2TEST_PROFILEDescription of TEST_PROFILE.EGI');
    expect(screen.getByRole('link', { name: /test/i }).closest('a')).toHaveAttribute('href', '/ui/aggregationprofiles/TEST_PROFILE');

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/aggregationprofiles/add')
  })

  test('Test that page public renders properly', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select aggregation profile for details')

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /another/i }).textContent).toBe('1ANOTHER-PROFILE')
    expect(screen.getByRole('link', { name: /another/i }).closest('a')).toHaveAttribute('href', '/ui/public_aggregationprofiles/ANOTHER-PROFILE');
    expect(screen.getByRole('row', { name: /test/i }).textContent).toBe('2TEST_PROFILEDescription of TEST_PROFILE.EGI');
    expect(screen.getByRole('link', { name: /test/i }).closest('a')).toHaveAttribute('href', '/ui/public_aggregationprofiles/TEST_PROFILE');

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Tests for aggregation profiles changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    mockFetchReports.mockReturnValue([mockReports[0], mockReports[1]])
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockWebApiMetricProfiles),
        fetchAggregationProfile: () => Promise.resolve(mockWebApiProfile),
        fetchReports: () => mockFetchReports,
        changeAggregation: mockChangeAggregation,
        deleteAggregation: mockDeleteAggregation
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendProfile),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly without alerts', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByText('EGI');

    const metricOperation = screen.getAllByText('AND')[ 0 ]
    const aggrOperation = screen.getAllByText('AND')[ 1 ]
    const endpointGroup = screen.getByText('servicegroups')
    const metricProfileField = screen.getByText('ARGO_MON_CRITICAL')

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGO')).toBeInTheDocument()

    expect(metricOperation).toBeEnabled();
    expect(aggrOperation).toBeEnabled();
    expect(endpointGroup).toBeEnabled();
    expect(metricProfileField).toBeEnabled();

    expect(screen.queryByText('sites')).not.toBeInTheDocument()
    selectEvent.openMenu(endpointGroup)
    expect(screen.getByText('sites')).toBeInTheDocument()

    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument()
    selectEvent.openMenu(metricProfileField)
    expect(screen.getByText('FEDCLOUD')).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(4);
    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));
    const card2 = within(screen.getByTestId('card-2'));
    const card3 = within(screen.getByTestId('card-3'));

    expect(screen.getAllByText("AND")).toHaveLength(6)

    expect(card0.getByPlaceholderText(/service group/i).value).toBe('compute')
    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(card0.getAllByText("OR")).toHaveLength(5)
    expect(card0.getAllByTestId(/remove/i)).toHaveLength(5);
    expect(card0.getAllByTestId(/insert/i)).toHaveLength(4);

    expect(card1.getByPlaceholderText(/service group/i).value).toBe('storage')
    expect(card1.getByText("SRM")).toBeInTheDocument()
    expect(card1.getAllByText("OR")).toHaveLength(2)
    expect(card1.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card1.getAllByTestId(/insert/i)).toHaveLength(1);

    expect(card2.getByPlaceholderText(/service group/i).value).toBe('information')
    expect(card2.getByText("Site-BDII")).toBeInTheDocument()
    expect(card2.getAllByText("OR")).toHaveLength(2)
    expect(card2.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card2.getAllByTestId(/insert/i)).toHaveLength(1);

    expect(card3.getByPlaceholderText(/service group/i).value).toBe('cloud')
    expect(card3.getByText("org.openstack.nova")).toBeInTheDocument()
    expect(card3.getAllByText("OR")).toHaveLength(2)
    expect(card3.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card3.getAllByTestId(/insert/i)).toHaveLength(1);

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/aggregationprofiles/TEST_PROFILE/history')
    expect(screen.getByRole('button', { name: 'Add new group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Aggregation profile details');

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');
    const metricOperation = screen.getByTestId('metric_operation')
    const aggrOperation = screen.getByTestId('profile_operation')
    const endpointGroup = screen.getByTestId('endpoint_group')
    const metricProfileField = screen.getByTestId('metric_profile');

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeDisabled();

    expect(metricOperation.value).toBe('AND');
    expect(metricOperation).toBeDisabled();
    expect(aggrOperation.value).toBe('AND');
    expect(aggrOperation).toBeDisabled();
    expect(endpointGroup.value).toBe('servicegroups');
    expect(endpointGroup).toBeDisabled();
    expect(metricProfileField.value).toBe('ARGO_MON_CRITICAL');
    expect(metricProfileField).toBeDisabled();

    expect(screen.getAllByTestId(/card/i)).toHaveLength(4);
    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));
    const card2 = within(screen.getByTestId('card-2'));
    const card3 = within(screen.getByTestId('card-3'));

    expect(screen.getAllByTestId(/group-operation/i)).toHaveLength(4);
    expect(screen.getByTestId('group-operation-0').textContent).toBe('AND');
    expect(screen.getByTestId('group-operation-1').textContent).toBe('AND');
    expect(screen.getByTestId('group-operation-2').textContent).toBe('AND');
    expect(screen.getByTestId('group-operation-3').textContent).toBe('AND');

    expect(card0.getByTestId('service-group').textContent).toBe('compute')
    expect(card0.getAllByTestId(/service-/i)).toHaveLength(5);
    expect(card0.getByTestId('service-0').textContent).toBe('ARC-CE');
    expect(card0.getByTestId('service-1').textContent).toBe('GRAM5');
    expect(card0.getByTestId('service-2').textContent).toBe('QCG.Computing');
    expect(card0.getByTestId('service-3').textContent).toBe('org.opensciencegrid.htcondorce');
    expect(card0.getAllByTestId(/operation-/i)).toHaveLength(4);
    expect(card0.getByTestId('operation-0').textContent).toBe('OR');
    expect(card0.getByTestId('operation-1').textContent).toBe('OR');
    expect(card0.getByTestId('operation-2').textContent).toBe('OR');
    expect(card0.getByTestId('operation-3').textContent).toBe('OR');
    expect(card0.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card0.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card0.getByTestId('operation').textContent).toBe('OR');

    expect(card1.getByTestId('service-group').textContent).toBe('storage')
    expect(card1.getAllByTestId(/service-/i)).toHaveLength(2);
    expect(card1.getByTestId('service-0').textContent).toBe('SRM');
    expect(card1.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card1.getByTestId('operation-0').textContent).toBe('OR');
    expect(card1.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card1.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card1.getByTestId('operation').textContent).toBe('OR');

    expect(card2.getByTestId('service-group').textContent).toBe('information')
    expect(card2.getAllByTestId(/service-/i)).toHaveLength(2);
    expect(card2.getByTestId('service-0').textContent).toBe('Site-BDII');
    expect(card2.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card2.getByTestId('operation-0').textContent).toBe('OR');
    expect(card2.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card2.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card2.getByTestId('operation').textContent).toBe('OR');

    expect(card3.getByTestId('service-group').textContent).toBe('cloud')
    expect(card3.getAllByTestId(/service-/i)).toHaveLength(2);
    expect(card3.getByTestId('service-0').textContent).toBe('org.openstack.nova');
    expect(card3.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card3.getByTestId('operation-0').textContent).toBe('OR');
    expect(card3.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card3.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card3.getByTestId('operation').textContent).toBe('OR');

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /json/i })).not.toBeInTheDocument();

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument();
  })

  test("Test change main profile info", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId("name")
    expect(screen.getByText("EGI")).toBeInTheDocument()
    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: "TEST_PROFILE"
    })

    fireEvent.change(nameField, { target: { value: "NEW_NAME" } })

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: "NEW_NAME"
    })

    expect(screen.getByText("EGI")).toBeInTheDocument()
    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument();

    await selectEvent.select(screen.getByText("EGI"), "ARGO")

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: "NEW_NAME"
    })

    expect(screen.queryByText("EGI")).not.toBeInTheDocument()
    expect(screen.getByText("ARGO")).toBeInTheDocument()

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument();
  })

  test("Test changing endpoint group and metric profile", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByText("servicegroups")).toBeInTheDocument()
    expect(screen.queryByText("sites")).not.toBeInTheDocument()
    expect(screen.getByText("ARGO_MON_CRITICAL")).toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText("servicegroups"), "sites")

    expect(screen.queryByText("servicegroups")).not.toBeInTheDocument()
    expect(screen.getByText("sites")).toBeInTheDocument()
    expect(screen.getByText("ARGO_MON_CRITICAL")).toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument();

    await selectEvent.select(screen.getByText("ARGO_MON_CRITICAL"), "ARGO_MON_TEST")

    expect(screen.queryByText("servicegroups")).not.toBeInTheDocument()
    expect(screen.getByText("sites")).toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_CRITICAL")).not.toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.getByText("ARGO_MON_TEST")).toBeInTheDocument()

    expect(screen.queryByTestId('alert-missing')).not.toBeInTheDocument()
    expect(screen.getByTestId('alert-extra')).toBeInTheDocument()

    await selectEvent.select(screen.getByText('ARGO_MON_TEST'), 'FEDCLOUD')

    expect(screen.queryByText("ARGO_MON_CRITICAL")).not.toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()

    expect(screen.getByTestId('alert-missing')).toBeInTheDocument()
    expect(screen.queryByTestId('alert-extra')).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText('FEDCLOUD'), 'ARGO_MON_CRITICAL')

    expect(screen.queryByText("ARGO_MON_CRITICAL")).toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()
  })

  test("Test changing group", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud",
    })

    const card0 = within(screen.getByTestId("card-0"))

    fireEvent.change(screen.getByTestId("groups.0.name"), { target: { value: "compute2" } })

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute2",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()

    await selectEvent.select(within(screen.getByTestId("card-0")).getAllByText("OR")[4], "AND")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute2",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()

    fireEvent.click(card0.getByTestId("insert-0"))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()

    await selectEvent.select(screen.getByText("ARGO_MON_CRITICAL"), "ARGO_MON_TEST")

    expect(screen.queryByTestId('alert-missing')).not.toBeInTheDocument()
    expect(screen.queryByTestId('alert-extra')).toBeInTheDocument()

    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "webdav")
    })

    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(card0.getByText("webdav")).toBeInTheDocument()

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute2",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    await selectEvent.select(screen.getByText("ARGO_MON_TEST"), "ARGO_MON_CRITICAL")

    expect(screen.queryByTestId('alert-missing')).toBeInTheDocument()
    expect(screen.queryByTestId('alert-extra')).not.toBeInTheDocument()

    fireEvent.click(card0.getByTestId("remove-service-1"))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute2",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(card0.queryByText("webdav")).not.toBeInTheDocument()
    expect(card0.queryByText("test-service")).not.toBeInTheDocument()

    fireEvent.click(card0.getByTestId("remove-service-0"))

    expect(screen.queryByTestId('alert-missing')).not.toBeInTheDocument()
    expect(screen.queryByTestId('alert-extra')).toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute2",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("QCG.Computing")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(card0.queryByText("webdav")).not.toBeInTheDocument()
    expect(card0.queryByText("test-service")).not.toBeInTheDocument()
    expect(card0.queryByText("ARC-CE")).not.toBeInTheDocument()
  })

  test("Test add/remove group", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getAllByTestId(/card/i)).toHaveLength(4)

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute",
      "groups.1.name": "storage",
      "groups.2.name": "information",
      "groups.3.name": "cloud"
    })

    fireEvent.click(screen.getByTestId("remove-group-1"))

    expect(screen.queryByTestId("alert-missing")).not.toBeInTheDocument()
    expect(screen.queryByTestId("alert-extra")).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(3)

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute",
      "groups.1.name": "information",
      "groups.2.name": "cloud"
    })

    fireEvent.click(screen.getByRole("button", { name: /add new group/i }))

    expect(screen.queryByTestId("alert-missing")).not.toBeInTheDocument()
    expect(screen.queryByTestId("alert-extra")).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(4)

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "compute",
      "groups.1.name": "information",
      "groups.2.name": "cloud",
      "groups.3.name": ""
    })

    const newCard = within(screen.getByTestId("card-3"))
    expect(newCard.getAllByText(/select/i)).toHaveLength(3)
  })

  test('Test import json successfully', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const content = new Blob([JSON.stringify({
      profile_operation: 'OR',
      endpoint_group: 'sites',
      metric_operation: 'OR',
      groups: [
        {
          services: [
            {
              operation: 'OR',
              name: 'ARC-CE'
            },
            {
              operation: 'AND',
              name: 'GRAM5'
            },
            {
              operation: 'OR',
              name: 'org.opensciencegrid.htcondorce'
            }
          ],
          operation: 'OR',
          name: 'compute'
        }
      ],
      metric_profile: 'FEDCLOUD'
    })], { type: 'application/json' });

    const file = new File([content], 'profile.json', { type: 'application/json' });
    const input = screen.getByTestId('file_input');
    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toBe(file)
    })

    expect(input.files.item(0)).toBe(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByText('EGI');

    const metricOperation = screen.getAllByText('OR')[0]
    const aggrOperation = screen.getAllByText('OR')[1]
    const endpointGroup = screen.getByText('sites')
    const metricProfileField = screen.getByText('FEDCLOUD')

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField).toBeEnabled();

    expect(metricOperation).toBeEnabled();
    expect(aggrOperation).toBeEnabled();
    expect(endpointGroup).toBeEnabled();
    expect(metricProfileField).toBeEnabled();

    expect(screen.queryByText('servicegroups')).not.toBeInTheDocument()
    selectEvent.openMenu(endpointGroup)
    expect(screen.getByText('servicegroups')).toBeInTheDocument()

    expect(screen.queryByText('ARGO_MON_CRITICAL')).not.toBeInTheDocument()
    selectEvent.openMenu(metricProfileField)
    expect(screen.getByText('ARGO_MON_CRITICAL')).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(1);
    const card0 = within(screen.getByTestId('card-0'));

    expect(screen.getAllByTestId(/group-operation/i)).toHaveLength(1);

    expect(card0.getByPlaceholderText(/service group/i).value).toBe('compute')
    expect(card0.getByText("ARC-CE")).toBeInTheDocument()
    expect(card0.getByText("GRAM5")).toBeInTheDocument()
    expect(card0.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(card0.getAllByText("OR")).toHaveLength(3)
    expect(card0.getAllByText("AND")).toHaveLength(1)
    expect(card0.getAllByTestId(/remove/i)).toHaveLength(4);
    expect(card0.getAllByTestId(/insert/i)).toHaveLength(3);
  })

  test('Test export json successfully', async () => {
    const helpers = require('../FileDownload');
    jest.spyOn(helpers, 'downloadJSON').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

    const content = {
      endpoint_group: 'servicegroups',
      metric_operation: 'AND',
      profile_operation: 'AND',
      metric_profile: 'ARGO_MON_CRITICAL',
      groups: [
        {
          name: "compute",
          operation: "OR",
          services: [
            {
              name: "ARC-CE",
              operation: "OR"
            },
            {
              name: "GRAM5",
              operation: "OR"
            },
            {
              name: "QCG.Computing",
              operation: "OR"
            },
            {
              name: "org.opensciencegrid.htcondorce",
              operation: "OR"
            }
          ]
        },
        {
          name: "storage",
          operation: "OR",
          services: [
            {
              name: "SRM",
              operation: "OR"
            }
          ]
        },
        {
          name: "information",
          operation: "OR",
          services: [
            {
              name: "Site-BDII",
              operation: "OR"
            }
          ]
        },
        {
          name: "cloud",
          operation: "OR",
          services: [
            {
              name: "org.openstack.nova",
              operation: "OR"
            }
          ]
        }
      ]
    };

    expect(helpers.downloadJSON).toHaveBeenCalledTimes(1);
    expect(helpers.downloadJSON).toHaveBeenCalledWith(content, 'TEST_PROFILE.json');
  })

  test('Test export json when form has been changed', async () => {
    const helpers = require('../FileDownload');
    jest.spyOn(helpers, 'downloadJSON').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    const metricOperation = screen.getAllByText('AND')[ 0 ]
    const aggregationOperation = screen.getAllByText('AND')[ 1 ]
    const endpointGroup = screen.getByText('servicegroups')
    const metricProfile = screen.getByText('ARGO_MON_CRITICAL')

    await selectEvent.select(metricOperation, 'OR')
    await selectEvent.select(aggregationOperation, 'OR')
    await selectEvent.select(endpointGroup, 'sites')
    await selectEvent.select(metricProfile, 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));
    
    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId('card-3')).getAllByText("OR")[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

    const content = {
      profile_operation: 'OR',
      endpoint_group: 'sites',
      metric_operation: 'OR',
      groups: [
        {
          services: [
            {
              operation: 'OR',
              name: 'ARC-CE'
            },
            {
              operation: 'AND',
              name: 'GRAM5'
            },
            {
              operation: 'OR',
              name: 'org.opensciencegrid.htcondorce'
            }
          ],
          operation: 'OR',
          name: 'compute'
        },
        {
          services: [
            {
              operation: 'OR',
              name: 'SRM'
            },
            {
              operation: 'OR',
              name: 'webdav'
            }
          ],
          operation: 'OR',
          name: 'storage'
        },
        {
          services: [
            {
              operation: 'OR',
              name: 'org.openstack.nova'
            }
          ],
          operation: 'AND',
          name: 'cloud'
        }
      ],
      metric_profile: 'ARGO_MON_TEST'
    };

    expect(helpers.downloadJSON).toHaveBeenCalledTimes(1);
    expect(helpers.downloadJSON).toHaveBeenCalledWith(content, 'TEST_PROFILE.json');
  })

  test('Test error changing aggregation profile on web api with error message', async () => {
    mockChangeAggregation.mockImplementationOnce(() => {
      throw Error('406 Content Not acceptable: There has been an error.')
    });

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getByText('servicegroups'), 'sites')
    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId("card-3")).getAllByText("OR")[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'ARGO',
        name: 'TEST_PROFILE',
        metric_operation: 'OR',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'SRM'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'storage'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'AND',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled();
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

  test('Test error changing aggregation profile on web api without error message', async () => {
    mockChangeAggregation.mockImplementationOnce(() => { throw Error() });

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getByText('servicegroups'), 'sites')
    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId("card-3")).getAllByText("OR")[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'ARGO',
        name: 'TEST_PROFILE',
        metric_operation: 'OR',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'SRM'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'storage'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'AND',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing aggregation profile on internal API with error message', async () => {
    mockChangeObject.mockImplementationOnce(() => {
      throw Error('400 BAD REQUEST: There has been an error.')
    });
    mockChangeAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getByText('servicegroups'), 'sites')
    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId('card-3')).getAllByText("OR")[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'ARGO',
        name: 'TEST_PROFILE',
        metric_operation: 'OR',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'SRM'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'storage'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'AND',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          name: 'TEST_PROFILE',
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          groupname: 'ARGO',
          endpoint_group: 'sites',
          metric_operation: 'OR',
          profile_operation: 'OR',
          metric_profile: 'ARGO_MON_TEST',
          groups: JSON.stringify([
            {
              name: 'compute',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'AND'
                },
                {
                  name: 'org.opensciencegrid.htcondorce',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'storage',
              operation: 'OR',
              services: [
                {
                  name: 'SRM',
                  operation: 'OR'
                },
                {
                  name: 'webdav',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'AND',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ],
            }
          ])
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

  test('Test error changing aggregation profile on internal API without error message', async () => {
    mockChangeObject.mockImplementationOnce(() => { throw Error() });
    mockChangeAggregation.mockReturnValueOnce(Promise.resolve({ ok: 'ok' }));

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getByText('servicegroups'), 'sites')
    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId('card-3')).getAllByText("OR")[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'ARGO',
        name: 'TEST_PROFILE',
        metric_operation: 'OR',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'SRM'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'storage'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'AND',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          name: 'TEST_PROFILE',
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          groupname: 'ARGO',
          endpoint_group: 'sites',
          metric_operation: 'OR',
          profile_operation: 'OR',
          metric_profile: 'ARGO_MON_TEST',
          groups: JSON.stringify([
            {
              name: 'compute',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'AND'
                },
                {
                  name: 'org.opensciencegrid.htcondorce',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'storage',
              operation: 'OR',
              services: [
                {
                  name: 'SRM',
                  operation: 'OR'
                },
                {
                  name: 'webdav',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'AND',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ],
            }
          ])
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test change aggregation profile and save', async () => {
    mockChangeAggregation.mockReturnValueOnce(Promise.resolve({ ok: 'ok' }));

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    await selectEvent.select(screen.getByText('EGI'), 'ARGO')

    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getAllByText('AND')[ 0 ], 'OR')
    await selectEvent.select(screen.getByText('servicegroups'), 'sites')
    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'ARGO_MON_TEST')

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-service-2'));
    await selectEvent.select(card0.getAllByText("OR")[1], "AND")

    fireEvent.click(card1.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card1.getAllByText(/select/i)[0], "webdav")
    })

    await selectEvent.select(within(screen.getByTestId('card-3')).getAllByText('OR')[1], "AND")

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group-2'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'ARGO',
        name: 'TEST_PROFILE',
        metric_operation: 'OR',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'SRM'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'storage'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'AND',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          name: 'TEST_PROFILE',
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          groupname: 'ARGO',
          endpoint_group: 'sites',
          metric_operation: 'OR',
          profile_operation: 'OR',
          metric_profile: 'ARGO_MON_TEST',
          groups: JSON.stringify([
            {
              name: 'compute',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'AND'
                },
                {
                  name: 'org.opensciencegrid.htcondorce',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'storage',
              operation: 'OR',
              services: [
                {
                  name: 'SRM',
                  operation: 'OR'
                },
                {
                  name: 'webdav',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'AND',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ],
            }
          ])
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('aggregationprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_aggregationprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully changed', 'Changed', 2000
    )
  })

  test('Test import json, make some changes and save profile', async () => {
    mockChangeAggregation.mockReturnValueOnce(Promise.resolve({ ok: 'ok' }));

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const content = new Blob([ JSON.stringify({
      profile_operation: 'OR',
      endpoint_group: 'sites',
      metric_operation: 'OR',
      groups: [
        {
          services: [
            {
              operation: 'OR',
              name: 'ARC-CE'
            },
            {
              operation: 'AND',
              name: 'GRAM5'
            },
            {
              operation: 'OR',
              name: 'org.opensciencegrid.htcondorce'
            }
          ],
          operation: 'OR',
          name: 'compute'
        }
      ],
      metric_profile: 'ARGO_MON_TEST'
    }) ], { type: 'application/json' });

    const file = new File([ content ], 'profile.json', { type: 'application/json' });
    const input = screen.getByTestId('file_input');
    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[ 0 ]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    await selectEvent.select(screen.getByLabelText('Metric operation:'), 'AND')

    const card0 = within(screen.getByTestId('card-0'));
    fireEvent.click(card0.getByTestId('insert-2'));

    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "webdav")
    })

    fireEvent.click(screen.getByRole('button', { name: /add new group/i }));

    const card1 = within(screen.getByTestId('card-1'));
    fireEvent.change(card1.getByPlaceholderText(/service group/i), { target: { value: 'cloud' } })
    await selectEvent.select(card1.getAllByText(/select/i)[0], "org.openstack.nova")
    await selectEvent.select(card1.getAllByText(/select/i)[1], "OR")
    await selectEvent.select(card1.getByText(/select/i), "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeAggregation).toHaveBeenCalledWith({
        profile_operation: 'OR',
        endpoint_group: 'sites',
        groupname: 'EGI',
        name: 'TEST_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'AND',
                name: 'GRAM5'
              },
              {
                operation: 'OR',
                name: 'org.opensciencegrid.htcondorce'
              },
              {
                operation: 'OR',
                name: 'webdav'
              }
            ],
            operation: 'OR',
            name: 'compute'
          },
          {
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ],
            operation: 'OR',
            name: 'cloud'
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_TEST',
          id: 'Eitaew8t-gSk6-nW8Q-Z3aF-quo0Saevooze'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          name: 'TEST_PROFILE',
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          groupname: 'EGI',
          endpoint_group: 'sites',
          metric_operation: 'AND',
          profile_operation: 'OR',
          metric_profile: 'ARGO_MON_TEST',
          groups: JSON.stringify([
            {
              services: [
                {
                  operation: 'OR',
                  name: 'ARC-CE'
                },
                {
                  operation: 'AND',
                  name: 'GRAM5'
                },
                {
                  operation: 'OR',
                  name: 'org.opensciencegrid.htcondorce'
                },
                {
                  name: 'webdav',
                  operation: 'OR'
                }
              ],
              operation: 'OR',
              name: 'compute'
            },
            {
              name: 'cloud',
              operation: 'OR',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR',
                }
              ]
            }
          ])
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('aggregationprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_aggregationprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully changed', 'Changed', 2000
    )
  })

  test('Test successfully deleting aggregation profile', async () => {
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteAggregation).toHaveBeenCalledWith('00000000-oooo-kkkk-aaaa-aaeekkccnnee')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('aggregationprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_aggregationprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully deleted', 'Deleted', 2000
    )
  })

  test("Test delete aggregation profile associated with report", async () => {
    mockFetchReports.mockReturnValueOnce(mockReports)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteAggregation).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Aggregation profile is associated with report: TEST</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting aggregation profile on web api with error message', async () => {
    mockDeleteAggregation.mockImplementationOnce(() => {
      throw Error('406 Content Not acceptable: There has been an error.')
    });

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteAggregation).toHaveBeenCalledWith('00000000-oooo-kkkk-aaaa-aaeekkccnnee')
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled();
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

  test('Test error deleting aggregation profile on web api without error message', async () => {
    mockDeleteAggregation.mockImplementationOnce(() => { throw Error() });

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteAggregation).toHaveBeenCalledWith('00000000-oooo-kkkk-aaaa-aaeekkccnnee')
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting aggregation profile on internal backend with error message', async () => {
    mockDeleteObject.mockImplementationOnce(() => {
      throw Error('400 BAD REQUEST: There has been an error.')
    });
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteAggregation).toHaveBeenCalledWith('00000000-oooo-kkkk-aaaa-aaeekkccnnee')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
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

  test('Test error deleting aggregation profile on internal backend without error message', async () => {
    mockDeleteObject.mockImplementationOnce(() => { throw Error() });
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteAggregation).toHaveBeenCalledWith('00000000-oooo-kkkk-aaaa-aaeekkccnnee')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for aggregation profile addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockWebApiMetricProfiles),
        addAggregation: mockAddAggregation
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /aggregation profile/i }).textContent).toBe('Add aggregation profile');

    const nameField = screen.getByTestId('name');
    const groupField = screen.getAllByText(/select/i)[0];
    const metricOperation = screen.getAllByText(/select/i)[1];
    const aggrOperation = screen.getAllByText(/select/i)[2];
    const endpointGroup = screen.getAllByText(/select/i)[3];
    const metricProfileField = screen.getAllByText(/select/i)[4];

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('EGI')).not.toBeInTheDocument()
    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('EGI')).toBeInTheDocument()
    expect(screen.getByText('ARGO')).toBeInTheDocument()

    expect(metricOperation).toBeEnabled();
    expect(aggrOperation).toBeEnabled();
    expect(endpointGroup).toBeEnabled();
    expect(metricProfileField).toBeEnabled();

    expect(screen.queryByText('OR')).not.toBeInTheDocument()
    expect(screen.queryByText('AND')).not.toBeInTheDocument()
    selectEvent.openMenu(metricOperation)
    expect(screen.getByText('OR')).toBeInTheDocument()
    expect(screen.getByText('AND')).toBeInTheDocument()

    expect(screen.queryByText('ARGO_MON_CRITICAL')).not.toBeInTheDocument()
    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument()
    selectEvent.openMenu(metricProfileField)
    expect(screen.getByText('ARGO_MON_CRITICAL')).toBeInTheDocument()
    expect(screen.getByText('FEDCLOUD')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Add new group' })).toBeInTheDocument();
    expect(screen.queryAllByTestId(/card-/)).toHaveLength(0);

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /json/i })).not.toBeInTheDocument();
  })

  test("Test add main profile info", async () => {
    renderAddview()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: ""
    })

    expect(screen.queryByText("EGI")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "TEST_PROFILE" } })

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: "TEST_PROFILE"
    })

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      name: "TEST_PROFILE"
    })

    expect(screen.queryByText("EGI")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO")).toBeInTheDocument()
  })

  test("Test adding endpoint group and metric profile", async () => {
    renderAddview()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.queryByText("servicegroups")).not.toBeInTheDocument()
    expect(screen.queryByText("sites")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_CRITICAL")).not.toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()

    await selectEvent.select(screen.getAllByText(/select/i)[3], "servicegroups")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    await selectEvent.select(screen.getAllByText(/select/i)[3], "ARGO_MON_CRITICAL")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.queryByText("servicegroups")).toBeInTheDocument()
    expect(screen.queryByText("sites")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_CRITICAL")).toBeInTheDocument()
    expect(screen.queryByText("FEDCLOUD")).not.toBeInTheDocument()
    expect(screen.queryByText("ARGO_MON_TEST")).not.toBeInTheDocument()
  })

  test("Test add/remove group", async () => {
    renderAddview()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.queryAllByTestId(/card-/i)).toHaveLength(0)

    expect(screen.getByRole("button", { name: /add new group/i })).toBeDisabled()

    await selectEvent.select(screen.getAllByText(/select/i)[4], "FEDCLOUD")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByRole("button", { name: /add new group/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /add new group/i }))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getAllByTestId(/card-/i)).toHaveLength(1)

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": ""
    })

    const group = within(screen.getByTestId("card-0"))

    expect(group.getAllByText(/select/i)).toHaveLength(3)

    fireEvent.change(group.getByTestId("groups.0.name"), { target: { value: "Group1" } })

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1"
    })

    await selectEvent.select(group.getAllByText(/select/i)[1], "OR")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1"
    })

    expect(group.getAllByText(/select/i)).toHaveLength(2)
    expect(group.getAllByText("OR")).toHaveLength(1)

    await selectEvent.select(group.getAllByText(/select/i)[0], "org.opensciencegrid.htcondorce")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    fireEvent.click(group.getByTestId("insert-0"))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /add new group/i }))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1",
      "groups.1.name": ""
    })

    expect(within(screen.getByTestId("card-1")).getAllByText(/select/i)).toHaveLength(3)

    fireEvent.change(screen.getByTestId("groups.1.name"), { target: { value: "Group2" } })
    await selectEvent.select(within(screen.getByTestId("card-1")).getAllByText(/select/i)[1], "AND")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1",
      "groups.1.name": "Group2"
    })

    expect(within(screen.getByTestId("card-1")).getAllByText(/select/i)).toHaveLength(2)
    expect(within(screen.getByTestId("card-1")).getAllByText("AND")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: /add new group/i }))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1",
      "groups.1.name": "Group2",
      "groups.2.name": ""
    })

    expect(within(screen.getByTestId("card-2")).getAllByText(/select/i)).toHaveLength(3)

    fireEvent.change(screen.getByTestId("groups.2.name"), { target: { value: "Group3" } })
    await selectEvent.select(within(screen.getByTestId("card-2")).getAllByText(/select/i)[1], "AND")

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1",
      "groups.1.name": "Group2",
      "groups.2.name": "Group3"
    })

    expect(within(screen.getByTestId("card-2")).getAllByText(/select/i)).toHaveLength(2)
    expect(within(screen.getByTestId("card-2")).getAllByText("AND")).toHaveLength(1)

    fireEvent.click(screen.getByTestId("remove-group-1"))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1",
      "groups.1.name": "Group3"
    })

    fireEvent.click(screen.getByTestId("remove-group-1"))

    expect(screen.queryByTestId(/alert/i)).not.toBeInTheDocument()

    expect(screen.getByTestId("aggregation-form")).toHaveFormValues({
      "groups.0.name": "Group1"
    })
  })

  test('Test successfully adding an aggregation profile', async () => {
    mockAddAggregation.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Aggregation profile Created',
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

    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'servicegroups')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO_MON_CRITICAL')

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card0 = within(screen.getByTestId('card-0'));
    const selectFields0 = card0.getAllByText(/select/i);
    fireEvent.change(card0.getByTestId("groups.0.name"), { target: { value: 'Group 1' } })
    await selectEvent.select(selectFields0[0], "ARC-CE")
    await selectEvent.select(selectFields0[1], "OR")
    await selectEvent.select(selectFields0[2], "OR")
    fireEvent.click(card0.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "GRAM5")
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card1 = within(screen.getByTestId('card-1'))
    const selectFields1 = card1.getAllByText(/select/i)
    fireEvent.change(card1.getByTestId("groups.1.name"), { target: { value: 'cloud' } });
    await selectEvent.select(selectFields1[0], "org.openstack.nova")
    await selectEvent.select(selectFields1[1], "OR")
    await selectEvent.select(selectFields1[2], "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddAggregation).toHaveBeenCalledWith({
        profile_operation: 'AND',
        endpoint_group: 'servicegroups',
        groupname: 'ARGO',
        name: 'NEW_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            name: 'Group 1',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'OR',
                name: 'GRAM5'
              }
            ],
          },
          {
            name: 'cloud',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ]
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_CRITICAL',
          id: '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: ''
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          profile_operation: 'AND',
          endpoint_group: 'servicegroups',
          groupname: 'ARGO',
          name: 'NEW_PROFILE',
          metric_operation: 'AND',
          metric_profile: 'ARGO_MON_CRITICAL',
          groups: JSON.stringify([
            {
              name: 'Group 1',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'OR',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ]
            }
          ])
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('aggregationprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_aggregationprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully added', 'Added', 2000
    )
  })

  test('Test error adding aggregation profile in web api with error message', async () => {
    mockAddAggregation.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'servicegroups')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO_MON_CRITICAL')

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card0 = within(screen.getByTestId('card-0'));
    const selectFields0 = card0.getAllByText(/select/i)
    fireEvent.change(card0.getByTestId("groups.0.name"), { target: { value: 'Group 1' } });
    await selectEvent.select(selectFields0[0], "ARC-CE")
    await selectEvent.select(selectFields0[1], "OR")
    await selectEvent.select(selectFields0[2], "OR")
    fireEvent.click(card0.getByTestId('insert-0'));
    
    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "GRAM5")
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card1 = within(screen.getByTestId('card-1'))
    const selectFields1 = card1.getAllByText(/select/i)
    fireEvent.change(card1.getByTestId("groups.1.name"), { target: { value: 'cloud' } });
    await selectEvent.select(selectFields1[0], "org.openstack.nova")
    await selectEvent.select(selectFields1[1], "OR")
    await selectEvent.select(selectFields1[2], "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddAggregation).toHaveBeenCalledWith({
        profile_operation: 'AND',
        endpoint_group: 'servicegroups',
        groupname: 'ARGO',
        name: 'NEW_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            name: 'Group 1',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'OR',
                name: 'GRAM5'
              }
            ],
          },
          {
            name: 'cloud',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ]
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_CRITICAL',
          id: '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: ''
      })
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled();
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

  test('Test error adding aggregation profile in web api without error message', async () => {
    mockAddAggregation.mockImplementationOnce( () => { throw Error() } );

    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'servicegroups')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO_MON_CRITICAL')

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card0 = within(screen.getByTestId('card-0'));
    const selectFields0 = card0.getAllByText(/select/i)
    fireEvent.change(card0.getByTestId("groups.0.name"), { target: { value: 'Group 1' } });
    await selectEvent.select(selectFields0[0], "ARC-CE")
    await selectEvent.select(selectFields0[1], "OR")
    await selectEvent.select(selectFields0[2], "OR")
    fireEvent.click(card0.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "GRAM5")
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card1 = within(screen.getByTestId('card-1'))
    const selectFields1 = card1.getAllByText(/select/i)
    fireEvent.change(card1.getByTestId("groups.1.name"), { target: { value: 'cloud' } });
    await selectEvent.select(selectFields1[0], "org.openstack.nova")
    await selectEvent.select(selectFields1[1], "OR")
    await selectEvent.select(selectFields1[2], "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddAggregation).toHaveBeenCalledWith({
        profile_operation: 'AND',
        endpoint_group: 'servicegroups',
        groupname: 'ARGO',
        name: 'NEW_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            name: 'Group 1',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'OR',
                name: 'GRAM5'
              }
            ],
          },
          {
            name: 'cloud',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ]
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_CRITICAL',
          id: '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: ''
      })
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding an aggregation profile in internal api with error message', async () => {
    mockAddAggregation.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Aggregation profile Created',
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

    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'servicegroups')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO_MON_CRITICAL')

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card0 = within(screen.getByTestId('card-0'));
    const selectFields0 = card0.getAllByText(/select/i)
    fireEvent.change(card0.getByTestId("groups.0.name"), { target: { value: 'Group 1' } });
    await selectEvent.select(selectFields0[0], "ARC-CE")
    await selectEvent.select(selectFields0[1], "OR")
    await selectEvent.select(selectFields0[2], "OR")
    fireEvent.click(card0.getByTestId('insert-0'));
    
    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "GRAM5")
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card1 = within(screen.getByTestId('card-1'))
    const selectFields1 = card1.getAllByText(/select/i)
    fireEvent.change(card1.getByTestId("groups.1.name"), { target: { value: 'cloud' } });
    await selectEvent.select(selectFields1[0], "org.openstack.nova")
    await selectEvent.select(selectFields1[1], "OR")
    await selectEvent.select(selectFields1[2], "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddAggregation).toHaveBeenCalledWith({
        profile_operation: 'AND',
        endpoint_group: 'servicegroups',
        groupname: 'ARGO',
        name: 'NEW_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            name: 'Group 1',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'OR',
                name: 'GRAM5'
              }
            ],
          },
          {
            name: 'cloud',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ]
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_CRITICAL',
          id: '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: ''
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          profile_operation: 'AND',
          endpoint_group: 'servicegroups',
          groupname: 'ARGO',
          name: 'NEW_PROFILE',
          metric_operation: 'AND',
          metric_profile: 'ARGO_MON_CRITICAL',
          groups: JSON.stringify([
            {
              name: 'Group 1',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'OR',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ]
            }
          ])
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

  test('Test error adding an aggregation profile in internal api without error message', async () => {
    mockAddAggregation.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Aggregation profile Created',
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

    renderAddview();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'AND')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'servicegroups')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO_MON_CRITICAL')

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card0 = within(screen.getByTestId('card-0'));
    const selectFields0 = card0.getAllByText(/select/i)
    fireEvent.change(card0.getByTestId("groups.0.name"), { target: { value: 'Group 1' } });
    await selectEvent.select(selectFields0[0], "ARC-CE")
    await selectEvent.select(selectFields0[1], "OR")
    await selectEvent.select(selectFields0[2], "OR")
    fireEvent.click(card0.getByTestId('insert-0'));

    await waitFor(async () => {
      await selectEvent.select(card0.getAllByText(/select/i)[0], "GRAM5")
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add new group' }));
    const card1 = within(screen.getByTestId('card-1'))
    const selectFields1 = card1.getAllByText(/select/i)
    fireEvent.change(card1.getByTestId("groups.1.name"), { target: { value: 'cloud' } });
    await selectEvent.select(selectFields1[0], "org.openstack.nova")
    await selectEvent.select(selectFields1[1], "OR")
    await selectEvent.select(selectFields1[2], "OR")

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddAggregation).toHaveBeenCalledWith({
        profile_operation: 'AND',
        endpoint_group: 'servicegroups',
        groupname: 'ARGO',
        name: 'NEW_PROFILE',
        metric_operation: 'AND',
        namespace: 'TENANT',
        groups: [
          {
            name: 'Group 1',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'ARC-CE'
              },
              {
                operation: 'OR',
                name: 'GRAM5'
              }
            ],
          },
          {
            name: 'cloud',
            operation: 'OR',
            services: [
              {
                operation: 'OR',
                name: 'org.openstack.nova'
              }
            ]
          }
        ],
        metric_profile: {
          name: 'ARGO_MON_CRITICAL',
          id: '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: ''
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/aggregations/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          profile_operation: 'AND',
          endpoint_group: 'servicegroups',
          groupname: 'ARGO',
          name: 'NEW_PROFILE',
          metric_operation: 'AND',
          metric_profile: 'ARGO_MON_CRITICAL',
          groups: JSON.stringify([
            {
              name: 'Group 1',
              operation: 'OR',
              services: [
                {
                  name: 'ARC-CE',
                  operation: 'OR'
                },
                {
                  name: 'GRAM5',
                  operation: 'OR'
                }
              ],
            },
            {
              name: 'cloud',
              operation: 'OR',
              services: [
                {
                  name: 'org.openstack.nova',
                  operation: 'OR'
                }
              ]
            }
          ])
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test for aggregation profile version detail page', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockAggregationVersions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderVersionDetailsView();

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /test/i }).textContent).toBe('TEST_PROFILE (2020-12-28 14:53:48)')

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');
    const metricOperation = screen.getByTestId('metric_operation')
    const aggrOperation = screen.getByTestId('profile_operation')
    const endpointGroup = screen.getByTestId('endpoint_group')
    const metricProfileField = screen.getByTestId('metric_profile');

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeDisabled();

    expect(metricOperation.value).toBe('AND');
    expect(metricOperation).toBeDisabled();
    expect(aggrOperation.value).toBe('AND');
    expect(aggrOperation).toBeDisabled();
    expect(endpointGroup.value).toBe('sites');
    expect(endpointGroup).toBeDisabled();
    expect(metricProfileField.value).toBe('TEST_PROFILE');
    expect(metricProfileField).toBeDisabled();

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    expect(screen.getAllByTestId(/group-operation/i)).toHaveLength(2);
    expect(screen.getByTestId('group-operation-0').textContent).toBe('AND');
    expect(screen.getByTestId('group-operation-1').textContent).toBe('AND');

    expect(card0.getByTestId('service-group').textContent).toBe('Group1');
    expect(card0.getAllByTestId(/service-/i)).toHaveLength(3);
    expect(card0.getByTestId('service-0').textContent).toBe('AMGA');
    expect(card0.getByTestId('service-1').textContent).toBe('APEL');
    expect(card0.getAllByTestId(/operation-/i)).toHaveLength(2);
    expect(card0.getByTestId('operation-0').textContent).toBe('OR');
    expect(card0.getByTestId('operation-1').textContent).toBe('OR');
    expect(card0.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card0.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card0.getByTestId('operation').textContent).toBe('AND');

    expect(card1.getByTestId('service-group').textContent).toBe('Group2');
    expect(card1.getAllByTestId(/service-/i)).toHaveLength(3);
    expect(card1.getByTestId('service-0').textContent).toBe('VOMS');
    expect(card1.getByTestId('service-1').textContent).toBe('argo.api');
    expect(card1.getAllByTestId(/operation-/i)).toHaveLength(2);
    expect(card1.getByTestId('operation-0').textContent).toBe('OR');
    expect(card1.getByTestId('operation-1').textContent).toBe('OR');
    expect(card1.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card1.queryByTestId(/insert/i)).not.toBeInTheDocument();
    expect(card1.getByTestId('operation').textContent).toBe('AND');

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new group' })).not.toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  })
})