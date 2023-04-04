import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { Backend, WebApi } from '../DataManager';
import { ReportsList, ReportsChange, ReportsAdd } from '../Reports';
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
const mockChangeReport = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteReport = jest.fn();
const mockAddObject = jest.fn();
const mockAddReport = jest.fn();

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


const mockReports = [
  {
    name: 'Critical',
    description: 'Critical report',
    apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
    groupname: 'ARGO'
  },
  {
    name: 'ops-monitor',
    description: '',
    apiid: 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa',
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
    id: '1',
    groups: {
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['ARGO', 'TEST'],
      reports: ['ARGO', 'TEST'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
};

const mockReport = {
  id: "yee9chel-5o4u-l4j4-410b-eipi3ohrah5i",
  tenant: "EGI",
  disabled: false,
  info: {
    name: "Critical",
    description: "Critical report",
    created: "2018-07-10 14:23:00",
    updated: "2021-05-21 13:56:22"
  },
  thresholds: {
    availability: 80,
    reliability: 85,
    uptime: 0.8,
    unknown: 0.1,
    downtime: 0.1
  },
  topology_schema: {
    group: {
      type: "NGI",
      group: {
        type: "SITES"
      }
    }
  },
  profiles: [
    {
      id: "iethai8e-5nv4-urd2-6frc-eequ1saifoon",
      name: "ARGO_MON_CRITICAL",
      type: "metric"
    },
    {
      id: "goo4nohb-lc8y-l5bj-v991-ohzah8xethie",
      name: "critical",
      type: "aggregation"
    },
    {
      id: "gahjohf1-xx39-e0c9-p0rj-choh6ahziz9e",
      name: "egi_ops",
      type: "operations"
    }
  ],
  filter_tags: [
    {
      name: "certification",
      value: "Certified",
      context: "argo.group.filter.tags"
    },
    {
      name: "infrastructure",
      value: "Production",
      context: "argo.group.filter.tags"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.group.filter.tags"
    },
    {
      name: "production",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "monitored",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "group",
      value: "NGI_AEGIS",
      context: "argo.group.filter.fields"
    },
    {
      name: "subgroup",
      value: "AEGIS11-MISANU",
      context: "argo.group.filter.fields"
    },
    {
      name: "info_ext_GLUE2ComputingShareMappingQueue",
      value: "condor",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "group",
      value: "AEGIS11-MISANU",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "APEL",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "Site-BDII",
      context: "argo.endpoint.filter.fields"
    }
  ]
};

const mockReport2 = {
  id: "yee9chel-5o4u-l4j4-410b-eipi3ohrah5i",
  tenant: "EGI",
  disabled: false,
  info: {
    name: "Critical",
    description: "Critical report",
    created: "2018-07-10 14:23:00",
    updated: "2021-05-21 13:56:22"
  },
  thresholds: {
    availability: 80,
    reliability: 85,
    uptime: 0.8,
    unknown: 0.1,
    downtime: 0.1
  },
  topology_schema: {
    group: {
      type: "NGI",
      group: {
        type: "SITES"
      }
    }
  },
  profiles: [
    {
      id: "iethai8e-5nv4-urd2-6frc-eequ1saifoon",
      name: "ARGO_MON_CRITICAL",
      type: "metric"
    },
    {
      id: "goo4nohb-lc8y-l5bj-v991-ohzah8xethie",
      name: "critical",
      type: "aggregation"
    },
    {
      id: "gahjohf1-xx39-e0c9-p0rj-choh6ahziz9e",
      name: "egi_ops",
      type: "operations"
    }
  ],
  filter_tags: [
    {
      name: "certification",
      value: "Certified",
      context: "argo.group.filter.tags"
    },
    {
      name: "infrastructure",
      value: "Production",
      context: "argo.group.filter.tags"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.group.filter.tags"
    },
    {
      name: "production",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "monitored",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.endpoint.filter.tags"
    }
  ]
};

const mockBackendReport = {
  name: 'Critical',
  description: 'Critical report',
  apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
  groupname: 'ARGO'
};

const mockMetricProfiles = [
  {
    id: "ohs9chu6-kyw3-01gz-6mpl-aso0eish6pek",
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
    id: "il8aimoh-r2ov-05aq-z4l2-uko2moophi9s",
    date: "2021-01-26",
    name: "OPS_MONITOR_RHEL7",
    description: "Profile for monitoring operational tools for RHEL 7",
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
      }
    ]
  },
  {
    id: "iethai8e-5nv4-urd2-6frc-eequ1saifoon",
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
      }
    ]
  }
];

const mockAggregationProfiles = [
  {
  id: "goo4nohb-lc8y-l5bj-v991-ohzah8xethie",
  date: "2021-03-01",
  name: "critical",
  namespace: "",
  endpoint_group: "sites",
  metric_operation: "AND",
  profile_operation: "AND",
  metric_profile: {
    name: "ARGO_MON_CRITICAL",
    id: "iethai8e-5nv4-urd2-6frc-eequ1saifoon"
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
    }
  ]
  },
  {
    id: "ye3ioph5-1ryg-k4ea-e6eb-nei6zoupain2",
    date: "2021-04-20",
    name: "ops-mon-critical",
    namespace: "egi",
    endpoint_group: "sites",
    metric_operation: "AND",
    profile_operation: "AND",
    metric_profile: {
      name: "OPS_MONITOR_RHEL7",
      id: "il8aimoh-r2ov-05aq-z4l2-uko2moophi9s"
    },
    groups: [
      {
        name: "gstat",
        operation: "OR",
        services: [
          {
            name: "egi.GSTAT",
            operation: "OR"
          }
        ]
      },
      {
        name: "vosam",
        operation: "OR",
        services: [
          {
            name: "vo.SAM",
            operation: "OR"
          }
        ]
      }
    ]
  }
];

const mockOperationsProfiles = [
  {
    id: "gahjohf1-xx39-e0c9-p0rj-choh6ahziz9e",
    date: "2015-01-01",
    name: "egi_ops",
    available_states: [
      "OK",
      "WARNING",
      "UNKNOWN",
      "MISSING",
      "CRITICAL",
      "DOWNTIME"
    ],
    defaults: {
      down: "DOWNTIME",
      missing: "MISSING",
      unknown: "UNKNOWN"
    },
    operations: [
      {
        name: "AND",
        truth_table: []
     },
     {
       name: "OR",
       truth_table: []
     }
    ]
  }
];

const mockThresholdsProfiles = [
  {
    "id": "Iesh4Eis-Z6JC-xWK8-O5KG-nae4eephoLah",
    "date": "2021-12-07",
    "name": "TEST_PROFILE",
    "rules": [
     {
      "host": "alice09.spbu.ru",
      "metric": "argo.CE-Check",
      "thresholds": "freshness=1s;0:10;9:;0;25 entries=2B;0:;2:"
     },
     {
      "metric": "argo.API-Check",
      "thresholds": "test0=0KB;0:;2:;0;25"
     }
    ]
   },
   {
    "id": "aH9se5aJ-MP2e-3oIF-GQU2-ShoobeeK3ohs",
    "date": "2021-11-04",
    "name": "test-thresholds",
    "rules": [
     {
      "host": "msg-devel.argo.grnet.gr",
      "metric": "org.nagios.ARGOWeb-Status",
      "thresholds": "time=1s;0:0.5;0.5:1;0;10"
     },
     {
      "endpoint_group": "prague_cesnet_lcg2",
      "metric": "org.nagios.BDII-Check",
      "thresholds": "time=1s;0.1:0.2;0.2:0.5;0;10"
     },
     {
      "endpoint_group": "UNI-FREIBURG",
      "metric": "org.nagios.GridFTP-Check",
      "thresholds": "time=1s;0.001:0.2;0.2:0.5;0;10"
     }
    ]
   }
]

