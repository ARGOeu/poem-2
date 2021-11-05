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

jest.setTimeout(20000);

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
      value: "EGI*",
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
      value: "EGI*",
      context: "argo.endpoint.filter.tags"
    },
    {
      name: "NGI",
      value: "iris.ac.uk",
      context: "argo.group.filter.fields"
    },
    {
      name: "SITES",
      value: "dirac-durham",
      context: "argo.group.filter.fields"
    },
    {
      name: "info_ext_GLUE2ComputingShareMappingQueue",
      value: "condor",
      context: "argo.group.filter.tags.array"
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
  crud: true,
  tags: 'https://reports-tags.com',
  topologygroups: 'https://topology-groups.com',
  topologyendpoints: 'https://endpoints.com'
};


function renderListView() {
  const route = '/ui/reports';
  const history = createMemoryHistory({ initialEntries: [route] });

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
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderChangeView() {
  const route = '/ui/reports/Critical';
  const history = createMemoryHistory({ initialEntries: [route] });

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
            usergroups={['TEST', 'ARGO']}
            render={ props => <ReportsAdd
              {...props}
              webapitoken='token'
              webapireports={webapireports}
              webapimetric='https://mock.metric.com'
              webapiaggregation='https://mock.aggr.com'
              webapioperations='https://mock.operations.com'
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
})


describe('Tests for reports changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchReport: () => Promise.resolve(mockReport),
        fetchMetricProfiles: () => Promise.resolve(mockMetricProfiles),
        fetchAggregationProfiles: () => Promise.resolve(mockAggregationProfiles),
        fetchOperationsProfiles: () => Promise.resolve(mockOperationsProfiles),
        fetchReportsTopologyTags: () => Promise.resolve(mockReportsTopologyTags),
        fetchReportsTopologyGroups: () => Promise.resolve(mockReportsTopologyGroups),
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
    const groupField = screen.getByTestId('groupname');
    const metricProfileField = screen.getByTestId('metricProfile')
    const aggrProfileField = screen.getByTestId('aggregationProfile');
    const operationsProfileField = screen.getByTestId('operationsProfile')
    const topologyTypeField = screen.getByTestId('topologyType');
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
    expect(groupField.value).toBe('ARGO')
    expect(groupField).toBeEnabled();

    expect(metricProfileField.value).toBe('ARGO_MON_CRITICAL');
    expect(metricProfileField).toBeEnabled();
    expect(aggrProfileField.value).toBe('critical');
    expect(aggrProfileField).toBeEnabled();
    expect(operationsProfileField.value).toBe('egi_ops');
    expect(operationsProfileField).toBeEnabled();

    expect(topologyTypeField.value).toBe('Sites');

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
    expect(card_groups.getByText('EGI*')).toBeInTheDocument();
    selectEvent.openMenu(card_groups.getByText('Certified'));
    expect(card_groups.getByText('Candidate')).toBeInTheDocument();
    expect(card_groups.getByText('Closed')).toBeInTheDocument();
    expect(card_groups.getByText('Suspended')).toBeInTheDocument();
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument();
    selectEvent.openMenu(card_groups.getByText('Production'));
    expect(card_groups.getByText('PPS')).toBeInTheDocument();
    expect(card_groups.getByText('Test')).toBeInTheDocument();
    selectEvent.openMenu(card_groups.getByText('EGI*'));
    expect(card_groups.getByText('EOSC-hub')).toBeInTheDocument();
    expect(card_groups.getByText('EOSCCore')).toBeInTheDocument();
    expect(card_groups.getByText('FedCloud')).toBeInTheDocument();
    expect(card_groups.getAllByTestId(/remove/i)).toHaveLength(4);
    expect(card_groups.queryByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_groups.queryByRole('button', { name: /add new extension/i })).toBeInTheDocument();
    expect(card_groups.queryByText('Russia')).not.toBeInTheDocument();
    expect(card_groups.queryByText('RU-SARFTI')).not.toBeInTheDocument();
    expect(card_groups.queryByText('IRISOPS-IAM')).not.toBeInTheDocument();
    expect(card_groups.queryByText('DAVETESTSG')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_AEGIS_SERVICES')).not.toBeInTheDocument();
    expect(card_groups.queryByText('NGI_ARMGRID_SERVICES')).not.toBeInTheDocument();
    expect(card_groups.getByText('iris.ac.uk')).toBeInTheDocument();
    selectEvent.openMenu(card_groups.getByText('iris.ac.uk'))
    expect(card_groups.getByText('Russia')).toBeInTheDocument();
    expect(card_groups.queryByText('RU-SARFTI')).not.toBeInTheDocument();
    expect(card_groups.queryByText('IRISOPS-IAM')).not.toBeInTheDocument();
    expect(card_groups.getByText('dirac-durham')).toBeInTheDocument();
    selectEvent.openMenu(card_groups.getByText('dirac-durham'));
    expect(card_groups.getByText('RU-SARFTI')).toBeInTheDocument();
    expect(card_groups.getByText('IRISOPS-IAM')).toBeInTheDocument();
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
    expect(card_endpoints.getByText('EGI*')).toBeInTheDocument();
    expect(card_endpoints.getAllByTestId(/remove/i)).toHaveLength(3);
    expect(card_endpoints.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_endpoints.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument();
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();
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

  test('Test change report and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeReport.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByTestId(/removeTag-2/i));
    fireEvent.click(card_groups.getByText(/add new tag/i));

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    selectEvent.openMenu(selectTagName)
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    await selectEvent.select(selectTagName, 'monitored')

    selectEvent.openMenu(selectTagValue)
    expect(card_groups.getByText('yes')).toBeInTheDocument();
    expect(card_groups.getByText('no')).toBeInTheDocument();

    await selectEvent.select(selectTagValue, 'yes')

    expect(card_groups.queryByText(/select/i)).not.toBeInTheDocument();
    await selectEvent.select(card_groups.getByText('GLUE2ComputingShareMappingQueue'), 'GLUE2EndpointImplementationName')

    const selectExtensionValue = card_groups.getByText('condor');

    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    expect(selectExtensionValue).toBeInTheDocument();
    selectEvent.openMenu(selectExtensionValue)
    expect(card_groups.getByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.getByText('nordugrid-arc')).toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    await selectEvent.select(card_groups.getByText('dirac-durham'), 'IRISOPS-IAM');

    fireEvent.click(card_endpoints.getByTestId(/removeTag-0/i));
    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    selectEvent.openMenu(endpointExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    selectEvent.openMenu(endpointExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith({
        id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
        info: {
          name: 'Critical',
          description: 'More elaborate description of the critical report.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'infrastructure',
            value: 'Production'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'info_ext_GLUE2EndpointImplementationName',
            value: 'ARC-CE'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'scope',
            value: 'EGI*'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk'
          },
          {
            name: "NGI",
            value: "iris.ac.uk",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "dirac-durham",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "IRISOPS-IAM",
            context: "argo.group.filter.fields"
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          name: 'Critical',
          description: 'More elaborate description of the critical report.',
          groupname: 'TEST',
          apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('report');
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

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByTestId(/removeTag-2/i));
    fireEvent.click(card_groups.getByText(/add new tag/i));

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    selectEvent.openMenu(selectTagName)
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    await selectEvent.select(selectTagName, 'monitored')

    selectEvent.openMenu(selectTagValue)
    expect(card_groups.getByText('yes')).toBeInTheDocument();
    expect(card_groups.getByText('no')).toBeInTheDocument();

    await selectEvent.select(selectTagValue, 'yes')

    expect(card_groups.queryByText(/select/i)).not.toBeInTheDocument();
    await selectEvent.select(card_groups.getByText('GLUE2ComputingShareMappingQueue'), 'GLUE2EndpointImplementationName')

    const selectExtensionValue = card_groups.getByText('condor');

    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    expect(selectExtensionValue).toBeInTheDocument();
    selectEvent.openMenu(selectExtensionValue)
    expect(card_groups.getByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.getByText('nordugrid-arc')).toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    await selectEvent.select(card_groups.getByText('dirac-durham'), 'IRISOPS-IAM');

    fireEvent.click(card_endpoints.getByTestId(/removeTag-0/i));
    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    selectEvent.openMenu(endpointExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    selectEvent.openMenu(endpointExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith({
        id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
        info: {
          name: 'Critical',
          description: 'More elaborate description of the critical report.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'infrastructure',
            value: 'Production'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'info_ext_GLUE2EndpointImplementationName',
            value: 'ARC-CE'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'scope',
            value: 'EGI*'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk'
          },
          {
            name: "NGI",
            value: "iris.ac.uk",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "dirac-durham",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "IRISOPS-IAM",
            context: "argo.group.filter.fields"
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
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

  test('Test error changing report on web api without error message', async () => {
    mockChangeReport.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByTestId(/removeTag-2/i));
    fireEvent.click(card_groups.getByText(/add new tag/i));

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    selectEvent.openMenu(selectTagName)
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    await selectEvent.select(selectTagName, 'monitored')

    selectEvent.openMenu(selectTagValue)
    expect(card_groups.getByText('yes')).toBeInTheDocument();
    expect(card_groups.getByText('no')).toBeInTheDocument();

    await selectEvent.select(selectTagValue, 'yes')

    expect(card_groups.queryByText(/select/i)).not.toBeInTheDocument();
    await selectEvent.select(card_groups.getByText('GLUE2ComputingShareMappingQueue'), 'GLUE2EndpointImplementationName')

    const selectExtensionValue = card_groups.getByText('condor');

    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    expect(selectExtensionValue).toBeInTheDocument();
    selectEvent.openMenu(selectExtensionValue)
    expect(card_groups.getByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.getByText('nordugrid-arc')).toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    await selectEvent.select(card_groups.getByText('dirac-durham'), 'IRISOPS-IAM');

    fireEvent.click(card_endpoints.getByTestId(/removeTag-0/i));
    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    selectEvent.openMenu(endpointExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    selectEvent.openMenu(endpointExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith({
        id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
        info: {
          name: 'Critical',
          description: 'More elaborate description of the critical report.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'infrastructure',
            value: 'Production'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'info_ext_GLUE2EndpointImplementationName',
            value: 'ARC-CE'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'scope',
            value: 'EGI*'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk'
          },
          {
            name: "NGI",
            value: "iris.ac.uk",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "dirac-durham",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "IRISOPS-IAM",
            context: "argo.group.filter.fields"
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
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

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByTestId(/removeTag-2/i));
    fireEvent.click(card_groups.getByText(/add new tag/i));

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    selectEvent.openMenu(selectTagName)
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    await selectEvent.select(selectTagName, 'monitored')

    selectEvent.openMenu(selectTagValue)
    expect(card_groups.getByText('yes')).toBeInTheDocument();
    expect(card_groups.getByText('no')).toBeInTheDocument();

    await selectEvent.select(selectTagValue, 'yes')

    expect(card_groups.queryByText(/select/i)).not.toBeInTheDocument();
    await selectEvent.select(card_groups.getByText('GLUE2ComputingShareMappingQueue'), 'GLUE2EndpointImplementationName')

    const selectExtensionValue = card_groups.getByText('condor');

    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    expect(selectExtensionValue).toBeInTheDocument();
    selectEvent.openMenu(selectExtensionValue)
    expect(card_groups.getByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.getByText('nordugrid-arc')).toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    await selectEvent.select(card_groups.getByText('dirac-durham'), 'IRISOPS-IAM');

    fireEvent.click(card_endpoints.getByTestId(/removeTag-0/i));
    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    selectEvent.openMenu(endpointExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    selectEvent.openMenu(endpointExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith({
        id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
        info: {
          name: 'Critical',
          description: 'More elaborate description of the critical report.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'infrastructure',
            value: 'Production'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'info_ext_GLUE2EndpointImplementationName',
            value: 'ARC-CE'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'scope',
            value: 'EGI*'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk'
          },
          {
            name: "NGI",
            value: "iris.ac.uk",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "dirac-durham",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "IRISOPS-IAM",
            context: "argo.group.filter.fields"
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          name: 'Critical',
          description: 'More elaborate description of the critical report.',
          groupname: 'TEST',
          apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
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

  test('Test error changing report on internal API without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );
    mockChangeReport.mockReturnValueOnce( Promise.resolve({ ok: 'ok' }) );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change report');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'More elaborate description of the critical report.' } })

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByTestId(/removeTag-2/i));
    fireEvent.click(card_groups.getByText(/add new tag/i));

    const selectTagName = card_groups.getAllByText(/select/i)[0]
    const selectTagValue = card_groups.getAllByText(/select/i)[1]

    selectEvent.openMenu(selectTagName)
    expect(card_groups.getByText('certification')).toBeInTheDocument();
    expect(card_groups.getByText('monitored')).toBeInTheDocument();
    expect(card_groups.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument();

    await selectEvent.select(selectTagName, 'monitored')

    selectEvent.openMenu(selectTagValue)
    expect(card_groups.getByText('yes')).toBeInTheDocument();
    expect(card_groups.getByText('no')).toBeInTheDocument();

    await selectEvent.select(selectTagValue, 'yes')

    expect(card_groups.queryByText(/select/i)).not.toBeInTheDocument();
    await selectEvent.select(card_groups.getByText('GLUE2ComputingShareMappingQueue'), 'GLUE2EndpointImplementationName')

    const selectExtensionValue = card_groups.getByText('condor');

    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    expect(selectExtensionValue).toBeInTheDocument();
    selectEvent.openMenu(selectExtensionValue)
    expect(card_groups.getByText('ARC-CE')).toBeInTheDocument()
    expect(card_groups.getByText('nordugrid-arc')).toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, 'ARC-CE')

    await selectEvent.select(card_groups.getByText('dirac-durham'), 'IRISOPS-IAM');

    fireEvent.click(card_endpoints.getByTestId(/removeTag-0/i));
    fireEvent.click(card_endpoints.getByText(/add new extension/i))

    expect(card_endpoints.getAllByText(/select/i)).toHaveLength(2)

    const endpointExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const endpointExtensionValue = card_endpoints.getAllByText(/select/i)[1]

    expect(card_endpoints.queryByText('GLUE2ComputingShareMappingQueue')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    selectEvent.openMenu(endpointExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionName, 'GLUE2EndpointID')

    selectEvent.openMenu(endpointExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()

    await selectEvent.select(endpointExtensionValue, 'ce1.gridpp.ecdf.ed.ac.uk')

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeReport).toHaveBeenCalledWith({
        id: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
        info: {
          name: 'Critical',
          description: 'More elaborate description of the critical report.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'infrastructure',
            value: 'Production'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.group.filter.tags.array',
            name: 'info_ext_GLUE2EndpointImplementationName',
            value: 'ARC-CE'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'scope',
            value: 'EGI*'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk'
          },
          {
            name: "NGI",
            value: "iris.ac.uk",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "dirac-durham",
            context: "argo.group.filter.fields"
          },
          {
            name: "SITES",
            value: "IRISOPS-IAM",
            context: "argo.group.filter.fields"
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          name: 'Critical',
          description: 'More elaborate description of the critical report.',
          groupname: 'TEST',
          apiid: 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        }
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

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
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

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
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
        fetchReportsTopologyTags: () => Promise.resolve(mockReportsTopologyTags),
        fetchReportsTopologyGroups: () => Promise.resolve(mockReportsTopologyGroups),
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
    const groupField = screen.getByTestId('groupname');
    const metricProfileField = screen.getByTestId('metricProfile')
    const aggrProfileField = screen.getByTestId('aggregationProfile');
    const operationsProfileField = screen.getByTestId('operationsProfile')
    const topologyTypeField = screen.getByTestId('topologyType');
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
    expect(groupField.value).toBe('');
    expect(groupField).toBeEnabled();

    expect(metricProfileField.value).toBe('');
    expect(metricProfileField).toBeEnabled();
    expect(aggrProfileField.value).toBe('');
    expect(aggrProfileField).toBeEnabled();
    expect(operationsProfileField.value).toBe('');
    expect(operationsProfileField).toBeEnabled();

    expect(topologyTypeField.value).toBe('');

    expect(screen.getAllByTestId(/card/i)).toHaveLength(2);
    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    expect(card_groups.getAllByRole('textbox')).toHaveLength(2);
    expect(card_groups.queryAllByTestId(/remove/i)).toHaveLength(0);
    expect(card_groups.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_groups.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();
    expect(card_groups.getAllByText(/search/i)).toHaveLength(2);

    expect(card_endpoints.queryAllByRole('textbox')).toHaveLength(0);
    expect(card_endpoints.getByRole('button', { name: /add new tag/i })).toBeInTheDocument();
    expect(card_endpoints.getByRole('button', { name: /add new extension/i })).toBeInTheDocument();

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
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });
    fireEvent.change(screen.getByTestId('operationsProfile'), { target: { value: 'egi_ops' } })

    fireEvent.change(screen.getByTestId('topologyType'), { target: { value: 'Sites' } })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }));
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    const selectTagName1 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue1 = card_groups.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName1)
    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.getByText('monitored')).toBeInTheDocument()
    expect(card_groups.getByText('scope')).toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    await selectEvent.select(selectTagName1, 'certification')
    selectEvent.openMenu(selectTagValue1)
    expect(card_groups.getByText('Candidate')).toBeInTheDocument()
    expect(card_groups.getByText('Certified')).toBeInTheDocument()
    expect(card_groups.getByText('Closed')).toBeInTheDocument()
    expect(card_groups.getByText('Suspended')).toBeInTheDocument()
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue1, 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))
    const selectTagName2 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue2 = card_groups.getAllByText(/select/i)[1]
    await selectEvent.select(selectTagName2, 'monitored')
    selectEvent.openMenu(selectTagValue2)
    expect(card_groups.getByText('yes')).toBeInTheDocument()
    expect(card_groups.getByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue2, 'no')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new tag/i }));
    const selectTagName3 = card_endpoints.getAllByText(/select/i)[0]
    const selectTagValue3 = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName3)
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.getByText('production')).toBeInTheDocument()
    expect(card_endpoints.getByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    await selectEvent.select(selectTagName3, 'monitored')
    selectEvent.openMenu(selectTagValue3)
    expect(card_endpoints.getByText('yes')).toBeInTheDocument()
    expect(card_endpoints.getByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue3, 'yes')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new extension/i }))
    const selectExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const selectExtensionValue = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    await selectEvent.select(selectExtensionName, 'GLUE2EndpointID')
    selectEvent.openMenu(selectExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'])

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith({
        info: {
          name: 'OPS-MONITOR',
          description: 'A/R report for Operations services.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '0'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk, svr009.gla.scotgrid.ac.uk'
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          apiid: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          name: 'OPS-MONITOR',
          groupname: 'ARGO',
          description: 'A/R report for Operations services.'
        }
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
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });
    fireEvent.change(screen.getByTestId('operationsProfile'), { target: { value: 'egi_ops' } })

    fireEvent.change(screen.getByTestId('topologyType'), { target: { value: 'Sites' } })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }));
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    const selectTagName1 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue1 = card_groups.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName1)
    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.getByText('monitored')).toBeInTheDocument()
    expect(card_groups.getByText('scope')).toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    await selectEvent.select(selectTagName1, 'certification')
    selectEvent.openMenu(selectTagValue1)
    expect(card_groups.getByText('Candidate')).toBeInTheDocument()
    expect(card_groups.getByText('Certified')).toBeInTheDocument()
    expect(card_groups.getByText('Closed')).toBeInTheDocument()
    expect(card_groups.getByText('Suspended')).toBeInTheDocument()
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue1, 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))
    const selectTagName2 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue2 = card_groups.getAllByText(/select/i)[1]
    await selectEvent.select(selectTagName2, 'monitored')
    selectEvent.openMenu(selectTagValue2)
    expect(card_groups.getByText('yes')).toBeInTheDocument()
    expect(card_groups.getByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue2, 'no')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new tag/i }));
    const selectTagName3 = card_endpoints.getAllByText(/select/i)[0]
    const selectTagValue3 = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName3)
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.getByText('production')).toBeInTheDocument()
    expect(card_endpoints.getByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    await selectEvent.select(selectTagName3, 'monitored')
    selectEvent.openMenu(selectTagValue3)
    expect(card_endpoints.getByText('yes')).toBeInTheDocument()
    expect(card_endpoints.getByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue3, 'yes')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new extension/i }))
    const selectExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const selectExtensionValue = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    await selectEvent.select(selectExtensionName, 'GLUE2EndpointID')
    selectEvent.openMenu(selectExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'])

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith({
        info: {
          name: 'OPS-MONITOR',
          description: 'A/R report for Operations services.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '0'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk, svr009.gla.scotgrid.ac.uk'
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
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

  test('Test error adding a report in web api without error message', async () => {
    mockAddReport.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report/i }).textContent).toBe('Add report');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'OPS-MONITOR' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A/R report for Operations services.' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });
    fireEvent.change(screen.getByTestId('operationsProfile'), { target: { value: 'egi_ops' } })

    fireEvent.change(screen.getByTestId('topologyType'), { target: { value: 'Sites' } })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }));
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    const selectTagName1 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue1 = card_groups.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName1)
    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.getByText('monitored')).toBeInTheDocument()
    expect(card_groups.getByText('scope')).toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    await selectEvent.select(selectTagName1, 'certification')
    selectEvent.openMenu(selectTagValue1)
    expect(card_groups.getByText('Candidate')).toBeInTheDocument()
    expect(card_groups.getByText('Certified')).toBeInTheDocument()
    expect(card_groups.getByText('Closed')).toBeInTheDocument()
    expect(card_groups.getByText('Suspended')).toBeInTheDocument()
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue1, 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))
    const selectTagName2 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue2 = card_groups.getAllByText(/select/i)[1]
    await selectEvent.select(selectTagName2, 'monitored')
    selectEvent.openMenu(selectTagValue2)
    expect(card_groups.getByText('yes')).toBeInTheDocument()
    expect(card_groups.getByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue2, 'no')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new tag/i }));
    const selectTagName3 = card_endpoints.getAllByText(/select/i)[0]
    const selectTagValue3 = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName3)
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.getByText('production')).toBeInTheDocument()
    expect(card_endpoints.getByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    await selectEvent.select(selectTagName3, 'monitored')
    selectEvent.openMenu(selectTagValue3)
    expect(card_endpoints.getByText('yes')).toBeInTheDocument()
    expect(card_endpoints.getByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue3, 'yes')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new extension/i }))
    const selectExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const selectExtensionValue = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    await selectEvent.select(selectExtensionName, 'GLUE2EndpointID')
    selectEvent.openMenu(selectExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'])

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith({
        info: {
          name: 'OPS-MONITOR',
          description: 'A/R report for Operations services.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '0'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk, svr009.gla.scotgrid.ac.uk'
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
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
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });
    fireEvent.change(screen.getByTestId('operationsProfile'), { target: { value: 'egi_ops' } })

    fireEvent.change(screen.getByTestId('topologyType'), { target: { value: 'Sites' } })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }));
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    const selectTagName1 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue1 = card_groups.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName1)
    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.getByText('monitored')).toBeInTheDocument()
    expect(card_groups.getByText('scope')).toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    await selectEvent.select(selectTagName1, 'certification')
    selectEvent.openMenu(selectTagValue1)
    expect(card_groups.getByText('Candidate')).toBeInTheDocument()
    expect(card_groups.getByText('Certified')).toBeInTheDocument()
    expect(card_groups.getByText('Closed')).toBeInTheDocument()
    expect(card_groups.getByText('Suspended')).toBeInTheDocument()
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue1, 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))
    const selectTagName2 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue2 = card_groups.getAllByText(/select/i)[1]
    await selectEvent.select(selectTagName2, 'monitored')
    selectEvent.openMenu(selectTagValue2)
    expect(card_groups.getByText('yes')).toBeInTheDocument()
    expect(card_groups.getByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue2, 'no')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new tag/i }));
    const selectTagName3 = card_endpoints.getAllByText(/select/i)[0]
    const selectTagValue3 = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName3)
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.getByText('production')).toBeInTheDocument()
    expect(card_endpoints.getByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    await selectEvent.select(selectTagName3, 'monitored')
    selectEvent.openMenu(selectTagValue3)
    expect(card_endpoints.getByText('yes')).toBeInTheDocument()
    expect(card_endpoints.getByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue3, 'yes')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new extension/i }))
    const selectExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const selectExtensionValue = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    await selectEvent.select(selectExtensionName, 'GLUE2EndpointID')
    selectEvent.openMenu(selectExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'])

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith({
        info: {
          name: 'OPS-MONITOR',
          description: 'A/R report for Operations services.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '0'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk, svr009.gla.scotgrid.ac.uk'
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          apiid: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          name: 'OPS-MONITOR',
          groupname: 'ARGO',
          description: 'A/R report for Operations services.'
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
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metricProfile'), { target: { value: 'OPS_MONITOR_RHEL7' } });
    fireEvent.change(screen.getByTestId('aggregationProfile'), { target: { value: 'ops-mon-critical' } });
    fireEvent.change(screen.getByTestId('operationsProfile'), { target: { value: 'egi_ops' } })

    fireEvent.change(screen.getByTestId('topologyType'), { target: { value: 'Sites' } })

    const card_groups = within(screen.getByTestId('card-group-of-groups'));
    const card_endpoints = within(screen.getByTestId('card-group-of-endpoints'));

    fireEvent.click(card_groups.getByRole('button', { name: /add new tag/i }));
    expect(card_groups.queryByText('certification')).not.toBeInTheDocument()
    expect(card_groups.queryByText('infrastructure')).not.toBeInTheDocument()
    expect(card_groups.queryByText('monitored')).not.toBeInTheDocument()
    expect(card_groups.queryByText('scope')).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    const selectTagName1 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue1 = card_groups.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName1)
    expect(card_groups.getByText('certification')).toBeInTheDocument()
    expect(card_groups.getByText('infrastructure')).toBeInTheDocument()
    expect(card_groups.getByText('monitored')).toBeInTheDocument()
    expect(card_groups.getByText('scope')).toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2ComputingShareMappingQueue/i)).not.toBeInTheDocument()
    expect(card_groups.queryByText(/GLUE2EndpointImplementationName/i)).not.toBeInTheDocument()
    await selectEvent.select(selectTagName1, 'certification')
    selectEvent.openMenu(selectTagValue1)
    expect(card_groups.getByText('Candidate')).toBeInTheDocument()
    expect(card_groups.getByText('Certified')).toBeInTheDocument()
    expect(card_groups.getByText('Closed')).toBeInTheDocument()
    expect(card_groups.getByText('Suspended')).toBeInTheDocument()
    expect(card_groups.getByText('Uncertified')).toBeInTheDocument()
    expect(card_groups.queryByText('PPS')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Production')).not.toBeInTheDocument()
    expect(card_groups.queryByText('Test')).not.toBeInTheDocument()
    expect(card_groups.queryByText('yes')).not.toBeInTheDocument()
    expect(card_groups.queryByText('no')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue1, 'Certified')

    fireEvent.click(card_groups.getByText(/add new tag/i))
    const selectTagName2 = card_groups.getAllByText(/select/i)[0]
    const selectTagValue2 = card_groups.getAllByText(/select/i)[1]
    await selectEvent.select(selectTagName2, 'monitored')
    selectEvent.openMenu(selectTagValue2)
    expect(card_groups.getByText('yes')).toBeInTheDocument()
    expect(card_groups.getByText('no')).toBeInTheDocument()
    expect(card_groups.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_groups.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_groups.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor')).not.toBeInTheDocument()
    expect(card_groups.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_groups.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_groups.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_groups.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue2, 'no')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new tag/i }));
    const selectTagName3 = card_endpoints.getAllByText(/select/i)[0]
    const selectTagValue3 = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectTagName3)
    expect(card_endpoints.getByText('monitored')).toBeInTheDocument()
    expect(card_endpoints.getByText('production')).toBeInTheDocument()
    expect(card_endpoints.getByText('scope')).toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointID')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('GLUE2EndpointImplementationName')).not.toBeInTheDocument()
    await selectEvent.select(selectTagName3, 'monitored')
    selectEvent.openMenu(selectTagValue3)
    expect(card_endpoints.getByText('yes')).toBeInTheDocument()
    expect(card_endpoints.getByText('no')).toBeInTheDocument()
    expect(card_endpoints.queryByText('EGI')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSC-hub')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('EOSCCore')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('FedCloud')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('condor_q2d')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('eddie')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ce1.gridpp.ecdf.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('svr009.gla.scotgrid.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('t3-mw1.ph.ed.ac.uk')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectTagValue3, 'yes')

    fireEvent.click(card_endpoints.getByRole('button', { name: /add new extension/i }))
    const selectExtensionName = card_endpoints.getAllByText(/select/i)[0]
    const selectExtensionValue = card_endpoints.getAllByText(/select/i)[1]
    selectEvent.openMenu(selectExtensionName)
    expect(card_endpoints.getByText('GLUE2EndpointID')).toBeInTheDocument()
    expect(card_endpoints.getByText('GLUE2EndpointImplementationName')).toBeInTheDocument()
    await selectEvent.select(selectExtensionName, 'GLUE2EndpointID')
    selectEvent.openMenu(selectExtensionValue)
    expect(card_endpoints.getByText('ce1.gridpp.ecdf.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('svr009.gla.scotgrid.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.getByText('t3-mw1.ph.ed.ac.uk')).toBeInTheDocument()
    expect(card_endpoints.queryByText('ARC-CE')).not.toBeInTheDocument()
    expect(card_endpoints.queryByText('nordugrid-arc')).not.toBeInTheDocument()
    await selectEvent.select(selectExtensionValue, ['ce1.gridpp.ecdf.ed.ac.uk', 'svr009.gla.scotgrid.ac.uk'])

    fireEvent.change(screen.getByLabelText(/availability/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/reliability/i), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText(/uptime/i), { target: { value: '0.8' } });
    fireEvent.change(screen.getByLabelText(/unknown/i), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText(/downtime/i), { target: { value: '0.1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddReport).toHaveBeenCalledWith({
        info: {
          name: 'OPS-MONITOR',
          description: 'A/R report for Operations services.'
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
          }
        ],
        filter_tags: [
          {
            context: 'argo.group.filter.tags.array',
            name: 'certification',
            value: 'Certified'
          },
          {
            context: 'argo.group.filter.tags',
            name: 'monitored',
            value: '0'
          },
          {
            context: 'argo.endpoint.filter.tags',
            name: 'monitored',
            value: '1'
          },
          {
            context: 'argo.endpoint.filter.tags.array',
            name: 'info_ext_GLUE2EndpointID',
            value: 'ce1.gridpp.ecdf.ed.ac.uk, svr009.gla.scotgrid.ac.uk'
          }
        ],
        topology_schema: {
          group: {
            type: 'NGI',
            group: {
              type: 'SITES'
            }
          }
        }
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/reports/',
        {
          apiid: 'Ohs2duRu-tU6N-mF3Q-jV8F-Wiush8ieR7me',
          name: 'OPS-MONITOR',
          groupname: 'ARGO',
          description: 'A/R report for Operations services.'
        }
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
