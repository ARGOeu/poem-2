import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Backend, WebApi, fetchTenantsMetricProfiles } from '../DataManager';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import {
  MetricProfilesChange,
  MetricProfilesList,
  MetricProfilesClone,
  MetricProfileVersionDetails
} from '../MetricProfiles';
import { NotificationManager } from 'react-notifications'
import useEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn(),
    fetchTenantsMetricProfiles: jest.fn()
  }
})

jest.setTimeout(20000);

const mockChangeMetricProfileBackend = jest.fn(() => Promise.resolve({}))
const mockChangeMetricProfile = jest.fn();
const mockDeleteMetricProfileBackend = jest.fn(() => Promise.resolve({}))
const mockDeleteMetricProfile = jest.fn();
const mockAddMetricProfileBackend = jest.fn(() => Promise.resolve({}));
const mockAddMetricProfile = jest.fn();
const mockFetchAggregationProfiles = jest.fn()
const mockFetchReports = jest.fn()


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


const mockMetricProfiles = [
  {
    name: 'ARGO-MON',
    description: '',
    apiid: '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: 'ARGO'
  },
  {
    name: 'TEST_PROFILE',
    description: 'Description of TEST_PROFILE',
    apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: ''
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
    pk: '1',
    groups: {
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['ARGO', 'TEST'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    },
    token: "m0ck_t0k3n",
    tenantdetails: {
      combined: false
    }
  }
}

const mockWebApiMetricProfile = {
  id: "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv",
  date: "2021-02-03",
  name: "ARGO_MON",
  description: "Central ARGO-MON profile",
  services: [
    {
      service: "argo.mon",
      metrics: [
        "eu.egi.CertValidity",
        "org.nagios.NagiosWebInterface"
      ]
    },
    {
      service: "argo.webui",
      metrics: [
        "org.nagios.ARGOWeb-AR",
        "org.nagios.ARGOWeb-Status"
      ]
    },
    {
      service: "Central-LFC",
      metrics: [
        "ch.cern.LFC-Ping",
        "ch.cern.LFC-Read",
        "ch.cern.LFC-Write"
      ]
    }
  ]
};

const mockWebApiMetricProfile2 = {
  id: "uiwee7um-cq51-pez2-6g85-aeghei1yeeph",
  date: "2021-02-03",
  name: "ARGO_MON2",
  description: "Central ARGO-MON profile",
  services: [
    {
      service: "argo.mon",
      metrics: [
        "eu.egi.CertValidity",
        "org.nagios.NagiosWebInterface"
      ]
    },
    {
      service: "argo.webui",
      metrics: [
        "org.nagios.ARGOWeb-AR",
        "org.nagios.ARGOWeb-Status"
      ]
    },
    {
      service: "Central-LFC",
      metrics: [
        "ch.cern.LFC-Ping",
        "ch.cern.LFC-Read",
        "ch.cern.LFC-Write"
      ]
    }
  ]
};

const mockWebApiMetricProfileTenant1 = [
  {
    id: "11111",
    date: "2023-03-27",
    name: "TENANT1-PROFILE1",
    description: "",
    services: [
      {
        service: "b2access.unity",
        metrics: [
          "eudat.b2access.unity.login-certificate",
          "eudat.b2access.unity.login-local"
        ]
      },
      {
        service: "b2drop.nextcloud",
        metrics: [
          "generic.tcp.connect"
        ]
      }
    ]
  },
  {
    id: "2222",
    date: "2023-03-27",
    name: "TENANT1-PROFILE2",
    description: "",
    services: [
      {
        service: "b2handle.handle.api",
        metrics: [
          "eudat.b2handle.handle.api-crud",
          "eudat.b2handle.handle.api-healthcheck-resolve",
          "generic.tcp.connect"
        ]
      }
    ]
  }
]

const mockWebApiMetricProfileTenant2 = [
  {
    id: "3333",
    date: "2023-03-27",
    name: "PROFILE3",
    description: "",
    services: [
      {
        service: "generic.json",
        metrics: [
          "generic.http.json"
        ]
      },
      {
        service: "generic.oai-pmh",
        metrics: [
          "generic.oai-pmh.validity"
        ]
      },
      {
        service: "portal.services.url",
        metrics: [
          "generic.http.connect",
          "generic.certificate.validity"
        ]
      }
    ]
  }
] 

const mockBackendMetricProfile = {
  name: 'ARGO_MON',
  description: 'Central ARGO-MON profile',
  apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
  groupname: 'ARGO'
};

const mockBackendMetricProfile2 = {
  name: 'ARGO_MON2',
  description: 'Central ARGO-MON profile',
  apiid: 'uiwee7um-cq51-pez2-6g85-aeghei1yeeph',
  groupname: 'ARGO'
};

const mockMetrics = [
  "argo.AMS-Check",
  'argo.AMSPublisher-Check',
  "ch.cern.HTCondorCE-JobState",
  "ch.cern.HTCondorCE-JobSubmit",
  "ch.cern.HTCondorCE-JobSubmit",
  "ch.cern.LFC-Ping",
  "ch.cern.LFC-Read",
  "ch.cern.LFC-Write",
  "eu.egi.CertValidity",
  "eu.egi.sec.CREAMCE",
  "org.nagios.ARGOWeb-AR",
  "org.nagios.ARGOWeb-Status",
  "org.nagios.NagiosWebInterface",
  "org.nagiosexchange.AppDB-WebCheck"
];

const mockWebApiServiceTypes = [
  {
    "name": "ARC-CE",
    "description": "[Site service] The Compute Element within the ARC middleware stack."
  },
  {
    "name": "argo.mon",
    "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service."
  },
  {
    "name": "argo.webui",
    "description": "ARGO web user interface for metric A/R visualization and recalculation management."
  },
  {
    "name": "Central-LFC",
    "description": "ARGO web user interface for metric A/R visualization and recalculation management."
  },
  {
    "name": "egi.AppDB",
    "description": "EGI Applications Database"
  },
  {
    "name": "eu.argo.ams",
    "description": "The ARGO Messaging Service (AMS) is a Publish/Subscribe Service, which implements the Google PubSub protocol."
  },
  {
    "name": "org.opensciencegrid.htcondorce",
    "description": "A special configuration of the HTCondor software designed to be a job gateway solution for the OSG"
  }
];

const mockMetricProfileVersions = [
  {
    id: '8',
    object_repr: 'TEST_PROFILE2',
    fields: {
      name: 'TEST_PROFILE2',
      groupname: 'NEW_GROUP',
      description: '',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      metricinstances: [
        { service: 'AMGA', metric: 'org.nagios.SAML-SP' },
        { service: 'APEL', metric: 'org.apel.APEL-Pub' }
      ]
    },
    user: 'testuser',
    date_created: '2021-04-13 09:50:48',
    comment: 'Deleted service-metric instance tuple (APEL, org.apel.APEL-Sync). Changed groupname and name.',
    version: '20210413-095048'
  },
  {
    id: '3',
    object_repr: 'TEST_PROFILE',
    fields: {
      name: 'TEST_PROFILE',
      groupname: 'EGI',
      description: '',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      metricinstances: [
        { service: 'AMGA', metric: 'org.nagios.SAML-SP' },
        { service: 'APEL', metric: 'org.apel.APEL-Pub' },
        { service: 'APEL', metric: 'org.apel.APEL-Sync' }
      ]
    },
    user: 'testuser',
    date_created: '2020-12-14 08:53:23',
    comment: 'Initial version.',
    version: '20201214-085323'
  }
];

const mockAggregationProfiles = [
  {
    id: "00000000-1111-1111-1111-222222222222",
    date: "2023-01-18",
    name: "aggr1",
    endpoint_group: "servicegroups",
    metric_operation: "AND",
    profile_operation: "AND",
    metric_profile: {
      name: "ARGO_MON",
      id: "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv"
    },
    groups: [
      {
        name: "argo",
        operation: "OR",
        services: [
          {
            name: "argo.mon",
            operation: "OR"
          },
          {
            name: "argo.webui",
            operation: "OR"
          }
        ]
      },
      {
        name: "lfc",
        operation: "OR",
        services: [
          {
            name: "Central-LFC",
            operation: "OR"
          }
        ]
      }
    ]
  },
  {
    id: "99999999-1111-1111-1111-222222222222",
    date: "2023-01-18",
    name: "aggr2",
    endpoint_group: "servicegroups",
    metric_operation: "AND",
    profile_operation: "AND",
    metric_profile: {
      name: "ARGO_MON2",
      id: "uiwee7um-cq51-pez2-6g85-aeghei1yeeph"
    },
    groups: [
      {
        name: "argo",
        operation: "OR",
        services: [
          {
            name: "argo.mon",
            operation: "OR"
          },
          {
            name: "argo.webui",
            operation: "OR"
          }
        ]
      },
      {
        name: "lfc",
        operation: "OR",
        services: [
          {
            name: "Central-LFC",
            operation: "OR"
          }
        ]
      }
    ]
  }
]

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
  }
]


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}metricprofiles`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <MetricProfilesList
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
              publicView={ true }
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
            <MetricProfilesList
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView=false, combined=false) {
  const route = `/ui/${publicView ? 'public_' : ''}metricprofiles/ARGO_MON`;

  let tenants = {}
  if (combined && !publicView)
    tenants = { TENANT1: "mock_tenant1_token", TENANT2: "mock_tenant2_token" }

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_metricprofiles/:name"
                element={
                  <MetricProfilesChange
                    webapimetric='https://mock.metrics.com'
                    webapitoken='token'
                    tenantname='TENANT'
                    publicView={ true }
                    tenantDetails={{
                      combined: combined,
                      tenants: tenants
                    }}
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
                path="/ui/metricprofiles/:name"
                element={
                  <MetricProfilesChange
                    webapimetric='https://mock.metrics.com'
                    webapiaggregation="https://mock.aggregation.com"
                    webapireports={{
                      main: 'https://reports.com',
                      tags: 'https://reports-tags.com',
                      topologygroups: 'https://topology-groups.com',
                      topologyendpoints: 'https://endpoints.com'
                    }}
                    webapitoken='token'
                    tenantname='TENANT'
                    tenantDetails={{
                      combined: combined,
                      tenants: tenants
                    }}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddView(combined=false) {
  const route = '/ui/metricprofiles/add';

  if (combined)
    return {
      ...render(
        <QueryClientProvider client={ queryClient }>
          <MemoryRouter initialEntries={ [ route ] }>
            <MetricProfilesChange
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
              tenantname='TENANT'
              addview={ true }
              tenantDetails={ {
                combined: combined,
                tenants: {
                  TENANT1: "mock_tenant1_token",
                  TENANT2: "mock_tenant2_token"
                }
              } }
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
            <MetricProfilesChange
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
              tenantname='TENANT'
              addview={ true }
              tenantDetails={ {
                combined: combined,
                tenants: {}
              } }
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderCloneView(combined=false) {
  const route = '/ui/metricprofiles/ARGO_MON2/clone';

  let tenants = {}
  if (combined)
    tenants = { TENANT1: "mock_tenant1_token", TENANT2: "mock_tenant2_token" }

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/metricprofiles/:name/clone"
              element={
                <MetricProfilesClone
                  webapimetric='https://mock.metrics.com'
                  webapitoken='token'
                  tenantname='TENANT'
                  tenantDetails={ {
                    combined: combined,
                    tenants: tenants
                  } }
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView() {
  const route = '/ui/metricprofiles/TEST_PROFILE/history/20201214-085323';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path='/ui/metricprofiles/:name/history/:version'
              element={
                <MetricProfileVersionDetails />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Tests for metric profiles listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockMetricProfiles),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select metric profile to change');

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1ARGO-MONARGO');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/metricprofiles/ARGO-MON');
    expect(screen.getByRole('row', { name: /test/i }).textContent).toBe('2TEST_PROFILEDescription of TEST_PROFILE');
    expect(screen.getByRole('link', { name: /test/i }).closest('a')).toHaveAttribute('href', '/ui/metricprofiles/TEST_PROFILE')

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/metricprofiles/add')
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select metric profile for details');

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /argo/i }).textContent).toBe('1ARGO-MONARGO');
    expect(screen.getByRole('link', { name: /argo/i }).closest('a')).toHaveAttribute('href', '/ui/public_metricprofiles/ARGO-MON');
    expect(screen.getByRole('row', { name: /test/i }).textContent).toBe('2TEST_PROFILEDescription of TEST_PROFILE');
    expect(screen.getByRole('link', { name: /test/i }).closest('a')).toHaveAttribute('href', '/ui/public_metricprofiles/TEST_PROFILE')

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Tests for metric profiles changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'warning');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    mockFetchAggregationProfiles.mockImplementation(() => Promise.resolve([mockAggregationProfiles[1]]))
    mockFetchReports.mockImplementation(() => Promise.resolve([mockReports[1]]))
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile),
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
        fetchAggregationProfiles: mockFetchAggregationProfiles,
        fetchReports: mockFetchReports,
        changeMetricProfile: mockChangeMetricProfile,
        deleteMetricProfile: mockDeleteMetricProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        changeMetricProfile: mockChangeMetricProfileBackend,
        deleteMetricProfile: mockDeleteMetricProfileBackend
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)

    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);
    const row1 = within(rows[2])
    const row2 = within(rows[3])
    const row3 = within(rows[4])
    const row4 = within(rows[5])
    const row5 = within(rows[6])
    const row6 = within(rows[7])
    const row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-AR")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metricprofiles/ARGO_MON/clone');
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  })

  test('Test that page renders properly for combined tenant', async () => {
    renderChangeView(false, true)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)

    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);
    const row1 = within(rows[2])
    const row2 = within(rows[3])
    const row3 = within(rows[4])
    const row4 = within(rows[5])
    const row5 = within(rows[6])
    const row6 = within(rows[7])
    const row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-AR")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metricprofiles/ARGO_MON/clone');
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  })

  test('Test filtering of metric instances', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    const searchRow = within(rows[1]).getAllByRole('textbox');
    const searchServiceFlavour = searchRow[0];
    const searchMetric = searchRow[1];
    await waitFor(() => {
      fireEvent.change(searchServiceFlavour, { target: { value: 'lfc' } });
    })
    expect(metricInstances.getAllByRole('row')).toHaveLength(5);

    await waitFor(() => {
      fireEvent.change(searchMetric, { target: { value: 'write' } });
    })
    const newRows = metricInstances.getAllByRole('row');
    expect(newRows).toHaveLength(3);

    const row1 = within(newRows[2])
    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(1);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(1);
    expect(row1.getByText("Central-LFC")).toBeInTheDocument()
    expect(row1.getByText("ch.cern.LFC-Write")).toBeInTheDocument()
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Metric profile details');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeDisabled();

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    expect(within(rows[2]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[3]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[4]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[5]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[6]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[7]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[8]).queryAllByRole('textbox')).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/remove-/i)).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/insert-/i)).toHaveLength(0);

    expect(rows[2].textContent).toBe('1argo.moneu.egi.CertValidity')
    expect(rows[3].textContent).toBe('2argo.monorg.nagios.NagiosWebInterface')
    expect(rows[4].textContent).toBe('3argo.webuiorg.nagios.ARGOWeb-AR')
    expect(rows[5].textContent).toBe('4argo.webuiorg.nagios.ARGOWeb-Status')
    expect(rows[6].textContent).toBe('5Central-LFCch.cern.LFC-Ping')
    expect(rows[7].textContent).toBe('6Central-LFCch.cern.LFC-Read')
    expect(rows[8].textContent).toBe('7Central-LFCch.cern.LFC-Write')

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly for combined tenant', async () => {
    renderChangeView(true, true);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Metric profile details');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeDisabled();

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    expect(within(rows[2]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[3]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[4]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[5]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[6]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[7]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[8]).queryAllByRole('textbox')).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/remove-/i)).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/insert-/i)).toHaveLength(0);

    expect(rows[2].textContent).toBe('1argo.moneu.egi.CertValidity')
    expect(rows[3].textContent).toBe('2argo.monorg.nagios.NagiosWebInterface')
    expect(rows[4].textContent).toBe('3argo.webuiorg.nagios.ARGOWeb-AR')
    expect(rows[5].textContent).toBe('4argo.webuiorg.nagios.ARGOWeb-Status')
    expect(rows[6].textContent).toBe('5Central-LFCch.cern.LFC-Ping')
    expect(rows[7].textContent).toBe('6Central-LFCch.cern.LFC-Read')
    expect(rows[8].textContent).toBe('7Central-LFCch.cern.LFC-Write')

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test('Test filtering of metric instances on public page', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    const searchRow = within(rows[1]).getAllByRole('textbox');
    const searchServiceFlavour = searchRow[0];
    const searchMetric = searchRow[1];
    await waitFor(() => {
      fireEvent.change(searchServiceFlavour, { target: { value: 'lfc' } });
    })
    expect(metricInstances.getAllByRole('row')).toHaveLength(5);

    await waitFor(() => {
      fireEvent.change(searchMetric, { target: { value: 'write' } });
    })
    const newRows = metricInstances.getAllByRole('row');
    expect(newRows).toHaveLength(3);

    expect(metricInstances.queryAllByTestId(/remove-/i)).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/insert-/i)).toHaveLength(0);
    expect(newRows[2].textContent).toBe('1Central-LFCch.cern.LFC-Write');
  })

  test("Test change main profile info", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId("name")
    const descriptionField = screen.getByLabelText(/description/i);

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON",
      description: "Central ARGO-MON profile"
    })

    fireEvent.change(nameField, { target: { value: "ARGO_MON_TEST" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Central ARGO-MON profile"
    })

    expect(screen.getByText("ARGO")).toBeInTheDocument()
    expect(screen.queryByText("TEST")).not.toBeInTheDocument()

    fireEvent.change(descriptionField, { target: { value: "Now it is used for testing" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Now it is used for testing"
    })

    expect(screen.getByText("ARGO")).toBeInTheDocument()
    expect(screen.queryByText("TEST")).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText("ARGO"), "TEST")

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Now it is used for testing"
    })

    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()
    expect(screen.queryByText("TEST")).toBeInTheDocument()
  })

  test("Test changing tuples", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))

    await waitFor(() => fireEvent.click(screen.getByTestId("remove-2")))
    

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    var rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(8)
    var row1 = within(rows[2])
    var row2 = within(rows[3])
    var row3 = within(rows[4])
    var row4 = within(rows[5])
    var row5 = within(rows[6])
    var row6 = within(rows[7])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("insert-3"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    var row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getAllByText("Select...")).toHaveLength(2)
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(row5.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row5.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row5.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    fireEvent.click(metricInstances.getByTestId("insert-0"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(10)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    var row8 = within(rows[9])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getAllByText("Select...")).toHaveLength(2)
    expect(row3.getByText("argo.mon")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row6.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row8.getByText("Central-LFC")).toBeInTheDocument()
    expect(row8.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "Central-LFC")
    })
    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "ch.cern.LFC-Write")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-7"))
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(metricInstances.getByTestId("insert-0"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(10)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    row8 = within(rows[9])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getAllByText("Select...")).toHaveLength(2)
    expect(row3.getByText("Central-LFC")).toBeInTheDocument()
    expect(row3.getByText("ch.cern.LFC-Write")).toBeInTheDocument()
    expect(row4.getByText("argo.mon")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row5.getByText("argo.webui")).toBeInTheDocument()
    expect(row5.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row7.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row7.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row8.getByText("Central-LFC")).toBeInTheDocument()
    expect(row8.getByText("ch.cern.LFC-Read")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "Central-LFC")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "ch.cern.LFC-Write")
    })

    await waitFor(() => {
      expect(screen.queryAllByText(/duplicated/i)).toHaveLength(2)
    })

    await waitFor(() => {
      selectEvent.select(row2.getByText("ch.cern.LFC-Write"), "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(10)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    row8 = within(rows[9])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("Central-LFC")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row3.getByText("Central-LFC")).toBeInTheDocument()
    expect(row3.getByText("ch.cern.LFC-Write")).toBeInTheDocument()
    expect(row4.getByText("argo.mon")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row5.getByText("argo.webui")).toBeInTheDocument()
    expect(row5.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row7.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row7.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row8.getByText("Central-LFC")).toBeInTheDocument()
    expect(row8.getByText("ch.cern.LFC-Read")).toBeInTheDocument()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-7"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-6"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-5"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-4"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-3"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-2"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-1"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-0"))
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getAllByText("Select...")).toHaveLength(2)
  })

  test('Test import csv successfully', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobState\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);
    const row1 = within(rows[2])
    const row2 = within(rows[3])

    expect(row1.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row1.getByText("ch.cern.HTCondorCE-JobState")).toBeInTheDocument()
    expect(row2.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row2.getByText("ch.cern.HTCondorCE-JobSubmit")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(screen.queryByText('Must be one of predefined metrics')).not.toBeInTheDocument()

  })

  test('Test import csv with nonexisting metrics', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-CertValidity\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);
    const row1 = within(rows[2])
    const row2 = within(rows[3])
    expect(row1.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row1.getByText("ch.cern.HTCondorCE-CertValidity")).toBeInTheDocument()
    expect(row2.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row2.getByText("ch.cern.HTCondorCE-JobSubmit")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(screen.getByText('Must be one of predefined metrics')).toBeInTheDocument()
  })

  test('Test export csv successfully', async () => {
    const helpers = require('../FileDownload');
    jest.spyOn(helpers, 'downloadCSV').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

    const content = 'service,metric\r\nargo.mon,eu.egi.CertValidity\r\nargo.mon,org.nagios.NagiosWebInterface\r\nargo.webui,org.nagios.ARGOWeb-AR\r\nargo.webui,org.nagios.ARGOWeb-Status\r\nCentral-LFC,ch.cern.LFC-Ping\r\nCentral-LFC,ch.cern.LFC-Read\r\nCentral-LFC,ch.cern.LFC-Write';

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1);
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, 'ARGO_MON.csv');
  })

  test('Test export csv when form has been changed', async () => {
    const helpers = require('../FileDownload');
    jest.spyOn(helpers, 'downloadCSV').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole('table'));

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-6'))
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-5'))
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-4'))
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-3'))
    })

    const rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[6])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "org.opensciencegrid.htcondorce")
    })
    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "ch.cern.HTCondorCE-JobState")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    await waitFor(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));
    })

    const content = 'service,metric\r\nargo.mon,eu.egi.CertValidity\r\nargo.mon,org.nagios.NagiosWebInterface\r\nargo.webui,org.nagios.ARGOWeb-AR\r\nargo.webui,org.nagios.ARGOWeb-Status\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobState'

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1);
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, 'ARGO_MON.csv')
  })

  test('Test error changing metric profile on web api with error message', async () => {
    mockChangeMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).not.toHaveBeenCalled()
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

  test('Test error changing metric profile on web api without error message', async () => {
    mockChangeMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })
    
    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing metric profile on internal api with error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )
    mockChangeMetricProfileBackend.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been error in the backend.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3])
    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })
    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been error in the backend.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing metric profile on internal api without error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )
    mockChangeMetricProfileBackend.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'))
    })

    fireEvent.click(screen.getByTestId('insert-0'))

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully changing and saving metric profile', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully changed', 'Changed', 2000
    )
  })

  test('Test successfully changing and saving metric profile with info on imported metrics', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ 
        imported: "Metric ch.cern.LFC-Write has been imported"
      })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric profile successfully changed\nMetric ch.cern.LFC-Write has been imported", 
      'Changed', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully changing and saving metric profile with info on metrics with warning', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ 
        warning: "Metric ch.cern.LFC-Write has been imported with package version used by TEST tenant"
      })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric profile successfully changed",
      'Changed', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Write has been imported with package version used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully changing and saving metric profile with info on unavailable metrics', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ 
        unavailable: "Metric ch.cern.LFC-Write not available for package used by TEST tenant"
      })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric profile successfully changed",
      'Changed', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Write not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully changing and saving metric profile with info on deleted metrics', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ 
        deleted: "Metric mock.metric.name has been deleted"
      })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric profile successfully changed\nMetric mock.metric.name has been deleted",
      'Changed', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully changing and saving metric profile with various info on metrics', async () => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ 
        imported: "Metric ch.cern.LFC-Write has been imported",
        warning: "Metric ch.cern.LFC-Ping has been imported with package version used by TEST tenant",
        unavailable: "Metric ch.cern.LFC-Read not available for package used by TEST tenant",
        deleted: "Metric mock.metric.name has been deleted"
      })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await  waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric profile successfully changed\nMetric ch.cern.LFC-Write has been imported\nMetric mock.metric.name has been deleted",
      'Changed', 
      2000
    )
    expect(NotificationManager.warning).toBeCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Ping has been imported with package version used by TEST tenant</p>
        <p>Metric ch.cern.LFC-Read not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test import csv, make some changes and save profile', async() => {
    mockChangeMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobState\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    await waitFor(() => {
      expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4)
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'org.opensciencegrid.htcondorce',
            metrics: [
              'ch.cern.HTCondorCE-JobState',
              'ch.cern.HTCondorCE-JobSubmit'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'org.opensciencegrid.htcondorce', metric: 'ch.cern.HTCondorCE-JobState' },
            { service: 'org.opensciencegrid.htcondorce', metric: 'ch.cern.HTCondorCE-JobSubmit' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
  })

  test("Test save data if view filtered", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole('table'))
    var rows = metricInstances.getAllByRole('row')

    const searchRow = within(rows[1]).getAllByRole('textbox')
    const searchServiceFlavour = searchRow[0]
    await waitFor(() => {
      fireEvent.change(searchServiceFlavour, { target: { value: 'lfc' } });
    })

    fireEvent.click(metricInstances.getByTestId("remove-1"))

    fireEvent.click(metricInstances.getByTestId("insert-1"))

    rows = metricInstances.getAllByRole("row")
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "ARC-CE")
    })
    
    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeMetricProfile).toHaveBeenCalledWith({
        id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
        description: 'Central ARGO-MON profile',
        name: 'ARGO_MON',
        services: [
          {
            service: "ARC-CE",
            metrics: [
              "argo.AMS-Check"
            ]
          },
          {
            service: "argo.mon",
            metrics: [
              "eu.egi.CertValidity",
              "org.nagios.NagiosWebInterface"
            ]
          },
          {
            service: "argo.webui",
            metrics: [
              "org.nagios.ARGOWeb-AR",
              "org.nagios.ARGOWeb-Status"
            ]
          },
          {
            service: "Central-LFC",
            metrics: [
              "ch.cern.LFC-Ping",
              "ch.cern.LFC-Write"
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'ARGO',
          description: 'Central ARGO-MON profile',
          services: [
            { service: "ARC-CE", metric: "argo.AMS-Check" },
            { service: "argo.mon", metric: "eu.egi.CertValidity" },
            { service: "argo.mon", metric: "org.nagios.NagiosWebInterface" },
            { service: "argo.webui", metric: "org.nagios.ARGOWeb-AR" },
            { service: "argo.webui", metric: "org.nagios.ARGOWeb-Status" },
            { service: "Central-LFC", metric: "ch.cern.LFC-Ping" },
            { service: "Central-LFC", metric: "ch.cern.LFC-Write" },
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
  })

  test('Test successfully deleting metric profile', async () => {
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).toHaveBeenCalledWith(
        "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv"
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully deleted', 'Deleted', 2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully deleting metric profile with info on deleted metrics', async () => {
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockDeleteMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        deleted: "Metric mock.metric.name has been deleted"
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).toHaveBeenCalledWith(
        "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv"
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully deleted\nMetric mock.metric.name has been deleted', 
      'Deleted', 
      2000
    )
  })

  test("Test deleting metric profile when associated with aggregation profile", async () => {
    mockFetchAggregationProfiles.mockReturnValueOnce(mockAggregationProfiles)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteMetricProfile).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledTimes(1)
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Metric profile is associated with aggregation profile: aggr1</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )
  })

  test("Test delete metric profile when associated with report", async () => {
    mockFetchReports.mockReturnValueOnce(mockReports)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteMetricProfile).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledTimes(1)
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Metric profile is associated with report: CORE</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )
  })

  test("Test delete metric profile when associated both with aggregation profile and report", async () => {
    mockFetchAggregationProfiles.mockReturnValueOnce(mockAggregationProfiles)
    mockFetchReports.mockReturnValueOnce(mockReports)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteMetricProfile).not.toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledTimes(2)

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Metric profile is associated with aggregation profile: aggr1</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Metric profile is associated with report: CORE</p>
        <p>Click to dismiss.</p>
      </div>,
      "Unable to delete",
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on web api with error message', async () => {
    mockDeleteMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).not.toHaveBeenCalled()
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

  test('Test error deleting metric profile on web api without error message', async () => {
    mockDeleteMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on internal backend with error message', async () => {
    mockDeleteMetricProfileBackend.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an internal error.')
    } );
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).toHaveBeenCalledWith(
        "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an internal error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on internal backend without error message', async () => {
    mockDeleteMetricProfileBackend.mockImplementationOnce( () => { throw Error() } );
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteMetricProfile).toHaveBeenCalledWith('va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv');
    })

    await waitFor(() => {
      expect(mockDeleteMetricProfileBackend).toHaveBeenCalledWith(
        "va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for metric profile addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, "warning")
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        addMetricProfile: mockAddMetricProfile,
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
        fetchAggregationProfiles: () => Promise.resolve(mockAggregationProfiles),
        fetchReports: () => Promise.resolve(mockReports)
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        addMetricProfile: mockAddMetricProfileBackend
      }
    })
    fetchTenantsMetricProfiles.mockImplementation(() => {
      return {
        TENANT1: mockWebApiMetricProfileTenant1,
        TENANT2: mockWebApiMetricProfileTenant2
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getAllByText("Select...")[0]

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();

    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGO')).toBeInTheDocument()
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[2]).getAllByText("Select...")).toHaveLength(2)

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).toBeInTheDocument();
  })

  test('Test that page renders properly for combined tenant', async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getAllByText("Select...")[0]

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();

    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGO')).toBeInTheDocument()
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).toBeInTheDocument()
    expect(screen.queryAllByLabelText(/profile/i)).toHaveLength(2)

    expect(screen.queryByText("TENANT1-PROFILE1")).not.toBeInTheDocument()
    expect(screen.queryByText("TENANT1-PROFILE2")).not.toBeInTheDocument()
    expect(screen.queryByText("PROFILE3")).not.toBeInTheDocument()

    selectEvent.openMenu(screen.queryAllByLabelText(/profile/i)[0])
    expect(screen.queryByText("TENANT1-PROFILE1")).toBeInTheDocument()
    expect(screen.queryByText("TENANT1-PROFILE2")).toBeInTheDocument()
    expect(screen.queryByText("PROFILE3")).not.toBeInTheDocument()

    selectEvent.openMenu(screen.queryAllByLabelText(/profile/i)[1])
    expect(screen.queryByText("PROFILE3")).toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[2]).getAllByText("Select...")).toHaveLength(2)

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).toBeInTheDocument();
  })

  test("Test add main profile info", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "ARGO_MON_TEST" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: ""
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Profile used for testing" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Profile used for testing"
    })

    await selectEvent.select(screen.getAllByText("Select...")[0], "TEST")

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Profile used for testing"
    })

    expect(screen.getByText("TEST")).toBeInTheDocument()
    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()
  })

  test("Test adding tuples", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))
    var rows = metricInstances.getAllByRole("row")
    var row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.egi.CertValidity")

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("insert-0"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    row1 = within(rows[2])
    row2 = within(rows[3])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("insert-1"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(5)
    var row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      expect(screen.queryAllByText(/duplicated/i)).toHaveLength(2)
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(7)
    row1 = within(rows[2])
    row2 = within(rows[4])
    row3 = within(rows[5])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row3.getByText("argo.mon")).toBeInTheDocument()
    expect(row3.getByText("eu.egi.CertValidity")).toBeInTheDocument()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-2"))
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    row1 = within(rows[2])
    row2 = within(rows[3])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-1"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-0"))
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getAllByText("Select...")).toHaveLength(2)
  })

  test("Test import csv successfully", async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobState\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);
    const row1 = within(rows[2])
    const row2 = within(rows[3])

    expect(row1.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row1.getByText("ch.cern.HTCondorCE-JobState")).toBeInTheDocument()
    expect(row2.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row2.getByText("ch.cern.HTCondorCE-JobSubmit")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(screen.queryByText('Must be one of predefined metrics')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: "org.opensciencegrid.htcondorce",
            metrics: [
              "ch.cern.HTCondorCE-JobState",
              "ch.cern.HTCondorCE-JobSubmit"
            ]
          }
        ]
      })
    })
  })

  test("Test import csv with nonexisting metrics", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-CertValidity\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);
    const row1 = within(rows[2])
    const row2 = within(rows[3])

    expect(row1.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row1.getByText("ch.cern.HTCondorCE-CertValidity")).toBeInTheDocument()
    expect(row2.getByText("org.opensciencegrid.htcondorce")).toBeInTheDocument()
    expect(row2.getByText("ch.cern.HTCondorCE-JobSubmit")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(screen.queryByText('Must be one of predefined metrics')).toBeInTheDocument()
  })

  test("Test import csv, make some changes and save profile successfully", async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /import/i }));

    const csv = 'service,metric\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobState\r\norg.opensciencegrid.htcondorce,ch.cern.HTCondorCE-JobSubmit\r\n';

    const content = new Blob([csv], { type: 'text/csv;charset=UTF-8' });
    const file = new File([content], 'profile.csv', { type: 'text/csv;charset=UTF-8' });
    const input = screen.getByTestId('file_input');

    await waitFor(() => {
      useEvent.upload(input, file);
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    await waitFor(() => {
      expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4)
    })

    fireEvent.click(screen.getByTestId("insert-0"))

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    expect(screen.queryByText('Must be one of predefined metrics')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: "eu.argo.ams",
            metrics: [
              "argo.AMS-Check"
            ]
          },
          {
            service: "org.opensciencegrid.htcondorce",
            metrics: [
              "ch.cern.HTCondorCE-JobState",
              "ch.cern.HTCondorCE-JobSubmit"
            ]
          }
        ]
      })
    })
  })

  test("Test importing tuples from constituting tenants for combined tenant", async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))
    var rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    var row1 = within(rows[2])

    expect(row1.getAllByText("Select...")).toHaveLength(2)

    await waitFor(() => {
      selectEvent.select(screen.getAllByLabelText(/profile/i)[0], "TENANT1-PROFILE1")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(5)
    row1 = within(rows[2])
    var row2 = within(rows[3])
    var row3 = within(rows[4])

    expect(row1.getByText("b2access.unity")).toBeInTheDocument()
    expect(row1.getByText("eudat.b2access.unity.login-certificate")).toBeInTheDocument()

    expect(row2.getByText("b2access.unity")).toBeInTheDocument()
    expect(row2.getByText("eudat.b2access.unity.login-local")).toBeInTheDocument()

    expect(row3.getByText("b2drop.nextcloud")).toBeInTheDocument()
    expect(row3.getByText("generic.tcp.connect")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(screen.getAllByLabelText(/profile/i)[1], "PROFILE3")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)

    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    var row4 = within(rows[5])
    var row5 = within(rows[6])
    var row6 = within(rows[7])
    var row7 = within(rows[8])

    expect(row1.getByText("b2access.unity")).toBeInTheDocument()
    expect(row1.getByText("eudat.b2access.unity.login-certificate")).toBeInTheDocument()

    expect(row2.getByText("b2access.unity")).toBeInTheDocument()
    expect(row2.getByText("eudat.b2access.unity.login-local")).toBeInTheDocument()

    expect(row3.getByText("b2drop.nextcloud")).toBeInTheDocument()
    expect(row3.getByText("generic.tcp.connect")).toBeInTheDocument()

    expect(row4.getByText("generic.json")).toBeInTheDocument()
    expect(row4.getByText("generic.http.json")).toBeInTheDocument()

    expect(row5.getByText("generic.oai-pmh")).toBeInTheDocument()
    expect(row5.getByText("generic.oai-pmh.validity")).toBeInTheDocument()

    expect(row6.getByText("portal.services.url")).toBeInTheDocument()
    expect(row6.getByText("generic.certificate.validity")).toBeInTheDocument()

    expect(row7.getByText("portal.services.url")).toBeInTheDocument()
    expect(row7.getByText("generic.http.connect")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(screen.getAllByLabelText(/profile/i)[0], "TENANT1-PROFILE2")
    })
    
    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)

    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])

    expect(row1.getByText("b2handle.handle.api")).toBeInTheDocument()
    expect(row1.getByText("eudat.b2handle.handle.api-crud")).toBeInTheDocument()

    expect(row2.getByText("b2handle.handle.api")).toBeInTheDocument()
    expect(row2.getByText("eudat.b2handle.handle.api-healthcheck-resolve")).toBeInTheDocument()

    expect(row3.getByText("b2handle.handle.api")).toBeInTheDocument()
    expect(row3.getByText("generic.tcp.connect")).toBeInTheDocument()

    expect(row4.getByText("generic.json")).toBeInTheDocument()
    expect(row4.getByText("generic.http.json")).toBeInTheDocument()

    expect(row5.getByText("generic.oai-pmh")).toBeInTheDocument()
    expect(row5.getByText("generic.oai-pmh.validity")).toBeInTheDocument()

    expect(row6.getByText("portal.services.url")).toBeInTheDocument()
    expect(row6.getByText("generic.certificate.validity")).toBeInTheDocument()

    expect(row7.getByText("portal.services.url")).toBeInTheDocument()
    expect(row7.getByText("generic.http.connect")).toBeInTheDocument()
  })

  test('Test successfully adding a metric profile', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added', 'Added', 2000
    )
  })

  test('Test successfully adding a metric profile with info on imported metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        imported: "Metric argo.AMS-Check has been imported"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric argo.AMS-Check has been imported', 
      'Added', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully adding a metric profile with info on metrics with warning', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        warning: "Metric argo.AMS-Check has been imported with package version used by TEST tenant"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMS-Check has been imported with package version used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully adding a metric profile with info on unavailable metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        unavailable: "Metric argo.AMS-Check not available for package used by TEST tenant"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMS-Check not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully adding a metric profile with info on deleted metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        deleted: "Metric mock.metric.name has been deleted"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric mock.metric.name has been deleted', 
      'Added', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully adding a metric profile with various info on metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        imported: "Metric org.nagiosexchange.AppDB-WebCheck has been imported",
        warning: "Metric argo.AMS-Check has been imported with package version used by TEST tenant",
        unavailable: "Metric argo.AMSPublisher-Check not available for package used by TEST tenant",
        deleted: "Metric mock.metric.name has been deleted"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })
    
    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric org.nagiosexchange.AppDB-WebCheck has been imported\nMetric mock.metric.name has been deleted', 
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMS-Check has been imported with package version used by TEST tenant</p>
        <p>Metric argo.AMSPublisher-Check not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in web api with error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).not.toHaveBeenCalled()
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

  test('Test error adding a metric profile in web api without error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in backend with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an internal error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an internal error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in backend without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await waitFor(() => {
      selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')
    })

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(metricInstances.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row3.getAllByText("Select...")[1], "argo.AMSPublisher-Check")
    })

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    })

    await waitFor(() => {
      selectEvent.select(row4.getAllByText("Select...")[1], "eu.egi.CertValidity")
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-3'));
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'NEW_PROFILE',
        services: [
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'eu.argo.ams', metric: 'argo.AMSPublisher-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for metric profile cloneview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, "warning")
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile2),
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
        fetchAggregationProfiles: () => Promise.resolve(mockAggregationProfiles),
        fetchReports: () => Promise.resolve(mockReports),
        addMetricProfile: mockAddMetricProfile,
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile2),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        addMetricProfile: mockAddMetricProfileBackend
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(nameField.value).toBe('Cloned ARGO_MON2');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);
    const row1 = within(rows[2])
    const row2 = within(rows[3])
    const row3 = within(rows[4])
    const row4 = within(rows[5])
    const row5 = within(rows[6])
    const row6 = within(rows[7])
    const row7 = within(rows[8])

    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-AR")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(7);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(7);

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test('Test that page renders properly for combined tenant', async () => {
    renderCloneView(true)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');

    expect(nameField.value).toBe('Cloned ARGO_MON2');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText("Combined from")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);
    const row1 = within(rows[2])
    const row2 = within(rows[3])
    const row3 = within(rows[4])
    const row4 = within(rows[5])
    const row5 = within(rows[6])
    const row6 = within(rows[7])
    const row7 = within(rows[8])

    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-AR")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(7);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(7);

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test("Test change main profile info", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "ARGO_MON_TEST" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Central ARGO-MON profile"
    })

    expect(screen.queryByText("ARGO")).toBeInTheDocument()
    expect(screen.queryByText("TEST")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Now it is used for testing" } })

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Now it is used for testing"
    })

    expect(screen.queryByText("ARGO")).toBeInTheDocument()
    expect(screen.queryByText("TEST")).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText("ARGO"), "TEST")

    expect(screen.getByTestId("metricprofiles-form")).toHaveFormValues({
      name: "ARGO_MON_TEST",
      description: "Now it is used for testing"
    })

    expect(screen.queryByText("ARGO")).not.toBeInTheDocument()
    expect(screen.queryByText("TEST")).toBeInTheDocument()
  })

  test("Test changing tuples", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))

    fireEvent.click(screen.getByTestId("remove-2"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    var rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(8)
    var row1 = within(rows[2])
    var row2 = within(rows[3])
    var row3 = within(rows[4])
    var row4 = within(rows[5])
    var row5 = within(rows[6])
    var row6 = within(rows[7])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("insert-3"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    var row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getAllByText("Select...")).toHaveLength(2)
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(row5.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row5.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("argo.mon")).toBeInTheDocument()
    expect(row2.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row3.getByText("argo.webui")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row4.getByText("Central-LFC")).toBeInTheDocument()
    expect(row4.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row5.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row5.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row6.getByText("Central-LFC")).toBeInTheDocument()
    expect(row6.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    fireEvent.click(metricInstances.getByTestId("insert-0"))

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(10)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    var row8 = within(rows[9])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getAllByText("Select...")).toHaveLength(2)
    expect(row3.getByText("argo.mon")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row6.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Read")).toBeInTheDocument()
    expect(row8.getByText("Central-LFC")).toBeInTheDocument()
    expect(row8.getByText("ch.cern.LFC-Write")).toBeInTheDocument()

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "Central-LFC")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "ch.cern.LFC-Write")
    })
    
    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-7"))
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(9)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    row4 = within(rows[5])
    row5 = within(rows[6])
    row6 = within(rows[7])
    row7 = within(rows[8])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("Central-LFC")).toBeInTheDocument()
    expect(row2.getByText("ch.cern.LFC-Write")).toBeInTheDocument()
    expect(row3.getByText("argo.mon")).toBeInTheDocument()
    expect(row3.getByText("org.nagios.NagiosWebInterface")).toBeInTheDocument()
    expect(row4.getByText("argo.webui")).toBeInTheDocument()
    expect(row4.getByText("org.nagios.ARGOWeb-Status")).toBeInTheDocument()
    expect(row5.getByText("Central-LFC")).toBeInTheDocument()
    expect(row5.getByText("ch.cern.LFC-Ping")).toBeInTheDocument()
    expect(row6.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row6.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row7.getByText("Central-LFC")).toBeInTheDocument()
    expect(row7.getByText("ch.cern.LFC-Read")).toBeInTheDocument()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-6"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-5"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-4"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-3"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-2"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-1"))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("remove-0"))
    })

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getAllByText("Select...")).toHaveLength(2)
  })

  test('Test successfully cloning a metric profile', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added', 'Added', 2000
    )
  })

  test('Test successfully cloning a metric profile with info on imported metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        imported: "Metric ch.cern.LFC-Write has been imported"
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric ch.cern.LFC-Write has been imported', 
      'Added', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully cloning a metric profile with info on metrics with warning', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        warning: "Metric ch.cern.LFC-Write has been imported with package version used by TEST tenant"
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Write has been imported with package version used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully cloning a metric profile with info on unavailable metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        unavailable: "Metric ch.cern.LFC-Write not available for package used by TEST tenant"
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Write not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test successfully cloning a metric profile with info on deleted metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        deleted: "Metric mock.metric.name has been deleted"
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric mock.metric.name has been deleted',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).not.toHaveBeenCalled()
  })

  test('Test successfully cloning a metric profile with various info on metrics', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )

    mockAddMetricProfileBackend.mockReturnValueOnce(
      Promise.resolve({
        imported: "Metric ch.cern.LFC-Write has been imported",
        warning: "Metric ch.cern.LFC-Ping has been imported with package version used by TEST tenant",
        unavailable: "Metric ch.cern.LFC-Read not available for package used by TEST tenant",
        deleted: "Metric mock.metric.name has been deleted"
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added\nMetric ch.cern.LFC-Write has been imported\nMetric mock.metric.name has been deleted',
      'Added', 
      2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric ch.cern.LFC-Ping has been imported with package version used by TEST tenant</p>
        <p>Metric ch.cern.LFC-Read not available for package used by TEST tenant</p>
        <p>Click to dismiss.</p>
      </div>,
      "Metrics warning",
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on web api with error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).not.toHaveBeenCalled()
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

  test('Test error cloning metric profile on web api without error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })
    
    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).not.toHaveBeenCalled()
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on internal api with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been error in the backend.')
    } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been error in the backend.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on internal api without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Metric profile Created',
          code: '200'
        },
        data: {
          id: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddMetricProfileBackend.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('remove-1'));
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    })

    await waitFor(() => {
      selectEvent.select(row1.getAllByText("Select...")[1], "argo.AMS-Check")
    })

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    })

    await waitFor(() => {
      selectEvent.select(row2.getAllByText("Select...")[1], "org.nagiosexchange.AppDB-WebCheck")
    })

    await waitFor(() => {
      expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddMetricProfile).toHaveBeenCalledWith({
        description: 'New central ARGO_MON profile.',
        name: 'ARGO_MON',
        services: [
          {
            service: 'argo.mon',
            metrics: [
              'eu.egi.CertValidity'
            ]
          },
          {
            service: 'argo.webui',
            metrics: [
              'org.nagios.ARGOWeb-AR',
              'org.nagios.ARGOWeb-Status'
            ]
          },
          {
            service: 'Central-LFC',
            metrics: [
              'ch.cern.LFC-Ping',
              'ch.cern.LFC-Read',
              'ch.cern.LFC-Write'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          },
          {
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddMetricProfileBackend).toHaveBeenCalledWith(
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test for metric profile version detail page', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockMetricProfileVersions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderVersionDetailsView();

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /test/i }).textContent).toBe('TEST_PROFILE (2020-12-14 08:53:23)')

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeDisabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(5);

    expect(within(rows[2]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[3]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[4]).queryAllByRole('textbox')).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/remove-/i)).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/insert-/i)).toHaveLength(0);

    expect(rows[2].textContent).toBe('1AMGAorg.nagios.SAML-SP');
    expect(rows[3].textContent).toBe('2APELorg.apel.APEL-Pub');
    expect(rows[4].textContent).toBe('3APELorg.apel.APEL-Sync')

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })
})