const mockReportsTopologyTags = [
  {
    name: "endpoints",
    values: [
      {
        name: "monitored",
        values: [
          "0",
          "1"
        ]
      },
      {
        name: "production",
        values: [
          "0",
          "1"
        ]
      },
      {
        name: "scope",
        values: [
          "alice",
          "cms",
          "EGI",
          "FedCloud",
          "lhcb",
          "tier2",
          "wlcg"
        ]
      },
      {
        name: "info_ID",
        values: [
          "1111G0",
          "2222G0",
          "3333G0",
          "4444G0",
          "xxxxx"
        ]
      },
      {
        name: "info_URL",
        values: [
          "meh",
          "mock_url"
        ]
      },
      {
        name: "info_ext_GLUE2EndpointID",
        values: [
          "ce1.gridpp.ecdf.ed.ac.uk",
          "svr009.gla.scotgrid.ac.uk",
          "t3-mw1.ph.ed.ac.uk"
        ]
      },
      {
        name: "info_ext_GLUE2EndpointImplementationName",
        values: [
          "ARC-CE",
          "nordugrid-arc"
        ]
      },
      {
        name: "vo_a_attr_SE_PATH",
        values: [
          "/dpm/farm.particle.cz/home/a"
        ]
      },
      {
        name: "vo_aaa_attr_SE_PATH",
        values: [
          "/dpm/farm.particle.cz/home/aaa"
        ]
      },
      {
        name: "vo_afigrid_attr_SE_PATH",
        values: [
          "/dpm/fis.puc.cl/home/afigrid"
        ]
      }
    ]
  },
  {
    name: "groups",
    values: [
      {
        name: "certification",
        values: [
          "Candidate",
          "Certified",
          "Closed",
          "Suspended",
          "Uncertified"
        ]
      },
      {
        name: "infrastructure",
        values: [
          "PPS",
          "Production",
          "Test"
        ]
      },
      {
        name: "monitored",
        values: [
          "0",
          "1"
        ]
      },
      {
        name: "scope",
        values: [
          "atlas",
          "cms",
          "EGI",
          "lhcb",
          "Local",
          "SLA",
          "tier2",
          "wlcg"
        ]
      },
      {
        name: "info_ext_GLUE2ComputingShareMappingQueue",
        values: [
          "condor",
          "condor_q2d",
          "eddie"
        ]
      },
      {
        name: "info_ext_GLUE2EndpointImplementationName",
        values: [
          "ARC-CE",
          "nordugrid-arc"
        ]
      }
    ]
  }
];

