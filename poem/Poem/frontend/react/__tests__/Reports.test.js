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
      value: "iris.ac.uk",
      context: "argo.group.filter.fields"
    },
    {
      name: "subgroup",
      value: "dirac-durham",
      context: "argo.group.filter.fields"
    },
    {
      name: "subgroup",
      value: "IRISOPS-IAM",
      context: "argo.group.filter.fields"
    },
    {
      name: "info_ext_GLUE2ComputingShareMappingQueue",
      value: "condor",
      context: "argo.group.filter.tags.array"
    },
    {
      name: "group",
      value: "dirac-durham",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "group",
      value: "IRISOPS-IAM",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "ARC-CE",
      context: "argo.endpoint.filter.fields"
    },
    {
      name: "service",
      value: "TOP-BDII",
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
          "EGI",
          "EOSC-hub",
          "EOSCCore",
          "FedCloud"
        ]
      },
      {
        name: "info_ID",
        values: [
          "1111G0",
          "2222G0",
          "3333G0",
          "4444G0"
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
          "EGI",
          "EOSC-hub",
          "EOSCCore",
          "FedCloud"
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
    "type": "SERVICEGROUPS",
    "group": "DAVETESTSG",
    "service": "egi.GOCDB",
    "hostname": "goc.egi.eu",
    "notifications": null,
    "tags": {
      "scope": "EGI, EGICore",
      "monitored": "1",
      "production": "1",
      "info_ID": "4180G0"
    }
  },
  {
    "type": "SERVICEGROUPS",
    "group": "NGI_AEGIS_SERVICES",
    "service": "WMS",
    "hostname": "wms.ipb.ac.rs",
    "notifications": null,
    "tags": {
      "scope": "EGI",
      "monitored": "0",
      "production": "0",
      "info_ID": "939G0"
    }
  },
  {
    "type": "SITES",
    "group": "NGI_UA_SERVICES",
    "service": "Top-BDII",
    "hostname": "bdii.ha.grid.org.ua",
    "notifications": null,
    "tags": {
      "scope": "EGI",
      "monitored": "1",
      "production": "1",
      "info_ID": "1306G0"
    }
  },
  {
    "type": "SITES",
    "group": "RU-SARFTI",
    "service": "ARC-CE",
    "hostname": "ce2.grid.sarfti.ru",
    "notifications": null,
    "tags": {
      "scope": "EGI",
      "monitored": "1",
      "production": "1",
      "info_ID": "10340G0",
      "info_HOSTDN": "/FOOBAR/CN=ce2.grid.sarfti.ru",
      "info_URL": "ce2.grid.sarfti.ru"
    }
  },
  {
    "type": "SITES",
    "group": "IRISOPS-IAM",
    "service": "it.infn.iam",
    "hostname": "iris-iam.nubes.rl.ac.uk",
    "notifications": null,
    "tags": {
      "scope": "iris.ac.uk",
      "monitored": "1",
      "production": "1",
      "info_ID": "13212G0",
      "info_HOSTDN": "/FOOBAR/CN=iris-iam.nubes.rl.ac.uk",
      "info_URL": "https://iris-iam.stfc.ac.uk"
    }
  },
  {
    "type": "SITES",
    "group": "dirac-durham",
    "service": "egi.Portal",
    "hostname": "dirac.egi.eu",
    "notifications": null,
    "tags": {
      "scope": "EGI",
      "monitored": "1",
      "production": "1",
      "info_ID": "8375G0",
      "info_HOSTDN": "/FOOBAR/CN=dirac-config.egi.eu ",
      "info_URL": "https://dirac.egi.eu"
    }
  }
]