const mockReportsTopologyEndpoints = [
  {
    date: "2023-03-31",
    group: "NGI_AEGIS_SERVICES",
    type: "SERVICEGROUPS",
    service: "WMS",
    hostname: "wms.example.com",
    notifications: {},
    tags: {
      info_ID: "",
      monitored: "0",
      production: "0",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_AEGIS_SERVICES",
    type: "SERVICEGROUPS",
    service: "Top-BDII",
    hostname: "bdii.example.com",
    notifications: {},
    tags: {
      info_ID: "",
      monitored: "1",
      production: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_BG_SERVICES",
    type: "SERVICEGROUPS",
    service: "Top-BDII",
    hostname: "bdii.test.bg",
    notifications: {},
    tags: {
      info_ID: "",
      monitored: "1",
      production: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_BG_SERVICES",
    type: "SERVICEGROUPS",
    service: "ngi.SAM",
    hostname: "nagios.test.com",
    notifications: {},
    tags: {
      info_ID: "",
      monitored: "1",
      production: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "EGI_NBISBILS_SLA",
    type: "SERVICEGROUPS",
    service: "org.openstack.nova",
    hostname: "openstack.test.com",
    notifications: {},
    tags: {
      info_ID: "",
      monitored: "1",
      production: "1",
      scope: "EGI, wlcg, tier2, alice, cms, FedCloud"
    }
  },
  {
    date: "2023-03-31",
    group: "AEGIS11-MISANU",
    type: "SITES",
    service: "APEL",
    hostname: "cream.test.example.com",
    notifications: {},
    tags: {
      info_ID: "xxxxx",
      monitored: "1",
      production: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "AEGIS11-MISANU",
    type: "SITES",
    service: "Site-BDII",
    hostname: "cream.example.test.com",
    notifications: {},
    tags: {
      info_ID: "xxxxx",
      monitored: "1",
      production: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "CSCS-LCG2",
    type: "SITES",
    service: "SRM",
    hostname: "storage01.test.com",
    notifications: {},
    tags: {
      info_ID: "xxxxx",
      info_bdii_SRM2_PORT: "8443",
      monitored: "1",
      production: "1",
      scope: "EGI, wlcg, tier2, atlas, cms, lhcb"
    }
  }
]

const mockReportsTopologyGroups = [
  {
    date: "2021-06-29",
    group: "EGI",
    type: "PROJECT",
    subgroup: "NGI_AEGIS_SERVICES",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      monitored: "1",
      scope: "EGI"
    }
  },
  {
    date: "2021-06-29",
    group: "EGI",
    type: "PROJECT",
    subgroup: "NGI_ARMGRID_SERVICES",
    tags: {
      monitored: "1",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "EGI",
    type: "PROJECT",
    subgroup: "NGI_BG_SERVICES",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      monitored: "0",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "EGI",
    type: "PROJECT",
    subgroup: "NL_EUDAT_CORE",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      monitored: "1",
      scope: "Local"
    }
  },
  {
    date: "2023-03-31",
    group: "EGI",
    type: "PROJECT",
    subgroup: "EGI_NBISBILS_SLA",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      monitored: "1",
      scope: "EGI, SLA"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_AEGIS",
    type: "NGI",
    subgroup: "AEGIS11-MISANU",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      certification: "Suspended",
      infrastructure: "Production",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_AEGIS",
    type: "NGI",
    subgroup: "AEGIS03-ELEF-LEDA",
    notifications: {
      contacts: [
        "test@egi.eu"
      ]
    },
    tags: {
      certification: "Certified",
      infrastructure: "Production",
      scope: "EGI"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_CH",
    type: "NGI",
    subgroup: "CSCS-LCG2",
    notifications: {
      contacts: [
        "test@ch.ch"
      ]
    },
    tags: {
      certification: "Certified",
      infrastructure: "Production",
      scope: "EGI, wlcg, tier2, atlas, cms, lhcb"
    }
  },
  {
    date: "2023-03-31",
    group: "NGI_CH",
    type: "NGI",
    subgroup: "SWITCH",
    notifications: {
      contacts: [
        "test@ch.ch"
      ]
    },
    tags: {
      certification: "Closed",
      infrastructure: "Test",
      scope: "EGI"
    }
  }
]

const webapireports = {
  main: 'https://reports.com',
  tags: 'https://reports-tags.com',
  topologygroups: 'https://topology-groups.com',
  topologyendpoints: 'https://endpoints.com'
};


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}reports`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_reports'
              render={ props => <ReportsList
                {...props}
                publicView={true}
                webapitoken='public_token'
                webapireports={webapireports}
                webapimetric='https://mock.metric.com'
                webapiaggregation='https://mock.aggr.com'
                webapioperations='https://mock.operations.com'
                webapithresholds='https://mock.thresholds.com'
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
              path='/ui/reports'
              render={ props => <ReportsList
                {...props}
                webapitoken='token'
                webapireports={webapireports}
                webapimetric='https://mock.metric.com'
                webapiaggregation='https://mock.aggr.com'
                webapioperations='https://mock.operations.com'
                webapithresholds='https://mock.thresholds.com'
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}reports/Critical`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_reports/:name'
              render={ props => <ReportsChange
                {...props}
                webapitoken='public_token'
                webapireports={webapireports}
                webapimetric='https://mock.metric.com'
                webapiaggregation='https://mock.aggr.com'
                webapioperations='https://mock.operations.com'
                webapithresholds='https://mock.thresholds.com'
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
              path='/ui/reports/:name'
              render={ props => <ReportsChange
                {...props}
                webapitoken='token'
                webapireports={webapireports}
                webapimetric='https://mock.metric.com'
                webapiaggregation='https://mock.aggr.com'
                webapioperations='https://mock.operations.com'
                webapithresholds='https://mock.thresholds.com'
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = '/ui/reports/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/reports/add'
            render={ props => <ReportsAdd
              {...props}
              webapitoken='token'
              webapireports={webapireports}
              webapimetric='https://mock.metric.com'
              webapiaggregation='https://mock.aggr.com'
              webapioperations='https://mock.operations.com'
              webapithresholds='https://mock.thresholds.com'
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe('Tests for reports listview', () => {
  test('Test that page renders properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockReports),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })

    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Select report to change');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /critical/i }).textContent).toBe('1CriticalCritical reportARGO');
    expect(screen.getByRole('link', { name: /critical/i }).closest('a')).toHaveAttribute('href', '/ui/reports/Critical');
    expect(screen.getByRole('row', { name: /ops/i }).textContent).toBe('2ops-monitor');
    expect(screen.getByRole('link', { name: /ops/i }).closest('a')).toHaveAttribute('href', '/ui/reports/ops-monitor');

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/reports/add');
  })

  test('Test that public page renders properly', async () => {
    renderListView(true)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Select report for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /critical/i }).textContent).toBe('1CriticalCritical reportARGO');
    expect(screen.getByRole('link', { name: /critical/i }).closest('a')).toHaveAttribute('href', '/ui/public_reports/Critical');
    expect(screen.getByRole('row', { name: /ops/i }).textContent).toBe('2ops-monitor');
    expect(screen.getByRole('link', { name: /ops/i }).closest('a')).toHaveAttribute('href', '/ui/public_reports/ops-monitor');

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();

  })
})


const report4sending = {
  id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
  info: {
    name: 'Critical',
    description: 'Critical report'
  },
  thresholds: {
    availability: 80,
    reliability: 85,
    uptime: 0.8,
    unknown: 0.1,
    downtime: 0.1
  },
  disabled: false,
  profiles: [
    {
      id: 'iethai8e-5nv4-urd2-6frc-eequ1saifoon',
      name: 'ARGO_MON_CRITICAL',
      type: 'metric'
    },
    {
      id: 'goo4nohb-lc8y-l5bj-v991-ohzah8xethie',
      name: 'critical',
      type: 'aggregation'
    },
    {
      id: 'gahjohf1-xx39-e0c9-p0rj-choh6ahziz9e',
      name: 'egi_ops',
      type: 'operations'
    }
  ],
  topology_schema: {
    group: {
      type: "NGI",
      group: {
        type: "SITES"
      }
    }
  },
  filter_tags: [
    {
      name: "certification",
      value: "Certified",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "infrastructure",
      value: "Production",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "info_ext_GLUE2ComputingShareMappingQueue",
      value: "condor",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "production",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "monitored",
      value: "1",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "scope",
      value: "EGI",
      context: "argo.endpoint.filter.tags.array"
    },
    {
      name: "group",
      value: "NGI_AEGIS",
      context: "argo.group.filter.fields"
    },
    {
      name: "subgroup",
      value: "AEGIS11-MISANU",
      context: "argo.group.filter.fields"
    },
    {
      name: "group",
      value: "AEGIS11-MISANU",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "APEL",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "Site-BDII",
      context: "argo.endpoint.filter.fields"
    }
  ]
}

const backendReport4sending = {
  name: 'Critical',
  description: 'Critical report',
  groupname: 'ARGO',
  apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
}


describe('Tests for reports changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchReport: () => Promise.resolve(mockReport),
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles),
        fetchAggregationProfiles: () => Promise.resolve(mockAggregationProfiles),
        fetchOperationsProfiles: () => Promise.resolve(mockOperationsProfiles),
        fetchThresholdsProfiles: () => Promise.resolve(mockThresholdsProfiles),
        fetchReportsTopologyTags: () => Promise.resolve(mockReportsTopologyTags),
        fetchReportsTopologyGroups: () => Promise.resolve(mockReportsTopologyGroups),
        fetchReportsTopologyEndpoints: () => Promise.resolve(mockReportsTopologyEndpoints),
        changeReport: mockChangeReport,
        deleteReport: mockDeleteReport
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendReport),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Change report');
    })

    const nameField = screen.getByTestId('name');
    const disabledField = screen.getByLabelText(/disabled/i);
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByText('ARGO');
    const availabilityThresholdField = screen.getByLabelText(/availability/i);
    const reliabilityThresholdField = screen.getByLabelText(/reliability/i);
    const uptimeThresholdField = screen.getByLabelText(/uptime/i);
    const unknownThresholdField = screen.getByLabelText(/unknown/i);
    const downtimeThresholdField = screen.getByLabelText(/downtime/i);

    expect(nameField.value).toBe('Critical');
    expect(nameField).toBeEnabled();
    expect(disabledField.checked).toBeFalsy();
    expect(descriptionField.value).toBe('Critical report');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    selectEvent.openMenu(groupField)
    expect(screen.getByText('TEST')).toBeInTheDocument()

    const metricProfileField = screen.getByText('ARGO_MON_CRITICAL')
    const aggrProfileField = screen.getByText('critical')
    const operationsProfileField = screen.getByText('egi_ops')
    const thresholdsProfileField = screen.getAllByText(/select/i)[0]

    const topologyTypeField = screen.getByText('Sites');

    expect(metricProfileField).toBeInTheDocument()
    expect(metricProfileField).toBeEnabled()

    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument()
    expect(screen.queryByText('OPS_MONITOR_RHEL7')).not.toBeInTheDocument()

    selectEvent.openMenu(metricProfileField)

    expect(screen.getByText('FEDCLOUD')).toBeInTheDocument()
    expect(screen.getByText('OPS_MONITOR_RHEL7')).toBeInTheDocument()

    expect(aggrProfileField).toBeInTheDocument()
    expect(aggrProfileField).toBeEnabled()

    expect(screen.queryByText('ops-mon-critical')).not.toBeInTheDocument()

    selectEvent.openMenu(aggrProfileField)

    expect(screen.getByText('ops-mon-critical')).toBeInTheDocument()

    expect(operationsProfileField).toBeInTheDocument()
    expect(operationsProfileField).toBeEnabled()

    expect(thresholdsProfileField).toBeInTheDocument()
    expect(thresholdsProfileField).toBeEnabled()

    expect(screen.queryByText('TEST_PROFILE')).not.toBeInTheDocument()
    expect(screen.queryByText('test-thresholds')).not.toBeInTheDocument()

    selectEvent.openMenu(thresholdsProfileField)

    expect(screen.getByText('TEST_PROFILE')).toBeInTheDocument()
    expect(screen.getByText('test-thresholds')).toBeInTheDocument()

    expect(topologyTypeField).toBeEnabled()
    expect(screen.queryByText('ServiceGroups')).not.toBeInTheDocument()
    selectEvent.openMenu(topologyTypeField)
    expect(screen.getByText('ServiceGroups')).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText("infrastructure")).toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.getByText("scope")).toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText('certification'));
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument();
    expect(card_groups.getByText('Production')).toBeInTheDocument();
    expect(card_groups.getByText('scope')).toBeInTheDocument();

    expect(card_groups.queryByText("Candidate")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Closed")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Suspended")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Uncertified")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText('Certified'));
    expect(card_groups.getByText('Candidate')).toBeInTheDocument();
    expect(card_groups.getByText('Closed')).toBeInTheDocument();
    expect(card_groups.getByText('Suspended')).toBeInTheDocument();
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument();

    expect(card_groups.queryByText("PPS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Test")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText('Production'));
    expect(card_groups.getByText('PPS')).toBeInTheDocument();
    expect(card_groups.getByText('Test')).toBeInTheDocument();

    expect(card_groups.queryByText("atlas")).not.toBeInTheDocument()
    expect(card_groups.queryByText("cms")).not.toBeInTheDocument()
    expect(card_groups.queryByText("lhcb")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Local")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("tier2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("wlcg")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText('EGI'));
    expect(card_groups.queryByText("atlas")).toBeInTheDocument()
    expect(card_groups.queryByText("cms")).toBeInTheDocument()
    expect(card_groups.queryByText("lhcb")).toBeInTheDocument()
    expect(card_groups.queryByText("Local")).toBeInTheDocument()
    expect(card_groups.queryByText("SLA")).toBeInTheDocument()
    expect(card_groups.queryByText("tier2")).toBeInTheDocument()
    expect(card_groups.queryByText("wlcg")).toBeInTheDocument()

    expect(card_groups.getAllByTestId(/remove/i)).toHaveLength(4);
    expect(card_groups.queryByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_groups.queryByRole('button', { name: /add new extension/i })).toBeInTheDocument();

    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText("NGI_AEGIS"))
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText("AEGIS11-MISANU"))
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.getByText('GLUE2ComputingShareMappingQueue')).toBeInTheDocument();
    expect(card_groups.getByText('condor')).toBeInTheDocument();
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument();
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument();
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument();
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('GLUE2ComputingShareMappingQueue'));
    expect(card_groups.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('condor'));
    expect(card_groups.getByText('condor_q2d')).toBeInTheDocument();
    expect(card_groups.getByText('eddie')).toBeInTheDocument();
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument();
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument();

    expect(card_endpoints.getByText('production')).toBeInTheDocument();
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument();
    expect(card_endpoints.getByText('scope')).toBeInTheDocument();

    expect(card_endpoints.getAllByText('yes')).toHaveLength(2);
    expect(card_endpoints.queryByText("no")).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getAllByText("yes")[0])
    expect(card_endpoints.queryByText("no")).toBeInTheDocument()

    expect(card_endpoints.queryByText("alice")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("cms")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("FedCloud")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("lhcb")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("tier2")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("wlcg")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/glue/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/vo/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/ac.uk/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    selectEvent.openMenu(card_endpoints.getByText('scope'))
    expect(card_endpoints.queryByText("alice")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("cms")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("FedCloud")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("lhcb")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("tier2")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("wlcg")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/glue/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/vo/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/ac.uk/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    selectEvent.openMenu(card_endpoints.getByText('EGI'))
    expect(card_endpoints.queryByText("alice")).toBeInTheDocument()
    expect(card_endpoints.queryByText("cms")).toBeInTheDocument()
    expect(card_endpoints.queryByText("FedCloud")).toBeInTheDocument()
    expect(card_endpoints.queryByText("lhcb")).toBeInTheDocument()
    expect(card_endpoints.queryByText("tier2")).toBeInTheDocument()
    expect(card_endpoints.queryByText("wlcg")).toBeInTheDocument()
    expect(card_endpoints.queryByText(/glue/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/vo/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/ac.uk/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    expect(card_endpoints.getAllByTestId(/remove/i)).toHaveLength(3);
    expect(card_endpoints.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_endpoints.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();

    expect(card_endpoints.queryAllByDisplayValue(/search/i)).toHaveLength(0);

    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument();

    selectEvent.openMenu(card_endpoints.queryByText("AEGIS11-MISANU"))
    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument();

    expect(card_endpoints.getByText("APEL")).toBeInTheDocument()
    expect(card_endpoints.getByText("Site-BDII")).toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getByText("APEL"))
    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument();
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument();

    expect(availabilityThresholdField.value).toBe('80');
    expect(availabilityThresholdField).toBeEnabled();
    expect(reliabilityThresholdField.value).toBe('85');
    expect(reliabilityThresholdField).toBeEnabled();
    expect(uptimeThresholdField.value).toBe('0.8');
    expect(uptimeThresholdField).toBeEnabled();
    expect(unknownThresholdField.value).toBe('0.1');
    expect(unknownThresholdField).toBeEnabled();
    expect(downtimeThresholdField.value).toBe('0.1');
    expect(downtimeThresholdField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test('Test change basic information', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'new-report-name' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Some new description' } })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    frontendReport.info.name = 'new-report-name'
    frontendReport.info.description = 'Some new description'
    backendReport.name = 'new-report-name'
    backendReport.groupname = 'TEST'
    backendReport.description = 'Some new description'
    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test disable report', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByLabelText(/disabled/i))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.disabled = true
    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport4sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test change profiles info', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO_MON_CRITICAL'), 'OPS_MONITOR_RHEL7')

    await selectEvent.select(screen.getByText('critical'), 'ops-mon-critical')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'test-thresholds')

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.profiles.forEach(profile => {
      if (profile.type === 'metric') {
        profile.id = 'il8aimoh-r2ov-05aq-z4l2-uko2moophi9s'
        profile.name = 'OPS_MONITOR_RHEL7'
      }
      if (profile.type === 'aggregation') {
        profile.id = 'ye3ioph5-1ryg-k4ea-e6eb-nei6zoupain2'
        profile.name = 'ops-mon-critical'
      }
    })

    frontendReport.profiles.push({
      id: 'aH9se5aJ-MP2e-3oIF-GQU2-ShoobeeK3ohs',
      name: 'test-thresholds',
      type: 'thresholds'
    })

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport4sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test change topology type', async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
    })

    expect(screen.getAllByText(/sites/i)).toHaveLength(3)
    expect(screen.getByText(/ngis/i)).toBeInTheDocument()
    expect(screen.queryByText(/service groups/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/projects/i)).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText('Sites'), 'ServiceGroups')

    await waitFor(() => {
      expect(screen.getByText(/projects/i)).toBeInTheDocument()
    }) 
    expect(screen.getAllByText(/service groups/i)).toHaveLength(2)
    expect(screen.queryByText(/sites/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ngis/i)).not.toBeInTheDocument()

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    expect(card_groups.queryAllByText("Value not matching predefined values")).toHaveLength(2)
    expect(card_endpoints.queryAllByText("Value not matching predefined values")).toHaveLength(2)
  })

  test('Test change groups', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
    })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('Certified'), 'Candidate')

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    fireEvent.click(card_groups.getByTestId('removeTag-1'))

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { title: /change/i })).not.toBeInTheDocument()
    })
    expect(card_groups.queryAllByText(/required/i)).toHaveLength(2)

    await selectEvent.select(card_groups.getAllByText("Select...")[0], 'monitored')
    await selectEvent.select(card_groups.getAllByText("Select...")[0], 'yes')

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('condor'), 'eddie')

    fireEvent.click(card_groups.getByText(/add new extension/i))

    await selectEvent.select(card_groups.getAllByText("Select...")[0], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText("Select...")[0], 'ARC-CE')

    await selectEvent.select(card_groups.getByText("NGI_AEGIS"), "NGI_CH")

    await selectEvent.select(card_groups.getByText("AEGIS11-MISANU"), "CSCS-LCG2")

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags[0] = {
      name: 'certification',
      value: 'Certified, Candidate',
      context: 'argo.group.filter.tags.array'
    }
    frontendReport.filter_tags.splice(1, 1)
    frontendReport.filter_tags.splice(
      2, 0, {
        name: 'monitored',
        value: '1',
        context: 'argo.group.filter.tags'
      }
    )
    frontendReport.filter_tags[3] = {
      name: 'info_ext_GLUE2ComputingShareMappingQueue',
      value: 'condor, eddie',
      context: 'argo.group.filter.tags.array'
    }
    frontendReport.filter_tags.splice(4, 0, {
      name: 'info_ext_GLUE2EndpointImplementationName',
      value: 'ARC-CE',
      context: 'argo.group.filter.tags.array'
    })
    frontendReport.filter_tags.splice(9, 0, {
      name: 'group',
      value: 'NGI_CH',
      context: 'argo.group.filter.fields'
    })
    frontendReport.filter_tags.splice(11, 0, {
      name: 'subgroup',
      value: 'CSCS-LCG2',
      context: 'argo.group.filter.fields'
    })

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport4sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test change endpoints', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
    })

    const endpoint_groups = within(screen.getByTestId('card-group-of-endpoints'));

    await selectEvent.select(endpoint_groups.getAllByText('yes')[0], 'no')

    fireEvent.click(endpoint_groups.getByTestId('removeTag-1'))
    fireEvent.click(endpoint_groups.getByTestId('removeTag-1'))

    fireEvent.click(endpoint_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(endpoint_groups.getByText(/add new extension/i))

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')
    await selectEvent.select(endpoint_groups.getByText('ce1.gridpp.ecdf.ed.ac.uk'), 'svr009.gla.scotgrid.ac.uk')

    fireEvent.click(endpoint_groups.getByText(/add new extension/i))

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(endpoint_groups.getByTestId('removeExtension-0'))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags[4].value = '0'
    frontendReport.filter_tags.splice(6, 1)
    frontendReport.filter_tags.splice(6, 0, {
      name: 'info_ext_GLUE2EndpointImplementationName',
      value: 'ARC-CE',
      context: 'argo.endpoint.filter.tags.array'
    })

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport4sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test change thresholds', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } })
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } })
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.3' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.thresholds.availability = 70
    frontendReport.thresholds.reliability = 90
    frontendReport.thresholds.uptime = 1.0
    frontendReport.thresholds.unknown = 0.2
    frontendReport.thresholds.downtime = 0.3

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport4sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing report on web api with error message', async () => {
    mockChangeReport.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.info.description = 'More elaborate description of the critical report.'

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
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

  test('Test error changing report on web api without error message', async () => {
    mockChangeReport.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.info.description = 'More elaborate description of the critical report.'

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing report on internal API with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.info.description = 'More elaborate description of the critical report.'

    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    backendReport.description = 'More elaborate description of the critical report.'

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport
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

  test('Test error changing report on internal API without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );
    mockChangeReport.mockReturnValueOnce( Promise.resolve({ ok: 'ok' }) );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.info.description = 'More elaborate description of the critical report.'

    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    backendReport.description = 'More elaborate description of the critical report.'

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', backendReport
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting report', async () => {
    mockDeleteReport.mockReturnValueOnce( Promise.resolve({ ok: 'ok' }) );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting report on web api with error message', async () => {
    mockDeleteReport.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
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

  test('Test error deleting report on web api without error message', async () => {
    mockDeleteReport.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting report on internal backend with error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } );
    mockDeleteReport.mockReturnValueOnce( Promise.resolve({ ok: 'ok' }) );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
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

  test('Test error deleting report on internal backend without error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );
    mockDeleteReport.mockReturnValueOnce( Promise.resolve({ ok: 'ok' }) );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for public reports changeview', () => {
  beforeEach(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchReport: () => Promise.resolve(mockReport),
        fetchReportsTopologyGroups: () => Promise.resolve(mockReportsTopologyGroups),
      }
    })
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockBackendReport)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Report details');
    })

    const nameField = screen.getByTestId('name');
    const disabledField = screen.getByLabelText(/disabled/i);
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');
    const metricProfileField = screen.getByLabelText('Metric profile:')
    const aggrProfileField = screen.getByLabelText('Aggregation profile:')
    const operationsProfileField = screen.getByLabelText('Operations profile:')
    const thresholdsProfileField = screen.getByLabelText('Thresholds profile:')
    const topologyTypeField = screen.getByLabelText('Topology type:');
    const availabilityThresholdField = screen.getByLabelText(/availability/i);
    const reliabilityThresholdField = screen.getByLabelText(/reliability/i);
    const uptimeThresholdField = screen.getByLabelText(/uptime/i);
    const unknownThresholdField = screen.getByLabelText(/unknown/i);
    const downtimeThresholdField = screen.getByLabelText(/downtime/i);

    expect(nameField.value).toBe('Critical');
    expect(nameField).toBeDisabled();
    expect(disabledField.checked).toBeFalsy();
    expect(disabledField).toBeDisabled();
    expect(descriptionField.value).toBe('Critical report');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('ARGO')
    expect(groupField).toBeDisabled();

    expect(metricProfileField.value).toBe('ARGO_MON_CRITICAL')
    expect(metricProfileField).toBeDisabled()

    expect(aggrProfileField.value).toBe('critical')
    expect(aggrProfileField).toBeDisabled()

    expect(operationsProfileField.value).toBe('egi_ops')
    expect(operationsProfileField).toBeDisabled()

    expect(thresholdsProfileField.value).toBe('')
    expect(thresholdsProfileField).toBeDisabled()

    expect(topologyTypeField.value).toBe('Sites');
    expect(topologyTypeField).toBeDisabled()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    const tag1name = card_groups.getByTestId('groupsTags.0.name')
    const tag1value = card_groups.getByTestId('groupsTags.0.value')
    const tag2name = card_groups.getByTestId('groupsTags.1.name')
    const tag2value = card_groups.getByTestId('groupsTags.1.value')
    const tag3name = card_groups.getByTestId('groupsTags.2.name')
    const tag3value = card_groups.getByTestId('groupsTags.2.value')

    expect(tag1name.value).toBe('certification')
    expect(tag1name).toBeDisabled()
    expect(tag1value.value).toBe('Certified')
    expect(tag1value).toBeDisabled()
    expect(tag2name.value).toBe('infrastructure')
    expect(tag2name).toBeDisabled()
    expect(tag2value.value).toBe('Production')
    expect(tag2value).toBeDisabled()
    expect(tag3name.value).toBe('scope')
    expect(tag3name).toBeDisabled()
    expect(tag3value.value).toBe('EGI')
    expect(tag3value).toBeDisabled()
    expect(card_groups.queryByTestId(/remove/i)).not.toBeInTheDocument()

    expect(card_groups.queryByRole('button', { name: /add new tag/i })).not.toBeInTheDocument();
    expect(card_groups.queryByRole('button', { name: /add new extension/i })).not.toBeInTheDocument();
    expect(card_groups.getByTestId('groupsExtensions.0.name').value).toBe('GLUE2ComputingShareMappingQueue')
    expect(card_groups.getByTestId('groupsExtensions.0.value').value).toBe('condor')
    expect(card_groups.getByLabelText('NGIs:').value).toBe("NGI_AEGIS")
    expect(card_groups.getByLabelText('Sites:').value).toBe("AEGIS11-MISANU")

    expect(card_endpoints.getByTestId('endpointsTags.0.name').value).toBe('production')
    expect(card_endpoints.getByTestId('endpointsTags.0.value').value).toBe('yes')
    expect(card_endpoints.getByTestId('endpointsTags.1.name').value).toBe('monitored')
    expect(card_endpoints.getByTestId('endpointsTags.1.value').value).toBe('yes')
    expect(card_endpoints.getByTestId('endpointsTags.2.name').value).toBe('scope')
    expect(card_endpoints.getByTestId('endpointsTags.2.value').value).toBe('EGI')

    expect(card_endpoints.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByRole('button', { name: /add new tag/i })).not.toBeInTheDocument();
    expect(card_endpoints.queryByRole('button', { name: /add new extension/i })).not.toBeInTheDocument();

    expect(availabilityThresholdField.value).toBe('80');
    expect(availabilityThresholdField).toBeDisabled();
    expect(reliabilityThresholdField.value).toBe('85');
    expect(reliabilityThresholdField).toBeDisabled();
    expect(uptimeThresholdField.value).toBe('0.8');
    expect(uptimeThresholdField).toBeDisabled();
    expect(unknownThresholdField.value).toBe('0.1');
    expect(unknownThresholdField).toBeDisabled();
    expect(downtimeThresholdField.value).toBe('0.1');
    expect(downtimeThresholdField).toBeDisabled();

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test('Test that page renders properly if report has no entities', async () => {
    WebApi.mockImplementation(() => {
      return {
        fetchReport: () => Promise.resolve(mockReport2),
        fetchReportsTopologyTags: () => Promise.resolve(mockReportsTopologyTags)
      }
    })
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Report details');
    })

    const nameField = screen.getByTestId('name');
    const disabledField = screen.getByLabelText(/disabled/i);
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');
    const metricProfileField = screen.getByLabelText('Metric profile:')
    const aggrProfileField = screen.getByLabelText('Aggregation profile:')
    const operationsProfileField = screen.getByLabelText('Operations profile:')
    const thresholdsProfileField = screen.getByLabelText('Thresholds profile:')
    const topologyTypeField = screen.getByLabelText('Topology type:');
    const availabilityThresholdField = screen.getByLabelText(/availability/i);
    const reliabilityThresholdField = screen.getByLabelText(/reliability/i);
    const uptimeThresholdField = screen.getByLabelText(/uptime/i);
    const unknownThresholdField = screen.getByLabelText(/unknown/i);
    const downtimeThresholdField = screen.getByLabelText(/downtime/i);

    expect(nameField.value).toBe('Critical');
    expect(nameField).toBeDisabled();
    expect(disabledField.checked).toBeFalsy();
    expect(disabledField).toBeDisabled();
    expect(descriptionField.value).toBe('Critical report');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('ARGO')
    expect(groupField).toBeDisabled();

    expect(metricProfileField.value).toBe('ARGO_MON_CRITICAL')
    expect(metricProfileField).toBeDisabled()

    expect(aggrProfileField.value).toBe('critical')
    expect(aggrProfileField).toBeDisabled()

    expect(operationsProfileField.value).toBe('egi_ops')
    expect(operationsProfileField).toBeDisabled()

    expect(thresholdsProfileField.value).toBe('')
    expect(thresholdsProfileField).toBeDisabled()

    expect(topologyTypeField.value).toBe('Sites');
    expect(topologyTypeField).toBeDisabled()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    const tag1name = card_groups.getByTestId('groupsTags.0.name')
    const tag1value = card_groups.getByTestId('groupsTags.0.value')
    const tag2name = card_groups.getByTestId('groupsTags.1.name')
    const tag2value = card_groups.getByTestId('groupsTags.1.value')
    const tag3name = card_groups.getByTestId('groupsTags.2.name')
    const tag3value = card_groups.getByTestId('groupsTags.2.value')

    expect(tag1name.value).toBe('certification')
    expect(tag1name).toBeDisabled()
    expect(tag1value.value).toBe('Certified')
    expect(tag1value).toBeDisabled()
    expect(tag2name.value).toBe('infrastructure')
    expect(tag2name).toBeDisabled()
    expect(tag2value.value).toBe('Production')
    expect(tag2value).toBeDisabled()
    expect(tag3name.value).toBe('scope')
    expect(tag3name).toBeDisabled()
    expect(tag3value.value).toBe('EGI')
    expect(tag3value).toBeDisabled()
    expect(card_groups.queryByTestId(/remove/i)).not.toBeInTheDocument()

    expect(card_groups.queryByRole('button', { name: /add new tag/i })).not.toBeInTheDocument();
    expect(card_groups.queryByRole('button', { name: /add new extension/i })).not.toBeInTheDocument();
    expect(card_groups.getByTestId('groupsExtensions.0.name').value).toBe('')
    expect(card_groups.getByTestId('groupsExtensions.0.value').value).toBe('')
    expect(card_groups.getByLabelText('NGIs:').value).toBe('')
    expect(card_groups.getByLabelText('Sites:').value).toBe('')

    expect(card_endpoints.getByTestId('endpointsTags.0.name').value).toBe('production')
    expect(card_endpoints.getByTestId('endpointsTags.0.value').value).toBe('yes')
    expect(card_endpoints.getByTestId('endpointsTags.1.name').value).toBe('monitored')
    expect(card_endpoints.getByTestId('endpointsTags.1.value').value).toBe('yes')
    expect(card_endpoints.getByTestId('endpointsTags.2.name').value).toBe('scope')
    expect(card_endpoints.getByTestId('endpointsTags.2.value').value).toBe('EGI')

    expect(card_endpoints.queryByTestId(/remove/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryByRole('button', { name: /add new tag/i })).not.toBeInTheDocument();
    expect(card_endpoints.queryByRole('button', { name: /add new extension/i })).not.toBeInTheDocument();

    expect(availabilityThresholdField.value).toBe('80');
    expect(availabilityThresholdField).toBeDisabled();
    expect(reliabilityThresholdField.value).toBe('85');
    expect(reliabilityThresholdField).toBeDisabled();
    expect(uptimeThresholdField.value).toBe('0.8');
    expect(uptimeThresholdField).toBeDisabled();
    expect(unknownThresholdField.value).toBe('0.1');
    expect(unknownThresholdField).toBeDisabled();
    expect(downtimeThresholdField.value).toBe('0.1');
    expect(downtimeThresholdField).toBeDisabled();

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })
})


const newReport4Sending = {
  info: {
    name: 'OPS-MONITOR',
    description: 'A/R report for Operations services.'
  },
  thresholds: {
    availability: 70,
    reliability: 80,
    uptime: 1.0,
    unknown: 0.2,
    downtime: 0.2
  },
  disabled: false,
  profiles: [
    {
      id: 'il8aimoh-r2ov-05aq-z4l2-uko2moophi9s',
      name: 'OPS_MONITOR_RHEL7',
      type: 'metric'
    },
    {
      id: 'ye3ioph5-1ryg-k4ea-e6eb-nei6zoupain2',
      name: 'ops-mon-critical',
      type: 'aggregation'
    },
    {
      id: 'gahjohf1-xx39-e0c9-p0rj-choh6ahziz9e',
      name: 'egi_ops',
      type: 'operations'
    },
    {
      id: 'Iesh4Eis-Z6JC-xWK8-O5KG-nae4eephoLah',
      name: 'TEST_PROFILE',
      type: 'thresholds'
    }
  ],
  topology_schema: {
    group: {
      type: 'NGI',
      group: {
        type: 'SITES'
      }
    }
  },
  filter_tags: [
    {
      name: 'monitored',
      value: '1',
      context: 'argo.group.filter.tags'
    },
    {
      name: 'info_ext_GLUE2EndpointImplementationName',
      value: 'ARC-CE',
      context: 'argo.group.filter.tags.array'
    },
    {
      name: 'info_ext_GLUE2EndpointID',
      value: 'ce1.gridpp.ecdf.ed.ac.uk',
      context: 'argo.endpoint.filter.tags.array'
    }
  ]
}