const mockReportsTopologyGroups = [
  {
    date: "2021-06-29",
    group: "EGI",
    type: "PROJECT",
    subgroup: "DAVETESTSG",
    tags: {
      monitored: "0",
      scope: "Local"
    }
  },
  {
    date: "2021-06-29",
    group: "EGI",
    type: "PROJECT",
    subgroup: "NGI_AEGIS_SERVICES",
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
    date: "2021-06-29",
    group: "Russia",
    type: "NGI",
    subgroup: "RU-SARFTI",
    tags: {
      certification: "Certified",
      infrastructure: "Production",
      scope: "EGI"
    }
  },
  {
    date: "2021-06-29",
    group: "iris.ac.uk",
    type: "NGI",
    subgroup: "IRISOPS-IAM",
    tags: {
      certification: "Certified",
      infrastructure: "Production",
      scope: "iris.ac.uk"
    }
  },
  {
    date: "2021-06-29",
    group: "iris.ac.uk",
    type: "NGI",
    subgroup: "dirac-durham",
    tags: {
      certification: "Certified",
      infrastructure: "Production",
      scope: "iris.ac.uk"
    }
  }
];


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
      value: "iris.ac.uk",
      context: "argo.group.filter.fields"
    },
    {
      name: "subgroup",
      value: "dirac-durham",
      context: "argo.group.filter.fields"
    },
    {
      context: "argo.group.filter.fields",
      name: "subgroup",
      value: "IRISOPS-IAM"
    },
    {
      context: "argo.endpoint.filter.fields",
      name: "group",
      value: "dirac-durham"
    },
    {
      context: "argo.endpoint.filter.fields",
      name: "group",
      value: "IRISOPS-IAM"
    },
    {
      context: "argo.endpoint.filter.fields",
      name: "service",
      value: "ARC-CE"
    },
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
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

    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument();
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('Certified')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('certification'));
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument();
    expect(card_groups.getByText('Production')).toBeInTheDocument();
    expect(card_groups.getByText('scope')).toBeInTheDocument();
    expect(card_groups.getByText('EGI')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('Certified'));
    expect(card_groups.getByText('Candidate')).toBeInTheDocument();
    expect(card_groups.getByText('Closed')).toBeInTheDocument();
    expect(card_groups.getByText('Suspended')).toBeInTheDocument();
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('Production'));
    expect(card_groups.getByText('PPS')).toBeInTheDocument();
    expect(card_groups.getByText('Test')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('EGI'));
    expect(card_groups.getByText('EOSC-hub')).toBeInTheDocument();
    expect(card_groups.getByText('EOSCCore')).toBeInTheDocument();
    expect(card_groups.getByText('FedCloud')).toBeInTheDocument();

    expect(card_groups.getAllByTestId(/remove/i)).toHaveLength(4);
    expect(card_groups.queryByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_groups.queryByRole('button', { name: /add new extension/i })).toBeInTheDocument();

    expect(card_groups.queryByText('Russia')).not.toBeInTheDocument();
    expect(card_groups.queryByText('RU-SARFTI')).not.toBeInTheDocument();
    expect(card_groups.queryByText('DAVETESTSG')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_AEGIS_SERVICES')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_ARMGRID_SERVICES')).not.toBeInTheDocument();
    expect(card_groups.getByText('iris.ac.uk')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('iris.ac.uk'))
    expect(card_groups.getByText('Russia')).toBeInTheDocument();
    expect(card_groups.queryByText('RU-SARFTI')).not.toBeInTheDocument();
    expect(card_groups.getByText('dirac-durham')).toBeInTheDocument();
    expect(card_groups.getByText('IRISOPS-IAM')).toBeInTheDocument();

    selectEvent.openMenu(card_groups.getByText('dirac-durham'));
    expect(card_groups.getByText('RU-SARFTI')).toBeInTheDocument();
    expect(card_groups.queryByText('DAVETESTSG')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_AEGIS_SERVICES')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_ARMGRID_SERVICES')).not.toBeInTheDocument();

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
    expect(card_endpoints.getByText('EGI')).toBeInTheDocument();
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_a_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_aaa_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_afigrid_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    selectEvent.openMenu(card_endpoints.getByText('scope'))
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_a_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_aaa_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_afigrid_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    selectEvent.openMenu(card_endpoints.getByText('EGI'))
    expect(card_endpoints.getByText('EGI')).toBeInTheDocument();
    expect(card_endpoints.getByText('EOSC-hub')).toBeInTheDocument();
    expect(card_endpoints.getByText('EOSCCore')).toBeInTheDocument();
    expect(card_endpoints.getByText('FedCloud')).toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_a_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_aaa_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_afigrid_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();

    expect(card_endpoints.getAllByTestId(/remove/i)).toHaveLength(3);
    expect(card_endpoints.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_endpoints.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_ID')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('info_URL')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_a_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_aaa_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('vo_afigrid_attr_SE_PATH')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText(/dpm/i)).not.toBeInTheDocument();
    expect(card_endpoints.queryAllByDisplayValue(/search/i)).toHaveLength(0);

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

  test('Test change report name', async () => {
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'new-report-name',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    frontendReport.info.name = 'new-report-name'
    backendReport.name = 'new-report-name'
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': true,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

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

  test('Test change groupname', async () => {
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

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'TEST',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(report4sending)
    })

    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    backendReport.groupname = 'TEST'
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

  test('Test change description', async () => {
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

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Some new description' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Some new description',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.info.description = 'Some new description'
    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith(frontendReport)
    })

    let backendReport = JSON.parse(JSON.stringify(backendReport4sending))
    backendReport.description = 'Some new description'
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

  test('Test change metric profile', async () => {
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'OPS_MONITOR_RHEL7',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

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

  test('Test change aggregation profile', async () => {
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

    await selectEvent.select(screen.getByText('critical'), 'ops-mon-critical')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'ops-mon-critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.profiles.forEach(profile => {
      if (profile.type === 'aggregation') {
        profile.id = 'ye3ioph5-1ryg-k4ea-e6eb-nei6zoupain2'
        profile.name = 'ops-mon-critical'
      }
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

  test('Test change thresholds profile', async () => {
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

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'test-thresholds')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': 'test-thresholds',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
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

    expect(screen.getAllByText(/sites/i)).toHaveLength(3)
    expect(screen.getByText(/ngis/i)).toBeInTheDocument()
    expect(screen.queryByText(/service groups/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/projects/i)).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText('Sites'), 'ServiceGroups')

    expect(screen.getByText(/projects/i)).toBeInTheDocument()
    expect(screen.getAllByText(/service groups/i)).toHaveLength(2)
    expect(screen.queryByText(/sites/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ngis/i)).not.toBeInTheDocument()

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'ServiceGroups',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.topology_schema = {
      group: {
        type: 'PROJECT',
        group: {
          type: 'SERVICEGROUPS'
        }
      }
    }

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

  test('Test change groups tags', async () => {
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

    await selectEvent.select(card_groups.getByText('Certified'), 'Candidate')

    fireEvent.click(card_groups.getByTestId('removeTag-1'))

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'monitored')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'yes')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': ['Certified', 'Candidate'],
      'groupsTags.1.name': 'scope',
      'groupsTags.1.value': 'EGI',
      'groupsTags.2.name': 'monitored',
      'groupsTags.2.value': 'yes',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

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

  test('Test change group extensions', async () => {
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

    await selectEvent.select(card_groups.getByText('condor'), 'eddie')

    fireEvent.click(card_groups.getByText(/add new extension/i))

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'GLUE2EndpointImplementationName')
    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'ARC-CE')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': ['condor', 'eddie'],
      'groupsExtensions.1.name': 'GLUE2EndpointImplementationName',
      'groupsExtensions.1.value': 'ARC-CE',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(card_groups.getByTestId('removeExtension-0'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2EndpointImplementationName',
      'groupsExtensions.0.value': 'ARC-CE',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags[3] = {
      name: 'info_ext_GLUE2EndpointImplementationName',
      value: 'ARC-CE',
      context: 'argo.group.filter.tags.array'
    }

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

  test('Test change group entities', async () => {
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
    const entity1 = card_groups.getByText('iris.ac.uk')
    const entity2 = card_groups.getByText(/dirac/i)

    await selectEvent.select(entity1, 'Russia')
    await selectEvent.select(entity2, 'RU-SARFTI')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': ['iris.ac.uk', 'Russia'],
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM', 'RU-SARFTI'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags.splice(8, 0, {
      name: 'group',
      value: 'Russia',
      context: 'argo.group.filter.fields'
    })
    frontendReport.filter_tags.splice(11, 0, {
        name: 'subgroup',
        value: 'RU-SARFTI',
        context: 'argo.group.filter.fields'
      }
    )

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

  test('Test change endpoint tags', async () => {
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

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'monitored')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'yes')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'no',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags[4].value = '0'
    frontendReport.filter_tags.splice(6, 1)

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

  test('Test change endpoint extensions', async () => {
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

    fireEvent.click(endpoint_groups.getByText(/add new extension/i))

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'GLUE2EndpointID')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'ce1.gridpp.ecdf.ed.ac.uk')
    await selectEvent.select(endpoint_groups.getByText('ce1.gridpp.ecdf.ed.ac.uk'), 'svr009.gla.scotgrid.ac.uk')

    fireEvent.click(endpoint_groups.getByText(/add new extension/i))

    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'GLUE2EndpointImplementationName')
    await selectEvent.select(endpoint_groups.getAllByText(/select/i)[0], 'ARC-CE')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'],
      'endpointsExtensions.1.name': 'GLUE2EndpointImplementationName',
      'endpointsExtensions.1.value': 'ARC-CE',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(endpoint_groups.getByTestId('removeExtension-0'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'endpointsExtensions.0.name': 'GLUE2EndpointImplementationName',
      'endpointsExtensions.0.value': 'ARC-CE',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.filter_tags.splice(7, 0, {
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

  test('Test change availability threshold', async () => {
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '70',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.thresholds.availability = 70

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

  test('Test change reliability threshold', async () => {
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

    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '90' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '90',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.thresholds.reliability = 90

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

  test('Test change uptime threshold', async () => {
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

    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '1.0',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.thresholds.uptime = 1.0

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

  test('Test change unknown threshold', async () => {
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

    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.2',
      'downtimeThreshold' : '0.1'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
    frontendReport.thresholds.unknown = 0.2

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

  test('Test change downtime threshold', async () => {
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

    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.3' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'Critical',
      'disabled': false,
      'groupname': 'ARGO',
      'description': 'Critical report',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': 'critical',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Certified',
      'groupsTags.1.name': 'infrastructure',
      'groupsTags.1.value': 'Production',
      'groupsTags.2.name': 'scope',
      'groupsTags.2.value': 'EGI',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'entitiesGroups.0.value': 'iris.ac.uk',
      'entitiesGroups.1.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.0.value': ['dirac-durham', 'IRISOPS-IAM'],
      'entitiesEndpoints.1.value': 'ARC-CE',
      'endpointsTags.0.name': 'production',
      'endpointsTags.0.value': 'yes',
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'endpointsTags.2.name': 'scope',
      'endpointsTags.2.value': 'EGI',
      'availabilityThreshold': '80',
      'reliabilityThreshold': '85',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '0.1',
      'downtimeThreshold' : '0.3'
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    let frontendReport = JSON.parse(JSON.stringify(report4sending))
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
    expect(card_groups.getByLabelText('NGIs:').value).toBe('iris.ac.uk')
    expect(card_groups.getByLabelText('Sites:').value).toBe('dirac-durham, IRISOPS-IAM')

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

  test('Test add name', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': 'OPS-MONITOR',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test disable report', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.click(screen.getByLabelText(/disable/i))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': true,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add description', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': 'A/R report for Operations services.',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add group name', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const groupField = screen.getAllByText(/select/i)[0]

    expect(screen.queryByText('ARGO')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST')).not.toBeInTheDocument()

    selectEvent.openMenu(groupField)
    expect(screen.queryByText('ARGO')).toBeInTheDocument()
    expect(screen.queryByText('TEST')).toBeInTheDocument()

    await selectEvent.select(groupField, 'ARGO')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': 'ARGO',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add metric profile', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const metricProfileField = screen.getAllByText(/select/i)[1]

    expect(screen.queryByText('FEDCLOUD')).not.toBeInTheDocument()
    expect(screen.queryByText('OPS_MONITOR_RHEL7')).not.toBeInTheDocument()
    expect(screen.queryByText('ARGO_MON_CRITICAL')).not.toBeInTheDocument()

    selectEvent.openMenu(metricProfileField)
    expect(screen.queryByText('FEDCLOUD')).toBeInTheDocument()
    expect(screen.queryByText('OPS_MONITOR_RHEL7')).toBeInTheDocument()
    expect(screen.queryByText('ARGO_MON_CRITICAL')).toBeInTheDocument()

    await selectEvent.select(metricProfileField, 'ARGO_MON_CRITICAL')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': 'ARGO_MON_CRITICAL',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add aggregation profile', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const aggregationProfileField = screen.getAllByText(/select/i)[2]

    expect(screen.queryByText('critical')).not.toBeInTheDocument()
    expect(screen.queryByText('ops-mon-critical')).not.toBeInTheDocument()

    selectEvent.openMenu(aggregationProfileField)
    expect(screen.queryByText('critical')).toBeInTheDocument()
    expect(screen.queryByText('ops-mon-critical')).toBeInTheDocument()

    await selectEvent.select(aggregationProfileField, 'critical')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': 'critical',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add operations profile', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const operationsProfileField = screen.getAllByText(/select/i)[3]

    expect(screen.queryByText('egi_ops')).not.toBeInTheDocument()

    selectEvent.openMenu(operationsProfileField)
    expect(screen.queryByText('egi_ops')).toBeInTheDocument()

    await selectEvent.select(operationsProfileField, 'egi_ops')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': 'egi_ops',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add thresholds profile', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const thresholdsProfileField = screen.getAllByText(/select/i)[4]

    expect(screen.queryByText('TEST_PROFILE')).not.toBeInTheDocument()
    expect(screen.queryByText('test-thresholds')).not.toBeInTheDocument()

    selectEvent.openMenu(thresholdsProfileField)
    expect(screen.queryByText('TEST_PROFILE')).toBeInTheDocument()
    expect(screen.queryByText('test-thresholds')).toBeInTheDocument()

    await selectEvent.select(thresholdsProfileField, 'TEST_PROFILE')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': 'TEST_PROFILE',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add topology type', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const topologyTypeField = screen.getAllByText(/select/i)[5]

    expect(screen.queryAllByText(/upper group/i)).toHaveLength(2)
    expect(screen.queryAllByText(/lower group/i)).toHaveLength(2)

    expect(screen.queryByText(/sites/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ngis/i)).not.toBeInTheDocument()

    expect(screen.queryByText(/projects/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/service groups/i)).not.toBeInTheDocument()

    expect(screen.queryByText('Sites')).not.toBeInTheDocument()
    expect(screen.queryByText('ServiceGroups')).not.toBeInTheDocument()

    selectEvent.openMenu(topologyTypeField)
    expect(screen.queryByText('Sites')).toBeInTheDocument()
    expect(screen.queryByText('ServiceGroups')).toBeInTheDocument()

    await selectEvent.select(topologyTypeField, 'Sites')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': 'Sites',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    expect(screen.queryByText(/upper group/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/lower group/i)).not.toBeInTheDocument()

    expect(screen.queryAllByText(/sites/i)).toHaveLength(3)
    expect(screen.queryByText(/ngis/i)).toBeInTheDocument()

    expect(screen.queryByText(/service groups/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/projects/i)).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText('Sites'), 'ServiceGroups')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': 'ServiceGroups',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    expect(screen.queryByText(/upper group/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/lower group/i)).not.toBeInTheDocument()

    expect(screen.queryByText(/sites/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ngis/i)).not.toBeInTheDocument()

    expect(screen.queryAllByText(/service groups/i)).toHaveLength(2)
    expect(screen.queryByText(/projects/i)).toBeInTheDocument()
  })

  test('Test add group tags', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));

    fireEvent.click(card_groups.getByText(/add new tag/i))

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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getAllByText(/select/i)[0], 'certification')
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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_groups.queryByText(/select/i), 'Candidate')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': 'Candidate',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_groups.queryByText('Candidate'), 'Certified')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': ['Candidate', 'Certified'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()

    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).toBeInTheDocument()
    expect(card_groups.queryByText('Production')).toBeInTheDocument()
    expect(card_groups.queryByText('Test')).toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('infrastructure'), 'monitored')
    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).toBeInTheDocument()
    expect(card_groups.queryByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()

    await selectEvent.select(card_groups.getByText('monitored'), 'scope')
    selectEvent.openMenu(card_groups.getByText(/select/i))
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('1')).not.toBeInTheDocument()
    expect(card_groups.queryByText('0')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).toBeInTheDocument()

    await selectEvent.select(card_groups.getByText(/select/i), 'EGI')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsTags.0.name': 'certification',
      'groupsTags.0.value': ['Candidate', 'Certified'],
      'groupsTags.1.name': 'scope',
      'groupsTags.1.value': 'EGI',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_groups.getByTestId('removeTag-0'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsTags.0.name': 'scope',
      'groupsTags.0.value': 'EGI',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add group extensions', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));

    fireEvent.click(card_groups.getByText(/add new extension/i))

    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
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
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': 'condor',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_groups.getByText('condor'), 'eddie')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': ['condor', 'eddie'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_groups.getByText(/add new extension/i))

    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
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
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.getAllByText(/GLUE2ComputingShareMappingQueue/i)).toHaveLength(1)
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).toBeInTheDocument()
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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
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
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': ['condor', 'eddie'],
      'groupsExtensions.1.name': 'GLUE2EndpointImplementationName',
      'groupsExtensions.1.value': 'ARC-CE',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_groups.getByTestId('removeExtension-1'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'groupsExtensions.0.name': 'GLUE2ComputingShareMappingQueue',
      'groupsExtensions.0.value': ['condor', 'eddie'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add group entities', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));

    const entity1 = card_groups.getAllByText(/search/i)[0]
    const entity2 = card_groups.getAllByText(/search/i)[1]

    await selectEvent.select(entity1, 'Russia')

    await selectEvent.select(entity2, 'dirac-durham')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'entitiesGroups.0.value': 'Russia',
      'entitiesGroups.1.value': 'dirac-durham',
      'entitiesEndpoints.0.value': '',
      'entitiesEndpoints.1.value': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add endpoint tags', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
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
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
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
    expect(card_endpoints.queryByText('EGI')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).toBeInTheDocument()
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsTags.0.name': 'scope',
      'endpointsTags.0.value': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_endpoints.queryByText(/select/i), 'EOSCCore')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsTags.0.name': 'scope',
      'endpointsTags.0.value': 'EOSCCore',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_endpoints.queryByText('EOSCCore'), 'EGI')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsTags.0.name': 'scope',
      'endpointsTags.0.value': ['EOSCCore', 'EGI'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsTags.0.name': 'scope',
      'endpointsTags.0.value': ['EOSCCore', 'EGI'],
      'endpointsTags.1.name': 'monitored',
      'endpointsTags.1.value': 'yes',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_endpoints.getByTestId('removeTag-1'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsTags.0.name': 'scope',
      'endpointsTags.0.value': ['EOSCCore', 'EGI'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add endpoint extensions', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

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
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('scope')).not.toBeInTheDocument()
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
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
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
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_endpoints.queryByText(/select/i), 'ce1.gridpp.ecdf.ed.ac.uk')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': 'ce1.gridpp.ecdf.ed.ac.uk',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    await selectEvent.select(card_endpoints.queryByText('GLUE2EndpointID'), 'svr009.gla.scotgrid.ac.uk')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.queryByText('certification')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('production')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('scope')).not.toBeInTheDocument()
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
    expect(card_endpoints.queryByText('scope')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_ext_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/info_/i)).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('URL')).not.toBeInTheDocument()
    expect(card_endpoints.queryAllByText('GLUE2EndpointID')).toHaveLength(1)
    expect(card_endpoints.queryAllByText('GLUE2EndpointImplementationName')).toHaveLength(2)
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText(/vo_/i)).not.toBeInTheDocument()

    await selectEvent.select(card_endpoints.queryAllByText(/select/i)[0], 'GLUE2EndpointImplementationName')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'],
      'endpointsExtensions.1.name': 'GLUE2EndpointImplementationName',
      'endpointsExtensions.1.value': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    expect(card_endpoints.queryByText('yes')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('no')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
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
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'],
      'endpointsExtensions.1.name': 'GLUE2EndpointImplementationName',
      'endpointsExtensions.1.value': 'ARC-CE',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })

    fireEvent.click(card_endpoints.getByTestId('removeExtension-1'))

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'endpointsExtensions.0.name': 'GLUE2EndpointID',
      'endpointsExtensions.0.value': ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'],
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add endpoint entities', async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    const card_groups = within(screen.getByTestId('card-group-of-endpoints'));

    const entity1 = card_groups.getAllByText(/search/i)[0]
    const entity2 = card_groups.getAllByText(/search/i)[1]

    await selectEvent.select(entity1, 'IRISOPS-IAM')
    await selectEvent.select(entity2, 'egi.Portal')

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'entitiesGroups.0.value': '',
      'entitiesGroups.1.value': '',
      'entitiesEndpoints.0.value': 'IRISOPS-IAM',
      'entitiesEndpoints.1.value': 'egi.Portal',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add availability threshold', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '70',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add reliability threshold', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '80',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add uptime threshold', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '0.8',
      'unknownThreshold': '',
      'downtimeThreshold' : ''
    })
  })

  test('Test add unknown threshold', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.8' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '0.8',
      'downtimeThreshold' : ''
    })
  })

  test('Test add downtime threshold', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.8' } })

    expect(screen.getByTestId('form')).toHaveFormValues({
      'name': '',
      'disabled': false,
      'groupname': '',
      'description': '',
      'metricProfile': '',
      'aggregationProfile': '',
      'operationsProfile': '',
      'thresholdsProfile': '',
      'topologyType': '',
      'availabilityThreshold': '',
      'reliabilityThreshold': '',
      'uptimeThreshold': '',
      'unknownThreshold': '',
      'downtimeThreshold' : '0.8'
    })
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
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfile = screen.getAllByText(/select/i)[1]
    const aggregationProfile = screen.getAllByText(/select/i)[2]
    const operationsProfile = screen.getAllByText(/select/i)[3]
    const thresholdsProfile = screen.getAllByText(/select/i)[4]
    const topologyType = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfile, 'OPS_MONITOR_RHEL7')
    await selectEvent.select(aggregationProfile, 'ops-mon-critical')
    await selectEvent.select(operationsProfile, 'egi_ops')
    await selectEvent.select(thresholdsProfile, 'TEST_PROFILE')

    await selectEvent.select(topologyType, 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectTagName, 'monitored')

    await selectEvent.select(selectTagValue, 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    const selectExtensionName = card_groups.getAllByText(/select/i)[0]
    const selectExtensionValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectExtensionName, 'GLUE2EndpointImplementationName')

    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

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
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfile = screen.getAllByText(/select/i)[1]
    const aggregationProfile = screen.getAllByText(/select/i)[2]
    const operationsProfile = screen.getAllByText(/select/i)[3]
    const thresholdsProfile = screen.getAllByText(/select/i)[4]
    const topologyType = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfile, 'OPS_MONITOR_RHEL7')
    await selectEvent.select(aggregationProfile, 'ops-mon-critical')
    await selectEvent.select(operationsProfile, 'egi_ops')
    await selectEvent.select(thresholdsProfile, 'TEST_PROFILE')

    await selectEvent.select(topologyType, 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectTagName, 'monitored')

    await selectEvent.select(selectTagValue, 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    const selectExtensionName = card_groups.getAllByText(/select/i)[0]
    const selectExtensionValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectExtensionName, 'GLUE2EndpointImplementationName')

    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

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
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfile = screen.getAllByText(/select/i)[1]
    const aggregationProfile = screen.getAllByText(/select/i)[2]
    const operationsProfile = screen.getAllByText(/select/i)[3]
    const thresholdsProfile = screen.getAllByText(/select/i)[4]
    const topologyType = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfile, 'OPS_MONITOR_RHEL7')
    await selectEvent.select(aggregationProfile, 'ops-mon-critical')
    await selectEvent.select(operationsProfile, 'egi_ops')
    await selectEvent.select(thresholdsProfile, 'TEST_PROFILE')

    await selectEvent.select(topologyType, 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectTagName, 'monitored')

    await selectEvent.select(selectTagValue, 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    const selectExtensionName = card_groups.getAllByText(/select/i)[0]
    const selectExtensionValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectExtensionName, 'GLUE2EndpointImplementationName')

    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

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
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfile = screen.getAllByText(/select/i)[1]
    const aggregationProfile = screen.getAllByText(/select/i)[2]
    const operationsProfile = screen.getAllByText(/select/i)[3]
    const thresholdsProfile = screen.getAllByText(/select/i)[4]
    const topologyType = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfile, 'OPS_MONITOR_RHEL7')
    await selectEvent.select(aggregationProfile, 'ops-mon-critical')
    await selectEvent.select(operationsProfile, 'egi_ops')
    await selectEvent.select(thresholdsProfile, 'TEST_PROFILE')

    await selectEvent.select(topologyType, 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectTagName, 'monitored')

    await selectEvent.select(selectTagValue, 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    const selectExtensionName = card_groups.getAllByText(/select/i)[0]
    const selectExtensionValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectExtensionName, 'GLUE2EndpointImplementationName')

    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

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
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });

    const groupField = screen.getAllByText(/select/i)[0]
    const metricProfile = screen.getAllByText(/select/i)[1]
    const aggregationProfile = screen.getAllByText(/select/i)[2]
    const operationsProfile = screen.getAllByText(/select/i)[3]
    const thresholdsProfile = screen.getAllByText(/select/i)[4]
    const topologyType = screen.getAllByText(/select/i)[5]

    await selectEvent.select(groupField, 'ARGO')

    await selectEvent.select(metricProfile, 'OPS_MONITOR_RHEL7')
    await selectEvent.select(aggregationProfile, 'ops-mon-critical')
    await selectEvent.select(operationsProfile, 'egi_ops')
    await selectEvent.select(thresholdsProfile, 'TEST_PROFILE')

    await selectEvent.select(topologyType, 'Sites')

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }))

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectTagName, 'monitored')

    await selectEvent.select(selectTagValue, 'yes')

    fireEvent.click(card_groups.getByRole('button', { name: /add new extension/i }))

    const selectExtensionName = card_groups.getAllByText(/select/i)[0]
    const selectExtensionValue = card_groups.getAllByText(/select/i)[1]

    await selectEvent.select(selectExtensionName, 'GLUE2EndpointImplementationName')

    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

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