const newBackendReport4Sending = {
  name: 'OPS-MONITOR',
  description: 'A/R report for Operations services.',
  groupname: 'ARGO',
  apiid: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me'
}


describe('Tests for reports addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles),
        fetchAggregationProfiles: () => Promise.resolve(mockAggregationProfiles),
        fetchOperationsProfiles: () => Promise.resolve(mockOperationsProfiles),
        fetchThresholdsProfiles: () => Promise.resolve(mockThresholdsProfiles),
        fetchReportsTopologyTags: () => Promise.resolve(mockReportsTopologyTags),
        fetchReportsTopologyGroups: () => Promise.resolve(mockReportsTopologyGroups),
        fetchReportsTopologyEndpoints: () => Promise.resolve(mockReportsTopologyEndpoints),
        addReport: mockAddReport
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
    renderAddView();

    await waitFor(() => {
      expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const nameField = screen.getByTestId('name');
    const disabledField = screen.getByLabelText(/disabled/i);
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getAllByText(/select/i)[0];

    const metricProfileField = screen.getAllByText(/select/i)[1]
    const aggrProfileField = screen.getAllByText(/select/i)[2]
    const operationsProfileField = screen.getAllByText(/select/i)[3]
    const thresholdsProfileField = screen.getAllByText(/select/i)[4]

    const topologyTypeField = screen.getAllByText(/select/i)[5];

    const availabilityThresholdField = screen.getByLabelText(/availability/i);
    const reliabilityThresholdField = screen.getByLabelText(/reliability/i);
    const uptimeThresholdField = screen.getByLabelText(/uptime/i);
    const unknownThresholdField = screen.getByLabelText(/unknown/i);
    const downtimeThresholdField = screen.getByLabelText(/downtime/i);

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(disabledField.checked).toBeFalsy();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();
    expect(groupField).toBeEnabled();

    expect(metricProfileField).toBeEnabled();
    expect(aggrProfileField).toBeEnabled();
    expect(operationsProfileField).toBeEnabled();
    expect(thresholdsProfileField).toBeEnabled()
    expect(topologyTypeField).toBeEnabled()

    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST')).not.toBeInTheDocument()

    selectEvent.openMenu(groupField)
    expect(screen.getByText('ARGO')).toBeInTheDocument()
    expect(screen.getByText('TEST')).toBeInTheDocument()

    expect(screen.queryByText('ARGO_MON_CRITICAL')).not.toBeInTheDocument()
    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument()
    expect(screen.queryByText('OPS_MONITOR_RHEL7')).not.toBeInTheDocument()

    selectEvent.openMenu(metricProfileField)
    expect(screen.getByText('ARGO_MON_CRITICAL')).toBeInTheDocument()
    expect(screen.getByText('FEDCLOUD')).toBeInTheDocument()
    expect(screen.getByText('OPS_MONITOR_RHEL7')).toBeInTheDocument()

    expect(screen.queryByText('critical')).not.toBeInTheDocument()
    expect(screen.queryByText('ops-mon-critical')).not.toBeInTheDocument()

    selectEvent.openMenu(aggrProfileField)
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('ops-mon-critical')).toBeInTheDocument()

    expect(screen.queryByText('TEST_PROFILE')).not.toBeInTheDocument()
    expect(screen.queryByText('test-thresholds')).not.toBeInTheDocument()

    selectEvent.openMenu(thresholdsProfileField)
    expect(screen.getByText('TEST_PROFILE')).toBeInTheDocument()
    expect(screen.getByText('test-thresholds')).toBeInTheDocument()

    expect(screen.queryByText('egi_ops')).not.toBeInTheDocument()

    selectEvent.openMenu(operationsProfileField)
    expect(screen.getByText('egi_ops')).toBeInTheDocument()

    expect(screen.queryByText('Sites')).not.toBeInTheDocument()
    expect(screen.queryByText('ServiceGroups')).not.toBeInTheDocument()

    selectEvent.openMenu(topologyTypeField)
    expect(screen.getByText('Sites')).toBeInTheDocument()
    expect(screen.getByText('ServiceGroups')).toBeInTheDocument()

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    expect(card_groups.getAllByRole('combobox')).toHaveLength(2);
    expect(card_groups.queryAllByTestId(/remove/i)).toHaveLength(0);
    expect(card_groups.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_groups.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();
    expect(card_groups.getAllByText(/search/i)).toHaveLength(2);

    expect(card_endpoints.queryAllByRole('combobox')).toHaveLength(2);
    expect(card_endpoints.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_endpoints.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();
    expect(card_endpoints.getAllByText(/search/i)).toHaveLength(2);

    expect(availabilityThresholdField.value).toBe('');
    expect(availabilityThresholdField).toBeEnabled();
    expect(reliabilityThresholdField.value).toBe('');
    expect(reliabilityThresholdField).toBeEnabled();
    expect(uptimeThresholdField.value).toBe('');
    expect(uptimeThresholdField).toBeEnabled();
    expect(unknownThresholdField.value).toBe('');
    expect(unknownThresholdField).toBeEnabled();
    expect(downtimeThresholdField.value).toBe('');
    expect(downtimeThresholdField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test('Test add required information', async () => {
    mockAddReport.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Report Created',
          code: "200"
        },
        data: {
          id: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.click(screen.getByLabelText(/disable/i))
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } })

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfileField = screen.getAllByText(/select/i)[1]
    const aggregationProfileField = screen.getAllByText(/select/i)[2]
    const operationsProfileField = screen.getAllByText(/select/i)[3]
    const thresholdsProfileField = screen.getAllByText(/select/i)[4]
    const topologyTypeField = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfileField, "OPS_MONITOR_RHEL7")
    await selectEvent.select(aggregationProfileField, "ops-mon-critical")
    await selectEvent.select(operationsProfileField, "egi_ops")
    await selectEvent.select(thresholdsProfileField, "TEST_PROFILE")

    await selectEvent.select(topologyTypeField, "Sites")

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } })
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } })
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: /add/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    let frontendReport = JSON.parse(JSON.stringify(newReport4Sending))
    frontendReport.disabled = true
    frontendReport.filter_tags = []

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(frontendReport)
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/reports/", newBackendReport4Sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report')
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully added', 'Added', 2000
    )
  })

  test('Test add group tags', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));

    fireEvent.click(card_groups.getByText(/add new tag/i))

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getAllByText(/select/i)[0])
    expect(card_groups.queryByText('certification')).toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).toBeInTheDocument()
    expect(card_groups.queryByText('scope')).toBeInTheDocument()

    expect(card_groups.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { title: /add/i })).not.toBeInTheDocument()
    })
    expect(card_groups.queryAllByText(/required/i)).toHaveLength(2)

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'certification')
    expect(card_groups.queryAllByText(/required/i)).toHaveLength(1)
    selectEvent.openMenu(card_groups.queryByText(/select/i))
    expect(card_groups.queryByText('Candidate')).toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.queryByText(/select/i), 'Candidate')

    await selectEvent.select(card_groups.queryByText('Candidate'), 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))

    expect(card_groups.queryAllByText('certification')).toHaveLength(1)
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.queryAllByText(/select/i)[0])
    expect(card_groups.queryAllByText('certification')).toHaveLength(1)
    expect(card_groups.queryByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).toBeInTheDocument()
    expect(card_groups.queryByText('scope')).toBeInTheDocument()

    await selectEvent.select(card_groups.queryAllByText(/select/i)[0], 'infrastructure')

    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).toBeInTheDocument()
    expect(card_groups.queryByText('Production')).toBeInTheDocument()
    expect(card_groups.queryByText('Test')).toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('infrastructure'), 'monitored')
    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).toBeInTheDocument()
    expect(card_groups.queryByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('monitored'), 'scope')
    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('atlas')).toBeInTheDocument()
    expect(card_groups.queryByText('cms')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).toBeInTheDocument()
    expect(card_groups.queryByText('Local')).toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).toBeInTheDocument()
    expect(card_groups.queryByText(/glue2/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/condor/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText("eddie")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/select/i), 'EGI')

    fireEvent.click(card_groups.getByTestId('removeTag-0'))

    expect(card_groups.queryByText(/required/i)).not.toBeInTheDocument()

    expect(card_groups.queryByText(/certification/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/certified/i)).not.toBeInTheDocument()

    fireEvent.click(card_groups.getByText(/add new extension/i))

    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('scope')).toHaveLength(1)
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText('production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_ID')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_URL')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointID/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getAllByText(/select/i)[0])
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('scope')).toHaveLength(1)
    expect(card_groups.queryByText('GLUE2ComputingShareMappingQueue')).toBeInTheDocument()
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_groups.queryByText('info_ext_GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_ext_GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_groups.queryByText('production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_ID')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_URL')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointID/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/vo_/i)).not.toBeInTheDocument()

    expect(card_groups.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('EGI')).toHaveLength(1)
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('meh')).not.toBeInTheDocument()
    expect(card_groups.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/fis.puc.cl/home/afigrid')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'GLUE2ComputingShareMappingQueue')
    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('EGI')).toHaveLength(1)
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('meh')).not.toBeInTheDocument()
    expect(card_groups.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/fis.puc.cl/home/afigrid')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/select/i), 'condor')

    await selectEvent.select(card_groups.getByText('condor'), 'eddie')

    fireEvent.click(card_groups.getByText(/add new extension/i))

    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('scope')).toHaveLength(1)
    expect(card_groups.getAllByText(/GLUE2ComputingShareMappingQueue/i)).toHaveLength(1)
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText('production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_ID')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_URL')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointID/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getAllByText(/select/i)[0])
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('scope')).toHaveLength(1)
    expect(card_groups.getAllByText(/GLUE2ComputingShareMappingQueue/i)).toHaveLength(1)
    expect(card_groups.queryByText("GLUE2EndpointImplementationName")).toBeInTheDocument()
    expect(card_groups.queryByText('production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_ID')).not.toBeInTheDocument()
    expect(card_groups.queryByText('info_URL')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointID/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/vo_/i)).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'GLUE2EndpointImplementationName')

    expect(card_groups.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('EGI')).toHaveLength(1)
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('meh')).not.toBeInTheDocument()
    expect(card_groups.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/fis.puc.cl/home/afigrid')).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryAllByText('EGI')).toHaveLength(1)
    expect(card_groups.queryByText('atlas')).not.toBeInTheDocument()
    expect(card_groups.queryByText('cms')).not.toBeInTheDocument()
    expect(card_groups.queryByText('lhcb')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Local')).not.toBeInTheDocument()
    expect(card_groups.queryByText('SLA')).not.toBeInTheDocument()
    expect(card_groups.queryByText('tier2')).not.toBeInTheDocument()
    expect(card_groups.queryByText('wlcg')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).toBeInTheDocument()
    expect(card_groups.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('meh')).not.toBeInTheDocument()
    expect(card_groups.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_groups.queryByText('/dpm/fis.puc.cl/home/afigrid')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/select/i), 'ARC-CE')

    fireEvent.click(card_groups.getByTestId('removeExtension-1'))

    expect(card_groups.queryByText("GLUE2EndpointImplementationName")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ARC-CE")).not.toBeInTheDocument()
  })

  test('Test add endpoints tags', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_endpoints.getByText(/add new tag/i))

    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('scope')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getAllByText(/select/i)[0])
    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).toBeInTheDocument()
    expect(card_endpoints.queryByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("alice")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("cms")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("FedCloud")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("lhcb")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("tier2")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("wlcg")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'scope')
    selectEvent.openMenu(card_endpoints.queryByText(/select/i))
    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("alice")).toBeInTheDocument()
    expect(card_endpoints.queryByText("cms")).toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI")).toBeInTheDocument()
    expect(card_endpoints.queryByText("FedCloud")).toBeInTheDocument()
    expect(card_endpoints.queryByText("lhcb")).toBeInTheDocument()
    expect(card_endpoints.queryByText("tier2")).toBeInTheDocument()
    expect(card_endpoints.queryByText("wlcg")).toBeInTheDocument()
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryByText(/select/i), 'FedCloud')

    await selectEvent.select(card_endpoints.queryByText('FedCloud'), 'EGI')

    fireEvent.click(card_endpoints.getByText(/add new tag/i))

    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.queryAllByText(/select/i)[0])
    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryAllByText(/select/i)[0], 'monitored')

    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getByText(/select/i))
    expect(card_endpoints.queryByText('yes')).toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.getByText(/select/i), 'yes')

    fireEvent.click(card_endpoints.getByTestId('removeTag-1'))

    expect(card_endpoints.queryByText("monitored")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("yes")).not.toBeInTheDocument()

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getAllByText(/select/i)[0])
    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText("alice")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("cms")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("EGI")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("FedCloud")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("lhcb")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("tier2")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("wlcg")).toHaveLength(1)
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'GLUE2EndpointID')
    selectEvent.openMenu(card_endpoints.queryByText(/select/i))
    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText("alice")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("cms")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("EGI")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("FedCloud")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("lhcb")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("tier2")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("wlcg")).toHaveLength(1)
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryByText(/select/i), 'ce1.gridpp.ecdf.ed.ac.uk')

    await selectEvent.select(card_endpoints.queryByText('GLUE2EndpointID'), 'svr009.gla.scotgrid.ac.uk')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('GLUE2EndpointID')).toHaveLength(1)
    expect(card_endpoints.queryAllByText('GLUE2EndpointImplementationName')).toHaveLength(1)
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.queryAllByText(/select/i)[0])
    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('scope')).toHaveLength(1)
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('GLUE2EndpointID')).toHaveLength(1)
    expect(card_endpoints.queryAllByText('GLUE2EndpointImplementationName')).toHaveLength(2)
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryAllByText(/select/i)[0], 'GLUE2EndpointImplementationName')

    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText("alice")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("cms")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("EGI")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("FedCloud")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("lhcb")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("tier2")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("wlcg")).toHaveLength(1)
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.getByText(/select/i))
    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText("alice")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("cms")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("EGI")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("FedCloud")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("lhcb")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("tier2")).toHaveLength(1)
    expect(card_endpoints.queryAllByText("wlcg")).toHaveLength(1)
    expect(card_endpoints.queryByText('1111G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('2222G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('3333G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('4444G0')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('meh')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('mock_url')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/a')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('/dpm/farm.particle.cz/home/aaa')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("/dpm/fis.puc.cl/home/afigrid")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Candidate')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Certified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Closed')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Suspended')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Uncertified')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('Test')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('1')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('0')).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.getByText(/select/i), 'ARC-CE')

    fireEvent.click(card_endpoints.getByTestId('removeExtension-1'))

    expect(card_endpoints.queryByText("ARC-CE")).not.toBeInTheDocument()
  })

  test("Test add entity filters - Sites", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    const topologyTypeField = screen.getAllByText(/select/i)[5]
    const card_groups = within(screen.getByTestId("card-group-of-groups"))
    const card_endpoints = within(screen.getByTestId("card-group-of-endpoints"))

    expect(card_groups.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.queryAllByText(/search/i)[0])
    expect(card_groups.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(topologyTypeField, "Sites")

    selectEvent.openMenu(card_groups.queryAllByText(/search/i)[0])
    expect(card_groups.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.queryAllByText(/search/i)[0], "NGI_AEGIS")

    selectEvent.openMenu(card_groups.getByText(/search/i))
    expect(card_groups.queryByText("AEGIS11-MISANU")).toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText("NGI_AEGIS"), "NGI_CH")

    selectEvent.openMenu(card_groups.getByText(/search/i))
    expect(card_groups.queryByText("AEGIS11-MISANU")).toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/search/i), "AEGIS11-MISANU")

    expect(card_endpoints.queryAllByText(/search/i)).toHaveLength(2)

    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.queryAllByText(/search/i)[0])
    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("AEGIS11-MISANU")).toBeInTheDocument()
    expect(card_endpoints.queryByText("CSCS-LCG2")).toBeInTheDocument()

    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryAllByText(/search/i)[0], "CSCS-LCG2")

    selectEvent.openMenu(card_endpoints.getByText(/search/i))
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).toBeInTheDocument()

    await selectEvent.select(card_endpoints.getByText("CSCS-LCG2"), "AEGIS11-MISANU")

    selectEvent.openMenu(card_endpoints.getByText(/search/i))
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).toBeInTheDocument()
  })

  test("Test add entity filters - ServiceGroups", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    const topologyTypeField = screen.getAllByText(/select/i)[5]
    const card_groups = within(screen.getByTestId("card-group-of-groups"))
    const card_endpoints = within(screen.getByTestId("card-group-of-endpoints"))

    expect(card_groups.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.queryAllByText(/search/i)[0])
    expect(card_groups.queryByText("EGI")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(topologyTypeField, "ServiceGroups")

    selectEvent.openMenu(card_groups.queryAllByText(/search/i)[0])
    expect(card_groups.queryByText("EGI")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).not.toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.queryAllByText(/search/i)[0], "EGI")

    selectEvent.openMenu(card_groups.getByText(/search/i))
    expect(card_groups.queryByText("NGI_AEGIS_SERVICES")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_ARMGRID_SERVICES")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_BG_SERVICES")).toBeInTheDocument()
    expect(card_groups.queryByText("NL_EUDAT_CORE")).toBeInTheDocument()
    expect(card_groups.queryByText("EGI_NBISBILS_SLA")).toBeInTheDocument()
    expect(card_groups.queryByText("NGI_AEGIS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("NGI_CH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_groups.queryByText("AEGIS03-ELEF-LEDA")).not.toBeInTheDocument()
    expect(card_groups.queryByText("CSCS-LCG2")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SWITCH")).not.toBeInTheDocument()

    expect(card_groups.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_groups.queryByText("org.openstack.nova")).not.toBeInTheDocument()
    expect(card_groups.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_groups.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_groups.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/search/i), "NGI_BG_SERVICES")

    await selectEvent.select(card_groups.getByText("NGI_BG_SERVICES"), "EGI_NBISBILS_SLA")

    expect(card_endpoints.queryAllByText(/search/i)).toHaveLength(2)

    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()

    selectEvent.openMenu(card_endpoints.queryAllByText(/search/i)[0])
    expect(card_endpoints.queryByText("NGI_AEGIS_SERVICES")).toBeInTheDocument()
    expect(card_endpoints.queryByText("NGI_BG_SERVICES")).toBeInTheDocument()
    expect(card_endpoints.queryByText("EGI_NBISBILS_SLA")).toBeInTheDocument()

    expect(card_endpoints.queryByText("AEGIS11-MISANU")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("CSCS-LCG2")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).not.toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryAllByText(/search/i)[0], "EGI_NBISBILS_SLA")

    selectEvent.openMenu(card_endpoints.getByText(/search/i))
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.getByText("EGI_NBISBILS_SLA"), "NGI_BG_SERVICES")

    selectEvent.openMenu(card_endpoints.getByText(/search/i))
    expect(card_endpoints.queryByText("WMS")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Top-BDII")).toBeInTheDocument()
    expect(card_endpoints.queryByText("ngi.SAM")).toBeInTheDocument()
    expect(card_endpoints.queryByText("org.openstack.nova")).toBeInTheDocument()

    expect(card_endpoints.queryByText("APEL")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("Site-BDII")).not.toBeInTheDocument()
    expect(card_endpoints.queryByText("SRM")).not.toBeInTheDocument()
  })

  test('Test successfully adding a report', async () => {
    mockAddReport.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Report Created',
          code: "200"
        },
        data: {
          id: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          links: {
            self: 'string'
          }
        }
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'OPS_MONITOR_RHEL7')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ops-mon-critical')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'egi_ops')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'TEST_PROFILE')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(newReport4Sending)
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', newBackendReport4Sending
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Report successfully added', 'Added', 2000
    )
  })

  test('Test error adding a report in web api with error message', async () => {
    mockAddReport.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'OPS_MONITOR_RHEL7')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ops-mon-critical')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'egi_ops')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'TEST_PROFILE')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(newReport4Sending)
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

  test('Test error adding a report in web api without error message', async () => {
    mockAddReport.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'OPS_MONITOR_RHEL7')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ops-mon-critical')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'egi_ops')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'TEST_PROFILE')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(newReport4Sending)
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled();
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a report in internal api with error message', async () => {
    mockAddReport.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Report Created',
          code: "200"
        },
        data: {
          id: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
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
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'OPS_MONITOR_RHEL7')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ops-mon-critical')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'egi_ops')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'TEST_PROFILE')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(newReport4Sending)
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', newBackendReport4Sending
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

  test('Test error adding a report in internal api without error message', async () => {
    mockAddReport.mockReturnValueOnce(
      Promise.resolve({
        status: {
          message: 'Report Created',
          code: "200"
        },
        data: {
          id: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          links: {
            self: 'string'
          }
        }
      })
    )
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ARGO')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'OPS_MONITOR_RHEL7')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ops-mon-critical')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'egi_ops')
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'TEST_PROFILE')

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[2], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    await selectEvent.select(card_endpoints.getAllByText(/select/i)[2], 'GLUE2EndpointID')
    await selectEvent.select(card_endpoints.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith(newReport4Sending)
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/', newBackendReport4Sending
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding report</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error',
      0,
      expect.any(Function)
    )
  })
})
