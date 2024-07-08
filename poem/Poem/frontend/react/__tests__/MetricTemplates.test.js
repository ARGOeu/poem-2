import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ListOfMetrics } from '../Metrics';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { QueryClientProvider, QueryClient, setLogger } from 'react-query'
import { MetricTemplateComponent, MetricTemplateVersionDetails } from '../MetricTemplates';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

jest.setTimeout(50000);

const mockBulkDeleteMetrics = jest.fn();
const mockImportMetrics = jest.fn();
const mockChangeObject = jest.fn();
const mockAddObject = jest.fn();

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


const mockListOfMetricTemplates = [
  {
    id: '1',
    name: 'argo.AMS-Check',
    mtype: 'Active',
    description: 'Some description of argo.AMS-Check metric template.',
    ostag: ['CentOS 6', 'CentOS 7'],
    tags: ['test_tag1', 'test_tag2'],
    tenants: ["tenant1", "tenant2"],
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
    parameter: [
      { key: '--project', value: 'EGI' }
    ]
  },
  {
    id: 3,
    name: 'argo.AMS-Publisher',
    mtype: 'Active',
    tags: ['internal'],
    probeversion: 'ams-publisher-probe (0.1.12)',
    ostag: ['CentOS 7'],
    tenants: ["tenant1"],
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
    parameter: [
      { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock'}
    ]
  },
  {
    id: 2,
    name: 'org.apel.APEL-Pub',
    mtype: 'Passive',
    description: '',
    ostag: [],
    tags: [],
    tenants: [],
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
    parameter: []
  }
];

const mockTenantListOfMetricTemplates = [
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
    parameter: [
      { key: '--project', value: 'EGI' }
    ]
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
    parameter: [
      { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock'}
    ]
  },
  {
    id: 15,
    name: 'argo.POEM-API-MON',
    mtype: 'Active',
    tags: [],
    probeversion: 'poem-probe (0.1.12)',
    ostag: ['CentOS 7'],
    description: '',
    parent: '',
    probeexecutable: 'poem-probe',
    config: [
      { key: 'interval', value: '5' },
      { key: 'maxCheckAttempts', value: '3' },
      { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
      { key: 'retryInterval', value: '5' },
      { key: 'timeout', value: '60' }
    ],
    attribute: [
      { key: 'POEM_PROFILE', value: '-r' },
      { key: 'NAGIOS_HOST_CERT', value: '--cert' },
      { key: 'NAGIOS_HOST_KEY', value: '--key' },
      { key: 'POEM_TOKEN', value: '--token' }
    ]
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
    parameter: []
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
  parameter: [
    { key: '--project', value: 'EGI' }
  ]
};

const mockMetricTemplateWithDependency = {
  id: 422,
  name: "srce.gridproxy.validity",
  mtype: "Active",
  tags: [
    "test_tag1",
    "test_tag2",
    "internal"
  ],
  probeversion: "GridProxy-probe (0.2.0)",
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
  dependency: [
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
  parameter: []
}

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
  },
  {
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
},
];

const mockPassiveMetricTemplate = {
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
  parameter: []
};

const mockMetricTemplateVersions = [
  {
    id: '13',
    object_repr: 'argo.AMS-Check [ams-probe (0.1.12)]',
    fields: {
      name: 'argo.AMS-Check',
      mtype: 'Active',
      tags: ['test_tag1', 'test_tag2'],
      probeversion: 'ams-probe (0.1.12)',
      description: 'Some description of argo.AMS-Check metric template.',
      parent: '',
      probeexecutable: 'ams-probe',
      config: [
        { key: 'maxCheckAttempts', value: '4' },
        { key: 'timeout', value: '70' },
        { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
        { key: 'interval', value: '5' },
        { key: 'retryInterval', value: '3' }
      ],
      attribute: [
        { key: 'argo.ams_TOKEN', value: '--token' }
      ],
      dependency: [],
      flags: [{ key: 'OBSESS', value: '1' }],
      parameter: [{ key: '--project', value: 'EGI' }]
    },
    user: 'testuser',
    date_created: '2020-01-01 00:00:00',
    comment: 'Changed probekey. Added tags field "test_tag2".',
    version: '0.1.12'
  },
  {
    id: '4',
    object_repr: 'argo.AMS-Check [ams-probe (0.1.11)]',
    fields: {
      name: 'argo.AMS-Check',
      mtype: 'Active',
      tags: ['test_tag1'],
      probeversion: 'ams-probe (0.1.11)',
      description: 'Some description of argo.AMS-Check metric template.',
      parent: '',
      probeexecutable: 'ams-probe',
      config: [
        { key: 'maxCheckAttempts', value: '4' },
        { key: 'timeout', value: '70' },
        { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
        { key: 'interval', value: '5' },
        { key: 'retryInterval', value: '3' }
      ],
      attribute: [
        { key: 'argo.ams_TOKEN', value: '--token' }
      ],
      dependency: [],
      flags: [{ key: 'OBSESS', value: '1' }],
      parameter: [{ key: '--project', value: 'EGI' }]
    },
    user: 'testuser',
    date_created: '2019-10-01 00:00:00',
    comment: 'Initial version.',
    version: '0.1.11'
  }
];

const amsProbeVersions = [
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
  }
];

const passiveMetricTemplateVersions = [
  {
    id: "74",
    object_repr: "org.apel.APEL-Pub",
    fields: {
      name: "org.apel.APEL-Pub",
      mtype: "Passive",
      tags: [],
      probeversion: "",
      description: "",
      parent: "",
      probeexecutable: "",
      config: [],
      attribute: [],
      dependency: [],
      flags: [
        { key: "OBSESS", value: "1" },
        { key: "PASSIVE", value: "1" }
      ],
      parameter: []
    },
    user: "poem",
    date_created: "2019-12-09 09:24:20",
    comment: "Initial version.",
    version: "20191209-092420"
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
  },
  {
    id: 4,
    name: "deprecated"
  }
]

const mockTenants = [
  {
    name: "tenant1",
    schema_name: "tenant1_schema",
    domain_url: "tenant1.test.com",
    created_on: "2023-08-23",
    nr_metrics: 48,
    nr_probes: 24,
    combined: false
  },
  {
    name: "tenant2",
    schema_name: "tenant2_schema",
    domain_url: "tenant2.test.com",
    created_on: "2023-08-23",
    nr_metrics: 12,
    nr_probes: 7,
    combined: true
  },
  {
    name: "SuperPOEM Tenant",
    schema_name: "public",
    domain_url: "test.com",
    created_on: "2023-08-23",
    nr_metrics: 354, 
    nr_probes: 111,
    combined: false
  }
]


function renderListView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}metrictemplates`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ListOfMetrics type='metrictemplates' publicView={ true } />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <ListOfMetrics type="metrictemplates" />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderTenantListView() {
  const route = '/ui/administration/metrictemplates';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <ListOfMetrics type='metrictemplates' isTenantSchema={true} />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderChangeView(options = {}) {
  const passive = options.passive ? options.passive : false;
  const publicView = options.publicView ? options.publicView : false;
  const withDependency = options.withDependency ? options.withDependency : false

  const metric = withDependency ? "srce.gridproxy.validity" : passive ? "org.apel.APEL-Pub" : "argo.AMS-Check"

  const route = `/ui/${publicView ? 'public_' : ''}metrictemplates/${metric}`

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_metrictemplates/:name"
                element={ <MetricTemplateComponent publicView={true} /> }
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
                path='/ui/metrictemplates/:name'
                element={ <MetricTemplateComponent /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = '/ui/metrictemplates/add';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <MetricTemplateComponent addview={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderCloneView(options = {passive: false}) {
  const route = `/ui/metrictemplates/${options.passive ? 'org.apel.APEL-Pub' : 'argo.AMS-Check'}/clone`

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/metrictemplates/:name/clone"
              element={ <MetricTemplateComponent cloneview={true} /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderTenantChangeView(options = { passive: false }) {
  const route = `/ui/administration/metrictemplates/${options.passive ? 'org.apel.APEL-Pub' : 'argo.AMS-Check'}`;

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [route] }>
          <Routes>
            <Route
              path="/ui/administration/metrictemplates/:name"
              element={ <MetricTemplateComponent tenantview={true} /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView(options = { passive: false }) {
  const route = `/ui/metrictemplates/${options.passive ? 'org.apel.APEL-Pub' : 'argo.AMS-Check'}/history/${options.passive ? '20191209-092420' : '0.1.12'}`

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/metrictemplates/:name/history/:version"
              element={ <MetricTemplateVersionDetails /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
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

            case "/api/v2/internal/tenants":
              return Promise.resolve(mockTenants)

            case "/api/v2/internal/public_tenants":
              return Promise.resolve(mockTenants)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/public_mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(mockMetricTags)

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
      // double column header length because search fields are also th
      expect(screen.getAllByRole('columnheader')).toHaveLength(12)
    })

    expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template to change')

    expect(screen.getByRole('columnheader', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getByRole("columnheader", { name: /tenants/i }).textContent).toBe("Tenants")
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Passive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'internal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deprecated' })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "tenant1" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "tenant2" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "SuperPOEM Tenant" })).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2tenant1tenant2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternaltenant1')
    expect(screen.getByTestId('checkbox-argo.AMS-Check')).toBeEnabled();
    expect(screen.getByTestId('checkbox-argo.AMS-Publisher')).toBeEnabled();
    expect(screen.getByTestId('checkbox-org.apel.APEL-Pub')).toBeEnabled();
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('org.apel.APEL-PubPassivenonenone')
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

    await waitFor(() => {
      // double column header length because search fields are also th
      expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    })

    expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template for details')

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i }).textContent).toBe('Name');
    expect(screen.getByRole('columnheader', { name: /probe/i }).textContent).toBe('Probe version');
    expect(screen.getByRole('columnheader', { name: /type/i }).textContent).toBe('Type');
    expect(screen.getByRole('columnheader', { name: /tag/i }).textContent).toBe('Tag');
    expect(screen.getByRole("columnheader", { name: /tenants/i }).textContent).toBe("Tenants")
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getAllByRole('option', { name: 'Show all' })).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Passive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test_tag2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'internal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deprecated' })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "tenant1" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "tenant2" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "SuperPOEM Tenant" })).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2tenant1tenant2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternaltenant1')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('3org.apel.APEL-PubPassivenonenone')
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
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(48);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('argo.AMS-Checkams-probe (0.1.12)Activetest_tag1test_tag2tenant1tenant2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternaltenant1')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[1], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('argo.AMS-Publisherams-publisher-probe (0.1.12)Activeinternaltenant1')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
  })

  test('Test bulk delete metric templates', async () => {
    mockBulkDeleteMetrics.mockReturnValueOnce(
      Promise.resolve({
        info: 'Metric templates argo.AMS-Check, org.apel.APEL-Pub successfully deleted.'
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
        info: 'Metric templates argo.AMS-Check, argo.AMS-Publisher successfully deleted.'
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
        info: 'Metric template argo.AMS-Check successfully deleted.',
        warning: 'Metric template org.apel.APEL-Pub not deleted: something went wrong'
      })
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
        warning: 'Metric template argo.AMS-Check, org.apel.APEL-Pub not deleted: something went wrong'
      }),
    )

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
    mockBulkDeleteMetrics.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an error.')
    } )

    renderListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
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
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error deleting metric templates',
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
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(mockMetricTags)

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
      expect(screen.getAllByRole("columnheader")).toHaveLength(10)
    })

    expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template to change')

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
      expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    })

    expect(screen.getByRole('heading', {name: /metric/i}).textContent).toBe('Select metric template for details')

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
              return Promise.resolve(mockTenantListOfMetricTemplates)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

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

    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    })

    expect(screen.getByRole('heading', { name: /metric/i }).textContent).toBe('Select metric template for details')

    expect(screen.getByRole('columnheader', { name: "#" })).toBeInTheDocument();
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
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(46);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('row', { name: /poem/i }).textContent).toBe('3argo.POEM-API-MONpoem-probe (0.1.12)ActiveCentOS 7none')
    expect(screen.getByRole('row', { name: /apel/i }).textContent).toBe('4org.apel.APEL-PubPassivenone')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /poem-api/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.POEM-API-MON');
    expect(screen.getByRole('link', { name: /poem-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/poem-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /apel/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/org.apel.APEL-Pub');
    expect(screen.queryByTestId('checkbox-argo.AMS-Check')).not.toBeInTheDocument()
    expect(screen.queryByTestId('checkbox-argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByTestId('checkbox-argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByTestId('checkbox-argo.POEM-API-MON')).not.toBeInTheDocument()
    expect(screen.queryByTestId('checkbox-org.apel.APEL-Pub')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test filter metric templates list', async () => {
    renderTenantListView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(12)
    })

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: 'argo' } });
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(47);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('2argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('row', { name: /poem/i }).textContent).toBe('3argo.POEM-API-MONpoem-probe (0.1.12)ActiveCentOS 7none')
    expect(screen.getByRole('link', { name: /argo.ams-check/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Check');
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')
    expect(screen.getByRole('link', { name: /poem-api/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.POEM-API-MON')
    expect(screen.getByRole('link', { name: /poem-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/poem-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[2], { target: { value: 'internal' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-publisher/i }).textContent).toBe('1argo.AMS-Publisherams-publisher-probe (0.1.12)ActiveCentOS 7internal')
    expect(screen.getByRole('link', { name: /argo.ams-publisher/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Publisher');
    expect(screen.getByRole('link', { name: /ams-publisher-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-publisher-probe/history/0.1.12')

    fireEvent.change(screen.getAllByDisplayValue('Show all')[1], { target: { value: 'CentOS 6' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /no/i }).textContent).toBe('No metric templates');

    fireEvent.change(screen.getByDisplayValue('internal'), { target: { value: 'Show all' } })
    expect(screen.getAllByRole('row')).toHaveLength(52);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(49);
    expect(screen.getByRole('row', { name: /ams-check/i }).textContent).toBe('1argo.AMS-Checkams-probe (0.1.12)ActiveCentOS 6, CentOS 7test_tag1test_tag2')
    expect(screen.getByRole('link', { name: /ams-probe/i }).closest('a')).toHaveAttribute('href', '/ui/probes/ams-probe/history/0.1.12')
  })
})


describe('Test metric template changeview on SuperPOEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(NotificationManager, 'warning');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/public_metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/metrictemplates/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplate)

            case '/api/v2/internal/public_metrictemplates/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplate)

            case '/api/v2/internal/metrictemplates/srce.gridproxy.validity':
              return Promise.resolve(mockMetricTemplateWithDependency)

            case '/api/v2/internal/public_metrictemplates/srce.gridproxy.validity':
              return Promise.resolve(mockMetricTemplateWithDependency)

            case '/api/v2/internal/metrictemplates/org.apel.APEL-Pub':
              return Promise.resolve(mockPassiveMetricTemplate)

            case '/api/v2/internal/public_metrictemplates/org.apel.APEL-Pub':
              return Promise.resolve(mockPassiveMetricTemplate)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/public_mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/public_metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)

            case '/api/v2/internal/public_version/probe':
              return Promise.resolve(mockProbeVersions)
          }
        },
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template');

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Active')
    const probeField = screen.getByText('ams-probe (0.1.12)')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagsElement = screen.getByLabelText('Tags:')

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
    const parentField = screen.getByText(/select/i)

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(typeField).toBeEnabled()

    expect(screen.queryByText('Passive')).not.toBeInTheDocument()
    selectEvent.openMenu(typeField)
    expect(screen.getByText('Passive')).toBeInTheDocument()

    expect(probeField).toBeEnabled()

    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField)
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(groupField).not.toBeInTheDocument();

    expect(tagsElement).toBeInTheDocument()
    expect(screen.getByText("test_tag1")).toBeInTheDocument()
    expect(screen.getByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /probe executable/i })).toBeInTheDocument()
    expect(executableField.value).toBe('ams-probe');
    expect(screen.getByRole("heading", { name: "config" })).toBeInTheDocument()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('4');
    expect(configVal1).toBeEnabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('70');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5');
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeEnabled()
    expect(screen.getByRole("heading", { name: /attributes/i })).toBeInTheDocument()
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeVal.value).toBe('--token');
    expect(screen.queryByRole("heading", { name: /dependency/i })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /parameter/i })).toBeInTheDocument()
    expect(parameterKey.value).toBe('--project');
    expect(parameterVal.value).toBe('EGI');
    expect(screen.getByRole("heading", { name: /flags/i })).toBeInTheDocument()
    expect(flagKey.value).toBe('OBSESS');
    expect(flagVal.value).toBe('1');

    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();

    expect(screen.getByTestId("attributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("attributes.addnew"))

    expect(screen.queryByTestId("dependency")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.addnew")).not.toBeInTheDocument()

    expect(screen.getByTestId("parameter.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("parameter.addnew")).toBeInTheDocument()

    expect(screen.getByTestId("flags.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("flags.addnew")).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /parent/i })).toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check/history');
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/argo.AMS-Check/clone');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that page renders properly if metric template with dependency', async () => {
    renderChangeView({ withDependency: true });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole('heading', { name: /change metric/i }).textContent).toBe('Change metric template');

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Active')
    const probeField = screen.getByText('GridProxy-probe (0.2.0)')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagsElement = screen.getByLabelText('Tags:')

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
    const attributeKey1 = screen.getByTestId('attributes.0.key');
    const attributeVal1 = screen.getByTestId('attributes.0.value')
    const attributeKey2 = screen.getByTestId('attributes.1.key');
    const attributeVal2 = screen.getByTestId('attributes.1.value')
    const dependencyKey = screen.getByTestId("dependency.0.key")
    const dependencyVal = screen.getByTestId("dependency.0.value")
    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.getByTestId('flags.1.key');
    const flagVal2 = screen.getByTestId('flags.1.value');
    const flagKey3 = screen.getByTestId('flags.2.key');
    const flagVal3 = screen.getByTestId('flags.2.value');
    const parentField = screen.getByText(/select/i)

    expect(nameField.value).toBe("srce.gridproxy.validity");
    expect(typeField).toBeEnabled()

    expect(screen.queryByText('Passive')).not.toBeInTheDocument()
    selectEvent.openMenu(typeField)
    expect(screen.getByText('Passive')).toBeInTheDocument()

    expect(probeField).toBeEnabled()

    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField)
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField.value).toBe('argo-probe-globus (0.2.0)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe("")
    expect(groupField).not.toBeInTheDocument();

    expect(tagsElement).toBeInTheDocument()
    expect(screen.getByText("test_tag1")).toBeInTheDocument()
    expect(screen.getByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /probe executable/i })).toBeInTheDocument()
    expect(executableField.value).toBe('GridProxy-probe');
    expect(screen.getByRole("heading", { name: "config" })).toBeInTheDocument()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('3');
    expect(configVal1).toBeEnabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('30');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo/probes/globus');
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('15');
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeEnabled()
    expect(screen.getByRole("heading", { name: /attributes/i })).toBeInTheDocument()
    expect(attributeKey1.value).toBe('VONAME');
    expect(attributeVal1.value).toBe('--vo');
    expect(attributeKey2.value).toBe('X509_USER_PROXY');
    expect(attributeVal2.value).toBe('-x');
    expect(screen.getByRole("heading", { name: /dependency/i })).toBeInTheDocument()
    expect(dependencyKey.value).toBe("hr.srce.GridProxy-Get")
    expect(dependencyVal.value).toBe("0")
    expect(dependencyKey).toBeDisabled()
    expect(dependencyVal).toBeDisabled()
    expect(screen.getByRole("heading", { name: /parameter/i })).toBeInTheDocument()
    expect(parameterKey.value).toBe("");
    expect(parameterVal.value).toBe("");
    expect(screen.getByRole("heading", { name: /flags/i })).toBeInTheDocument()
    expect(flagKey1.value).toBe("NOHOSTNAME")
    expect(flagVal1.value).toBe("1")
    expect(flagKey2.value).toBe("VO")
    expect(flagVal2.value).toBe("1")
    expect(flagKey3.value).toBe("NOPUBLISH")
    expect(flagVal3.value).toBe("1")

    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument()
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument()

    expect(screen.getByTestId("attributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("attributes.1.remove")).toBeInTheDocument()
    expect(screen.getByTestId("attributes.addnew"))

    expect(screen.queryByTestId("dependency.0.remove")).toBeInTheDocument()
    expect(screen.queryByTestId("dependency.addnew")).not.toBeInTheDocument()

    expect(screen.queryByTestId("parameter.0.remove")).not.toBeInTheDocument()
    expect(screen.getByTestId("parameter.addnew")).toBeInTheDocument()

    expect(screen.getByTestId("flags.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("flags.1.remove")).toBeInTheDocument()
    expect(screen.getByTestId("flags.2.remove")).toBeInTheDocument()
    expect(screen.getByTestId("flags.addnew")).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /parent/i })).toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/srce.gridproxy.validity/history');
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/srce.gridproxy.validity/clone');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public changeview for active metric template renders properly', async () => {
    renderChangeView({ publicView: true });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /metric template/i }).textContent).toBe('Metric template details');

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i);

    const tagBadge1 = screen.getByText(/test_tag1/i);
    const tagBadge2 = screen.getByText(/test_tag2/i);
    const tagBadge3 = screen.queryByText("internal")
    const tagBadge4 = screen.queryByText("deprecated")

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

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');

    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');

    const parentField = screen.getByTestId('parent');

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(nameField).toBeDisabled()

    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()

    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();

    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();

    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(descriptionField).toBeDisabled();

    expect(groupField).not.toBeInTheDocument();

    expect(tagBadge1.textContent).toBe('test_tag1');
    expect(tagBadge2.textContent).toBe('test_tag2');
    expect(tagBadge3).not.toBeInTheDocument()
    expect(tagBadge4).not.toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /probe executable/i })).toBeInTheDocument()
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()

    expect(screen.getByRole("heading", { name: "config" })).toBeInTheDocument()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('4');
    expect(configVal1).toBeDisabled()
    expect(configVal1).toBeDisabled()
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('70');
    expect(configVal2).toBeDisabled()
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3).toBeDisabled()
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5');
    expect(configVal4).toBeDisabled()
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeDisabled()
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /attributes/i })).toBeInTheDocument()
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /dependency/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /parameter/i })).toBeInTheDocument()
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /flags/i })).toBeInTheDocument()
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /parent/i })).toBeInTheDocument()
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/argo.AMS-Check/history');
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test that public changeview for active metric template renders properly if dependency', async () => {
    renderChangeView({ publicView: true, withDependency: true });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /metric template/i }).textContent).toBe('Metric template details');

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i);

    const tagBadge1 = screen.getByText(/test_tag1/i);
    const tagBadge2 = screen.getByText(/test_tag2/i);
    const tagBadge3 = screen.queryByText("internal")
    const tagBadge4 = screen.queryByText("deprecated")

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

    const attributeKey1 = screen.getByTestId('attributes.0.key');
    const attributeVal1 = screen.getByTestId('attributes.0.value')
    const attributeKey2 = screen.getByTestId('attributes.1.key');
    const attributeVal2 = screen.getByTestId('attributes.1.value')

    const dependencyKey = screen.getByTestId("dependency.0.key")
    const dependencyVal = screen.getByTestId("dependency.0.value")

    const parameterKey = screen.getByTestId('parameter.0.key');
    const parameterVal = screen.getByTestId('parameter.0.value');

    const flagKey1 = screen.getByTestId('flags.0.key')
    const flagVal1 = screen.getByTestId('flags.0.value')
    const flagKey2 = screen.getByTestId('flags.1.key')
    const flagVal2 = screen.getByTestId('flags.1.value')
    const flagKey3 = screen.getByTestId('flags.2.key')
    const flagVal3 = screen.getByTestId('flags.2.value')

    const parentField = screen.getByTestId('parent');

    expect(nameField.value).toBe('srce.gridproxy.validity');
    expect(nameField).toBeDisabled()

    expect(typeField.value).toBe('Active');
    expect(typeField).toBeDisabled()
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()

    expect(probeField.value).toBe('GridProxy-probe (0.2.0)');
    expect(probeField).toBeDisabled();

    expect(packageField.value).toBe('argo-probe-globus (0.2.0)')
    expect(packageField).toBeDisabled();

    expect(descriptionField.value).toBe("")
    expect(descriptionField).toBeDisabled();

    expect(groupField).not.toBeInTheDocument();

    expect(tagBadge1.textContent).toBe('test_tag1')
    expect(tagBadge2.textContent).toBe('test_tag2')
    expect(tagBadge3.textContent).toBe("internal")
    expect(tagBadge4).not.toBeInTheDocument()

    expect(screen.getByRole("heading", { name: /probe executable/i })).toBeInTheDocument()
    expect(executableField.value).toBe("GridProxy-probe")
    expect(executableField).toBeDisabled()

    expect(screen.getByRole("heading", { name: "config" })).toBeInTheDocument()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('3');
    expect(configVal1).toBeDisabled()
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('30');
    expect(configVal2).toBeDisabled()
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo/probes/globus');
    expect(configVal3).toBeDisabled()
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('15');
    expect(configVal4).toBeDisabled()
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeDisabled()
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /attributes/i })).toBeInTheDocument()
    expect(attributeKey1.value).toBe("VONAME");
    expect(attributeKey1).toBeDisabled()
    expect(attributeVal1.value).toBe('--vo');
    expect(attributeVal1).toBeDisabled()
    expect(attributeKey2.value).toBe("X509_USER_PROXY")
    expect(attributeKey2).toBeDisabled()
    expect(attributeVal2.value).toBe("-x")
    expect(attributeVal2).toBeDisabled()
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /dependency/i })).toBeInTheDocument()
    expect(dependencyKey.value).toBe("hr.srce.GridProxy-Get")
    expect(dependencyKey).toBeDisabled()
    expect(dependencyVal.value).toBe("0")
    expect(dependencyVal).toBeDisabled()
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /parameter/i })).toBeInTheDocument()
    expect(parameterKey.value).toBe("")
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe("")
    expect(parameterVal).toBeDisabled()
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /flags/i })).toBeInTheDocument()
    expect(flagKey1.value).toBe("NOHOSTNAME")
    expect(flagKey1).toBeDisabled()
    expect(flagVal1.value).toBe("1")
    expect(flagVal1).toBeDisabled()
    expect(flagKey2.value).toBe("VO")
    expect(flagKey2).toBeDisabled()
    expect(flagVal2.value).toBe("1")
    expect(flagVal2).toBeDisabled()
    expect(flagKey3.value).toBe("NOPUBLISH")
    expect(flagKey3).toBeDisabled()
    expect(flagVal3.value).toBe("1")
    expect(flagVal3).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.2.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /parent/i })).toBeInTheDocument()
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/srce.gridproxy.validity/history');
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test("Test change main metric template info", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const probeField = screen.getByText('ams-probe (0.1.12)')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const tagsField = screen.getByLabelText('Tags:');
    const executableField = screen.getByTestId('probeexecutable');

    fireEvent.change(nameField, { target: { value: 'argo.AMS-Check-new' } })
    await selectEvent.select(probeField, 'ams-probe-new (0.1.13)')
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.13)')
    expect(packageField).toBeDisabled();

    fireEvent.change(descriptionField, { target: { value: 'New description for metric template.' } });
    fireEvent.change(executableField, { target: { value: 'ams-probe-new' } })

    await selectEvent.create(tagsField, 'test_tag3')

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
          'tags': ['test_tag1', 'test_tag2', 'test_tag3'],
          'description': 'New description for metric template.',
          'probeversion': 'ams-probe-new (0.1.13)',
          'parent': '',
          'probeexecutable': 'ams-probe-new',
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
          'parameter': [
            { key: '--project', value: 'EGI' }
          ],
          'flags': [
            { key: 'OBSESS', value: '1' }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test("Test change config", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '80' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '4' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictemplates/",
        {
          id: "1",
          name: "argo.AMS-Check",
          mtype: "Active",
          tags: ["test_tag1", "test_tag2"],
          description: "Some description of argo.AMS-Check metric template.",
          probeversion: "ams-probe (0.1.12)",
          parent: "",
          probeexecutable: "ams-probe",
          config: [
            { key: "maxCheckAttempts", value: "5" },
            { key: "timeout", value: "80" },
            { key: "path", value: "/usr/libexec/argo-monitoring/" },
            { key: "interval", value: "6" },
            { key: "retryInterval", value: "4" }
          ],
          attribute: [
            { key: "argo.ams_TOKEN", value: "--token" }
          ],
          dependency: [{ key: "", value: "" }],
          parameter: [
            { key: "--project", value: "EGI" }
          ],
          flags: [
            { key: "OBSESS", value: "1" }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test("Test change attributes", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('attributes.addnew'));
    fireEvent.change(screen.getByTestId('attributes.1.key'), { target: { value: 'ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId('attributes.1.value'), { target: { value: '--meh' } });

    fireEvent.click(screen.getByTestId("attributes.0.remove"))

    fireEvent.click(screen.getByTestId('attributes.addnew'));
    fireEvent.change(screen.getByTestId('attributes.1.key'), { target: { value: 'SOME_ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId('attributes.1.value'), { target: { value: '--yes' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictemplates/",
        {
          id: "1",
          name: "argo.AMS-Check",
          mtype: "Active",
          tags: ["test_tag1", "test_tag2"],
          description: "Some description of argo.AMS-Check metric template.",
          probeversion: "ams-probe (0.1.12)",
          parent: "",
          probeexecutable: "ams-probe",
          config: [
            { key: "maxCheckAttempts", value: "4" },
            { key: "timeout", value: "70" },
            { key: "path", value: "/usr/libexec/argo-monitoring/" },
            { key: "interval", value: "5" },
            { key: "retryInterval", value: "3" }
          ],
          attribute: [
            { key: "ATTRIBUTE", value: "--meh", isNew: true },
            { key: "SOME_ATTRIBUTE", value: "--yes", isNew: true }
          ],
          dependency: [{ key: "", value: "" }],
          parameter: [
            { key: "--project", value: "EGI" }
          ],
          flags: [
            { key: "OBSESS", value: "1" }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test("Test change parameter", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('parameter.0.value'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByTestId("parameter.addnew"))
    fireEvent.change(screen.getByTestId('parameter.1.key'), { target: { value: '--key' } });
    fireEvent.change(screen.getByTestId('parameter.1.value'), { target: { value: 'value' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictemplates/",
        {
          id: "1",
          name: "argo.AMS-Check",
          mtype: "Active",
          tags: ["test_tag1", "test_tag2"],
          description: "Some description of argo.AMS-Check metric template.",
          probeversion: "ams-probe (0.1.12)",
          parent: "",
          probeexecutable: "ams-probe",
          config: [
            { key: "maxCheckAttempts", value: "4" },
            { key: "timeout", value: "70" },
            { key: "path", value: "/usr/libexec/argo-monitoring/" },
            { key: "interval", value: "5" },
            { key: "retryInterval", value: "3" }
          ],
          attribute: [
            { key: "argo.ams_TOKEN", value: "--token" }
          ],
          dependency: [{ key: "", value: "" }],
          parameter: [
            { key: "--project", value: "TEST" },
            { key: "--key", value: "value", isNew: true }
          ],
          flags: [
            { key: "OBSESS", value: "1" }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test("Test change flags", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("flags.addnew"))
    fireEvent.change(screen.getByTestId("flags.1.key"), { target: { value: "NOHOSTNAME" } })
    fireEvent.change(screen.getByTestId("flags.1.value"), { target: { value: "1" } })

    fireEvent.click(screen.getByTestId("flags.addnew"))
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOARGS' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '0' } });

    fireEvent.click(screen.getByTestId("flags.0.remove"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictemplates/",
        {
          id: "1",
          name: "argo.AMS-Check",
          mtype: "Active",
          tags: ["test_tag1", "test_tag2"],
          description: "Some description of argo.AMS-Check metric template.",
          probeversion: "ams-probe (0.1.12)",
          parent: "",
          probeexecutable: "ams-probe",
          config: [
            { key: "maxCheckAttempts", value: "4" },
            { key: "timeout", value: "70" },
            { key: "path", value: "/usr/libexec/argo-monitoring/" },
            { key: "interval", value: "5" },
            { key: "retryInterval", value: "3" }
          ],
          attribute: [
            { key: "argo.ams_TOKEN", value: "--token" }
          ],
          dependency: [{ key: "", value: "" }],
          parameter: [
            { key: "--project", value: "EGI" }
          ],
          flags: [
            { key: "NOHOSTNAME", value: "1", isNew: true },
            { key: "NOARGS", value: "0", isNew: true }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })

  test('Test change metric template and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMS-Check-new' } })
    await selectEvent.select(screen.getByText("ams-probe (0.1.12)"), 'ams-probe-new (0.1.13)')

    fireEvent.change(screen.getByTestId("description"), { target: { value: 'New description for metric template.' } });
    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-probe-new' } })

    await selectEvent.create(screen.getByLabelText("Tags:"), 'test_tag3')

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '80' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '4' } });

    fireEvent.click(screen.getByTestId('attributes.addnew'));
    fireEvent.change(screen.getByTestId('attributes.1.key'), { target: { value: 'ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId('attributes.1.value'), { target: { value: '--meh' } });

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
          'tags': ['test_tag1', 'test_tag2', 'test_tag3'],
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
          'dependency': [{ key: "", value: "" }],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )

  })

  test('Test change metric template with warning', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        warning: "Error syncing metric tags: 500 SERVER ERROR"
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMS-Check-new' } })
    await selectEvent.select(screen.getByText("ams-probe (0.1.12)"), 'ams-probe-new (0.1.13)')

    fireEvent.change(screen.getByTestId("description"), { target: { value: 'New description for metric template.' } });
    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-probe-new' } })

    await selectEvent.create(screen.getByLabelText("Tags:"), 'test_tag3')

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '80' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '4' } });

    fireEvent.click(screen.getByTestId('attributes.addnew'));
    fireEvent.change(screen.getByTestId('attributes.1.key'), { target: { value: 'ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId('attributes.1.value'), { target: { value: '--meh' } });

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
          'tags': ['test_tag1', 'test_tag2', 'test_tag3'],
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
          'dependency': [{ key: "", value: "" }],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Error syncing metric tags: 500 SERVER ERROR</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning", 0, expect.any(Function)
    )
  })

  test('Test error in saving metric template with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; You should choose existing probe version.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText("ams-probe (0.1.12)"), 'ams-probe-new (0.1.13)')

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
          'probeversion': 'ams-probe-new (0.1.13)',
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
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; You should choose existing probe version.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric template with teapot', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('418 IM A TEAPOT; Update metric profile manually.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText("ams-probe (0.1.12)"), 'ams-probe-new (0.1.13)')

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
          'probeversion': 'ams-probe-new (0.1.13)',
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
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>418 IM A TEAPOT; Update metric profile manually.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Warning',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric template without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText("ams-probe (0.1.12)"), 'ams-probe-new (0.1.13)')

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
          'probeversion': 'ams-probe-new (0.1.13)',
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
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric template</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test that passive metric template page renders properly', async () => {
    renderChangeView({ passive: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Passive')
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagsField = screen.getByLabelText('Tags:');

    const executableField = screen.queryByTestId('probeexecutable');
    const configKey1 = screen.queryByTestId('config.0.key');
    const configKey2 = screen.queryByTestId('config.1.key');
    const configKey3 = screen.queryByTestId('config.2.key');
    const configKey4 = screen.queryByTestId('config.3.key');
    const configKey5 = screen.queryByTestId('config.4.key');
    const configVal1 = screen.queryByTestId('config.0.value');
    const configVal2 = screen.queryByTestId('config.1.value');
    const configVal3 = screen.queryByTestId('config.2.value');
    const configVal4 = screen.queryByTestId('config.3.value');
    const configVal5 = screen.queryByTestId('config.4.value');
    const attributeKey = screen.queryByTestId('attributes.0.key');
    const attributeVal = screen.queryByTestId('attributes.0.value')
    const dependencyKey = screen.queryByTestId('dependency.0.key');
    const dependencyVal = screen.queryByTestId('dependency.0.value');
    const parameterKey = screen.queryByTestId('parameter.0.key');
    const parameterVal = screen.queryByTestId('parameter.0.value');
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.getByTestId('flags.1.key');
    const flagVal2 = screen.getByTestId('flags.1.value');
    const parentField = screen.getAllByText(/select/i)[1]

    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(typeField).toBeEnabled()

    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    selectEvent.openMenu(typeField)
    expect(screen.queryByText('Active')).toBeInTheDocument()

    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(groupField).not.toBeInTheDocument();
    expect(tagsField).toBeInTheDocument();
    expect(screen.queryByText("test_tag1")).not.toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).not.toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField).not.toBeInTheDocument();
    expect(configKey1).not.toBeInTheDocument();
    expect(configVal1).not.toBeInTheDocument();
    expect(configKey2).not.toBeInTheDocument();
    expect(configVal2).not.toBeInTheDocument();
    expect(configKey3).not.toBeInTheDocument();
    expect(configVal3).not.toBeInTheDocument();
    expect(configKey4).not.toBeInTheDocument();
    expect(configVal4).not.toBeInTheDocument();
    expect(configKey5).not.toBeInTheDocument();
    expect(configVal5).not.toBeInTheDocument();
    expect(attributeKey).not.toBeInTheDocument()
    expect(attributeVal).not.toBeInTheDocument();
    expect(dependencyKey).not.toBeInTheDocument();
    expect(dependencyVal).not.toBeInTheDocument();
    expect(parameterKey).not.toBeInTheDocument();
    expect(parameterVal).not.toBeInTheDocument();
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagVal1.value).toBe('1');
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagVal2.value).toBe('1');
    expect(flagKey2).toBeDisabled()
    expect(flagVal2).toBeDisabled()

    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Check')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Check')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/org.apel.APEL-Pub/history');
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/metrictemplates/org.apel.APEL-Pub/clone');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  })

  test('Test that public page for passive metric template renders properly', async () => {
    renderChangeView({ passive: true, publicView: true });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagBadge = screen.getByText(/none/i);
    const executableField = screen.queryByTestId('probeexecutable');
    const configKey1 = screen.queryByTestId('config.0.key');
    const configKey2 = screen.queryByTestId('config.1.key');
    const configKey3 = screen.queryByTestId('config.2.key');
    const configKey4 = screen.queryByTestId('config.3.key');
    const configKey5 = screen.queryByTestId('config.4.key');
    const configVal1 = screen.queryByTestId('config.0.value');
    const configVal2 = screen.queryByTestId('config.1.value');
    const configVal3 = screen.queryByTestId('config.2.value');
    const configVal4 = screen.queryByTestId('config.3.value');
    const configVal5 = screen.queryByTestId('config.4.value');
    const attributeKey = screen.queryByTestId('attributes.0.key');
    const attributeVal = screen.queryByTestId('attributes.0.value')
    const dependencyKey = screen.queryByTestId('dependency.0.key');
    const dependencyVal = screen.queryByTestId('dependency.0.value');
    const parameterKey = screen.queryByTestId('parameter.0.key');
    const parameterVal = screen.queryByTestId('parameter.0.value');
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.getByTestId('flags.1.key');
    const flagVal2 = screen.getByTestId('flags.1.value');
    const parentField = screen.getByTestId('parent');

    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(nameField).toBeDisabled()
    expect(typeField.value).toBe('Passive');
    expect(typeField).toBeDisabled()
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()
    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();
    expect(groupField).not.toBeInTheDocument();
    expect(tagBadge).toBeInTheDocument();
    expect(executableField).not.toBeInTheDocument();
    expect(configKey1).not.toBeInTheDocument();
    expect(configVal1).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(configKey2).not.toBeInTheDocument();
    expect(configVal2).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(configKey3).not.toBeInTheDocument();
    expect(configVal3).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(configKey4).not.toBeInTheDocument();
    expect(configVal4).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(configKey5).not.toBeInTheDocument();
    expect(configVal5).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(attributeKey).not.toBeInTheDocument()
    expect(attributeVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();
    expect(dependencyKey).not.toBeInTheDocument();
    expect(dependencyVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();
    expect(parameterKey).not.toBeInTheDocument();
    expect(parameterVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagKey1).toBeDisabled()
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagVal2.value).toBe('1');
    expect(flagKey2).toBeDisabled()
    expect(flagVal2).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/public_metrictemplates/org.apel.APEL-Pub/history');
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test changing passive/active metric template', async () => {
    renderChangeView({ passive: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Passive');

    await selectEvent.select(typeField, 'Active')

    const probeField = screen.getAllByText(/select/i)[0]
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i);
    const tagsField = screen.getByLabelText('Tags:');

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
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.queryByTestId('flags.1.key');
    const flagVal2 = screen.queryByTestId('flags.1.value');
    const parentField = screen.getAllByText(/select/i)[2]

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(probeField).toBeEnabled();

    expect(screen.queryByText('ams-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField)
    expect(screen.queryByText('ams-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(groupField).not.toBeInTheDocument();
    expect(tagsField).toBeInTheDocument();
    expect(screen.queryByText("test_tag1")).not.toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).not.toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField.value).toBe('');
    expect(executableField).not.toHaveAttribute('hidden');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('');
    expect(configVal1).toBeEnabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('');
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('');
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('');
    expect(configVal5).toBeEnabled()
    expect(attributeKey.value).toBe('');
    expect(attributeKey).not.toHaveAttribute('hidden');
    expect(attributeVal.value).toBe('');
    expect(attributeVal).not.toHaveAttribute('hidden');
    expect(parameterKey.value).toBe('');
    expect(parameterKey).not.toHaveAttribute('hidden');
    expect(parameterVal.value).toBe('');
    expect(parameterVal).not.toHaveAttribute('hidden');
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagVal1.value).toBe('1');
    expect(flagKey2).not.toBeInTheDocument();
    expect(flagVal2).not.toBeInTheDocument();

    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Check')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Check')).toBeInTheDocument()
  })

  test('Test changing active/passive metric template', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Active');

    await selectEvent.select(typeField, 'Passive')

    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagsField = screen.getByLabelText('Tags:');

    const executableField = screen.queryByTestId('probeexecutable');
    const configKey1 = screen.queryByTestId('config.0.key');
    const configKey2 = screen.queryByTestId('config.1.key');
    const configKey3 = screen.queryByTestId('config.2.key');
    const configKey4 = screen.queryByTestId('config.3.key');
    const configKey5 = screen.queryByTestId('config.4.key');
    const configVal1 = screen.queryByTestId('config.0.value');
    const configVal2 = screen.queryByTestId('config.1.value');
    const configVal3 = screen.queryByTestId('config.2.value');
    const configVal4 = screen.queryByTestId('config.3.value');
    const configVal5 = screen.queryByTestId('config.4.value');
    const attributeKey = screen.queryByTestId('attributes.0.key');
    const attributeVal = screen.queryByTestId('attributes.0.value')
    const dependencyKey = screen.queryByTestId('dependency.0.key');
    const dependencyVal = screen.queryByTestId('dependency.0.value');
    const parameterKey = screen.queryByTestId('parameter.0.key');
    const parameterVal = screen.queryByTestId('parameter.0.value');
    const flagKey1 = screen.queryByTestId('flags.0.key');
    const flagVal1 = screen.queryByTestId('flags.0.value');
    const flagKey2 = screen.queryByTestId('flags.1.key');
    const flagVal2 = screen.queryByTestId('flags.1.value');
    const parentField = screen.getByText(/select/i)

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(groupField).not.toBeInTheDocument();
    expect(tagsField).toBeInTheDocument();
    expect(screen.queryByText("test_tag1")).toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField).not.toBeInTheDocument();
    expect(configKey1).not.toBeInTheDocument();
    expect(configVal1).not.toBeInTheDocument();
    expect(configKey2).not.toBeInTheDocument();
    expect(configVal2).not.toBeInTheDocument();
    expect(configKey3).not.toBeInTheDocument();
    expect(configVal3).not.toBeInTheDocument();
    expect(configKey4).not.toBeInTheDocument();
    expect(configVal4).not.toBeInTheDocument();
    expect(configKey5).not.toBeInTheDocument();
    expect(configVal5).not.toBeInTheDocument();
    expect(attributeKey).not.toBeInTheDocument();
    expect(attributeVal).not.toBeInTheDocument();
    expect(dependencyKey).not.toBeInTheDocument();
    expect(dependencyVal).not.toBeInTheDocument();
    expect(parameterKey).not.toBeInTheDocument();
    expect(parameterVal).not.toBeInTheDocument();
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagVal1.value).toBe('1');
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagKey2).toBeDisabled()
    expect(flagVal2.value).toBe('1');
    expect(flagVal2).toBeDisabled()
    expect(parentField).toBeEnabled()

    await selectEvent.select(typeField, 'Active')

    const probeField2 = screen.getByText('ams-probe (0.1.12)')
    const packageField2 = screen.getByTestId('package');
    const descriptionField2 = screen.getByTestId('description');
    const groupField2 = screen.queryByText(/group/i)
    const tagsField2 = screen.getByLabelText('Tags:');
    expect(screen.queryByText("test_tag1")).toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    const executableField2 = screen.getByTestId('probeexecutable');
    const configKey1a = screen.getByTestId('config.0.key');
    const configKey2a = screen.getByTestId('config.1.key');
    const configKey3a = screen.getByTestId('config.2.key');
    const configKey4a = screen.getByTestId('config.3.key');
    const configKey5a = screen.getByTestId('config.4.key');
    const configVal1a = screen.getByTestId('config.0.value');
    const configVal2a = screen.queryByTestId('config.1.value');
    const configVal3a = screen.queryByTestId('config.2.value');
    const configVal4a = screen.queryByTestId('config.3.value');
    const configVal5a = screen.queryByTestId('config.4.value');
    const attributeKey2 = screen.queryByTestId('attributes.0.key');
    const attributeVal2 = screen.queryByTestId('attributes.0.value')
    const dependencyKey2 = screen.queryByTestId('dependency.0.key');
    const dependencyVal2 = screen.queryByTestId('dependency.0.value');
    const parameterKey2 = screen.queryByTestId('parameter.0.key');
    const parameterVal2 = screen.queryByTestId('parameter.0.value');
    const flagKey1a = screen.queryByTestId('flags.0.key');
    const flagVal1a = screen.queryByTestId('flags.0.value');
    const flagKey2a = screen.queryByTestId('flags.1.key');
    const flagVal2a = screen.queryByTestId('flags.1.value');
    const parentField2 = screen.getByText(/select/i)

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(probeField2).toBeEnabled();

    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField2)
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField2.value).toBe('nagios-plugins-argo (0.1.12)');
    expect(packageField2).toBeDisabled();
    expect(descriptionField2.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(groupField2).not.toBeInTheDocument();
    expect(tagsField2).toBeInTheDocument();
    expect(screen.queryByText("test_tag1")).toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField2.value).toBe('ams-probe');
    expect(configKey1a.value).toBe('maxCheckAttempts');
    expect(configKey1a).toBeDisabled()
    expect(configVal1a.value).toBe('4');
    expect(configVal1a).toBeEnabled()
    expect(configKey2a.value).toBe('timeout');
    expect(configKey2a).toBeDisabled()
    expect(configVal2a.value).toBe('70');
    expect(configVal2a).toBeEnabled()
    expect(configKey3a.value).toBe('path');
    expect(configKey3a).toBeDisabled()
    expect(configVal3a.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3a).toBeEnabled()
    expect(configKey4a.value).toBe('interval');
    expect(configKey4a).toBeDisabled()
    expect(configVal4a.value).toBe('5');
    expect(configVal4a).toBeEnabled()
    expect(configKey5a.value).toBe('retryInterval');
    expect(configKey5a).toBeDisabled()
    expect(configVal5a.value).toBe('3');
    expect(configVal5a).toBeEnabled()
    expect(attributeKey2.value).toBe('argo.ams_TOKEN');
    expect(attributeVal2.value).toBe('--token');
    expect(dependencyKey2).not.toBeInTheDocument()
    expect(dependencyVal2).not.toBeInTheDocument()
    expect(parameterKey2.value).toBe('--project');
    expect(parameterVal2.value).toBe('EGI')
    expect(flagKey1a.value).toBe('OBSESS');
    expect(flagVal1a.value).toBe('1');
    expect(flagKey2a).not.toBeInTheDocument();
    expect(flagVal2a).not.toBeInTheDocument();
    expect(parentField2).toBeInTheDocument()
  })

  test('Test changing active/passive metric template and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText("Active"), 'Passive')

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'passive.AMS-Check' } });
    fireEvent.change(screen.getByTestId("description"), { target: { value: 'New description for passive metric template.' } });
    await selectEvent.select(screen.getByText(/select/i), 'argo.AMS-Check')

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
          'name': 'passive.AMS-Check',
          'mtype': 'Passive',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'New description for passive metric template.',
          'probeversion': '',
          'parent': 'argo.AMS-Check',
          'probeexecutable': '',
          'config': [{ key: '', value: '' }],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'PASSIVE', value: '1' }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully changed', 'Changed', 2000
    )
  })
})


describe('Test metric template addview on SuperPOEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'warning');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

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
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /add metric/i }).textContent).toBe('Add metric template');

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByText('Active');
    const probeField = screen.getAllByText(/select/i)[0]
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i);
    const tagsField = screen.getByLabelText('Tags:');

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
    const parentField = screen.getAllByText(/select/i)[2]

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(nameField.value).toBe('');
    expect(typeField).toBeEnabled()

    expect(screen.queryByText('Passive')).not.toBeInTheDocument()
    selectEvent.openMenu(typeField)
    expect(screen.queryByText('Passive')).toBeInTheDocument()

    expect(probeField).toBeEnabled()

    expect(screen.queryByText('ams-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField)
    expect(screen.queryByText('ams-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(groupField).not.toBeInTheDocument();
    expect(tagsField).toBeInTheDocument();
    expect(screen.queryByText("test_tag1")).not.toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).not.toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField.value).toBe('');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('');
    expect(configVal1).toBeEnabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('');
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('');
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('');
    expect(configVal5).toBeEnabled()
    expect(attributeKey.value).toBe('');
    expect(attributeVal.value).toBe('');
    expect(parameterKey.value).toBe('');
    expect(parameterVal.value).toBe('');
    expect(flagKey.value).toBe('');
    expect(flagVal.value).toBe('');

    expect(screen.queryByText('argo.AMS-Check')).not.toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Check')).toBeInTheDocument()
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test("Test add main info fields", async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMSPublisher-Check' } })

    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ams-publisher-probe (0.1.12)')
    expect(screen.getByTestId("package").value).toBe('nagios-plugins-argo (0.1.12)')

    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: "ams-publisher-probe" } })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "argo.AMSPublisher-Check",
      description: "",
      probeexecutable: "ams-publisher-probe",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })
  })

  test("Test add config", async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '120' } });
    fireEvent.change(screen.getByTestId("config.2.value"), { target: { value: '/usr/libexec/argo-monitoring/probes/argo' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '180' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '1' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "1",
      "config.1.key": "timeout",
      "config.1.value": "120",
      "config.2.key": "path",
      "config.2.value": "/usr/libexec/argo-monitoring/probes/argo",
      "config.3.key": "interval",
      "config.3.value": "180",
      "config.4.key": "retryInterval",
      "config.4.value": "1",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })
  })

  test("Test add attributes", async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("attributes.0.key"), { target: { value: 'attribute1' } });
    fireEvent.change(screen.getByTestId("attributes.0.value"), { target: { value: '120' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "attribute1",
      "attributes.0.value": "120",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("attributes.addnew"))
    fireEvent.change(screen.getByTestId("attributes.1.key"), { target: { value: 'attribute2' } });
    fireEvent.change(screen.getByTestId("attributes.1.value"), { target: { value: 'value3' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "attribute1",
      "attributes.0.value": "120",
      "attributes.1.key": "attribute2",
      "attributes.1.value": "value3",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("attributes.1.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "attribute1",
      "attributes.0.value": "120",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("attributes.0.key"), { target: { value: 'ATTRIBUTE' } }); fireEvent.change(screen.getByTestId("attributes.0.value"), { target: { value: 'ATTRIBUTE' } });
    fireEvent.change(screen.getByTestId("attributes.0.value"), { target: { value: 'ATTRIBUTE' } }); fireEvent.change(screen.getByTestId("attributes.0.value"), { target: { value: '123' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "ATTRIBUTE",
      "attributes.0.value": "123",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("attributes.0.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })
  })

  test("Test add parameter", async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("parameter.0.key"), { target: { value: '-vv' } });
    fireEvent.change(screen.getByTestId("parameter.0.value"), { target: { value: '' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "-vv",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("parameter.addnew"))
    fireEvent.change(screen.getByTestId("parameter.1.key"), { target: { value: '-p' } });
    fireEvent.change(screen.getByTestId("parameter.1.value"), { target: { value: '443' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "-vv",
      "parameter.0.value": "",
      "parameter.1.key": "-p",
      "parameter.1.value": "443",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("parameter.0.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "-p",
      "parameter.0.value": "443",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("parameter.0.value"), { target: { value: '80' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "-p",
      "parameter.0.value": "80",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.click(screen.getByTestId("parameter.0.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })
  })

  test("Test add flags", async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })

    fireEvent.change(screen.getByTestId("flags.0.key"), { target: { value: 'OBSESS' } });
    fireEvent.change(screen.getByTestId("flags.0.value"), { target: { value: '1' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "OBSESS",
      "flags.0.value": "1"
    })

    fireEvent.click(screen.getByTestId("flags.addnew"))
    fireEvent.change(screen.getByTestId("flags.1.key"), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId("flags.1.value"), { target: { value: '1' } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "OBSESS",
      "flags.0.value": "1",
      "flags.1.key": "NOHOSTNAME",
      "flags.1.value": "1"
    })

    fireEvent.click(screen.getByTestId("flags.0.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "NOHOSTNAME",
      "flags.0.value": "1"
    })

    fireEvent.change(screen.getByTestId("flags.0.value"), { target: { value: "0" } });

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "NOHOSTNAME",
      "flags.0.value": "0"
    })

    fireEvent.click(screen.getByTestId("flags.0.remove"))

    expect(screen.getByTestId("metric-form")).toHaveFormValues({
      name: "",
      description: "",
      probeexecutable: "",
      "config.0.key": "maxCheckAttempts",
      "config.0.value": "",
      "config.1.key": "timeout",
      "config.1.value": "",
      "config.2.key": "path",
      "config.2.value": "",
      "config.3.key": "interval",
      "config.3.value": "",
      "config.4.key": "retryInterval",
      "config.4.value": "",
      "attributes.0.key": "",
      "attributes.0.value": "",
      "parameter.0.key": "",
      "parameter.0.value": "",
      "flags.0.key": "",
      "flags.0.value": ""
    })
  })

  test('Test add active metric template and save', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMSPublisher-Check' } })
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ams-publisher-probe (0.1.12)')

    const tagsField = screen.getByLabelText('Tags:');
    await selectEvent.select(tagsField, ['internal', 'test_tag1']);
    await selectEvent.create(tagsField, 'test_tag3');

    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-publisher-probe' } })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '120' } });
    fireEvent.change(screen.getByTestId("config.2.value"), { target: { value: '/usr/libexec/argo-monitoring/probes/argo' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '180' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '1' } });

    fireEvent.change(screen.getByTestId('parameter.0.key'), { target: { value: '-s' } });
    fireEvent.change(screen.getByTestId('parameter.0.value'), { target: { value: '/var/run/argo-nagios-ams-publisher/sock' } });
    fireEvent.click(screen.getByTestId('parameter.addnew'))
    fireEvent.change(screen.getByTestId('parameter.1.key'), { target: { value: '-q' } });
    fireEvent.change(screen.getByTestId('parameter.1.value'), { target: { value: 'w:metrics+g:published180' } });

    fireEvent.change(screen.getByTestId('flags.0.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.0.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOTIMEOUT' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOPUBLISH' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '',
          'name': 'argo.AMSPublisher-Check',
          'mtype': 'Active',
          'tags': ['internal', 'test_tag1', 'test_tag3'],
          'description': '',
          'probeversion': 'ams-publisher-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-publisher-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '1' },
            { key: 'timeout', value: '120' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
            { key: 'interval', value: '180' },
            { key: 'retryInterval', value: '1' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [
            { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock' },
            { key: '-q', value: 'w:metrics+g:published180' }
          ],
          'flags': [
            { key: 'NOHOSTNAME', value: '1' },
            { key: 'NOTIMEOUT', value: '1' },
            { key: 'NOPUBLISH', value: '1' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully added', 'Added', 2000
    )
  })

  test('Test add passive metric template and save', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByLabelText("Tags:"), 'test_tag1');
    await selectEvent.select(screen.getByText("Active"), 'Passive')

    const flagKey = screen.getByTestId('flags.0.key');
    const flagVal = screen.getByTestId('flags.0.value');
    expect(flagKey.value).toBe('PASSIVE');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()

    const nameField = screen.getByTestId('name');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const executableField = screen.queryByTestId('probeexecutable');
    const configKey1 = screen.queryByTestId('config.0.key');
    const configKey2 = screen.queryByTestId('config.1.key');
    const configKey3 = screen.queryByTestId('config.2.key');
    const configKey4 = screen.queryByTestId('config.3.key');
    const configKey5 = screen.queryByTestId('config.4.key');
    const configVal1 = screen.queryByTestId('config.0.value');
    const configVal2 = screen.queryByTestId('config.1.value');
    const configVal3 = screen.queryByTestId('config.2.value');
    const configVal4 = screen.queryByTestId('config.3.value');
    const configVal5 = screen.queryByTestId('config.4.value');
    const attributeKey = screen.queryByTestId('attributes.0.key');
    const attributeVal = screen.queryByTestId('attributes.0.value')
    const dependencyKey = screen.queryByTestId('dependency.0.key');
    const dependencyVal = screen.queryByTestId('dependency.0.value');
    const parameterKey = screen.queryByTestId('parameter.0.key');
    const parameterVal = screen.queryByTestId('parameter.0.value');

    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(groupField).not.toBeInTheDocument();
    expect(executableField).not.toBeInTheDocument();
    expect(configKey1).not.toBeInTheDocument();
    expect(configKey2).not.toBeInTheDocument();
    expect(configKey3).not.toBeInTheDocument();
    expect(configKey4).not.toBeInTheDocument();
    expect(configKey5).not.toBeInTheDocument();
    expect(configVal1).not.toBeInTheDocument();
    expect(configVal2).not.toBeInTheDocument();
    expect(configVal3).not.toBeInTheDocument();
    expect(configVal4).not.toBeInTheDocument();
    expect(configVal5).not.toBeInTheDocument();
    expect(attributeKey).not.toBeInTheDocument();
    expect(attributeVal).not.toBeInTheDocument();
    expect(dependencyKey).not.toBeInTheDocument();
    expect(dependencyVal).not.toBeInTheDocument();
    expect(parameterKey).not.toBeInTheDocument();
    expect(parameterVal).not.toBeInTheDocument();

    fireEvent.change(nameField, { target: { value: 'org.apel.APEL-Sync' } });

    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'OBSESS' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '',
          'name': 'org.apel.APEL-Sync',
          'mtype': 'Passive',
          'tags': ['test_tag1'],
          'description': '',
          'probeversion': '',
          'parent': '',
          'probeexecutable': '',
          'config': [{ key: '', value: '' }],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'PASSIVE', value: '1' },
            { key: 'OBSESS', value: '1' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully added', 'Added', 2000
    )
  })

  test('Test add metric template with warning', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        warning: "Error syncing metric tags: 500 SERVER ERROR"
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMSPublisher-Check' } })
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ams-publisher-probe (0.1.12)')

    const tagsField = screen.getByLabelText('Tags:');
    await selectEvent.select(tagsField, ['internal', 'test_tag1']);
    await selectEvent.create(tagsField, 'test_tag3');

    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-publisher-probe' } })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '120' } });
    fireEvent.change(screen.getByTestId("config.2.value"), { target: { value: '/usr/libexec/argo-monitoring/probes/argo' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '180' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '1' } });

    fireEvent.change(screen.getByTestId('parameter.0.key'), { target: { value: '-s' } });
    fireEvent.change(screen.getByTestId('parameter.0.value'), { target: { value: '/var/run/argo-nagios-ams-publisher/sock' } });
    fireEvent.click(screen.getByTestId('parameter.addnew'))
    fireEvent.change(screen.getByTestId('parameter.1.key'), { target: { value: '-q' } });
    fireEvent.change(screen.getByTestId('parameter.1.value'), { target: { value: 'w:metrics+g:published180' } });

    fireEvent.change(screen.getByTestId('flags.0.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.0.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOTIMEOUT' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOPUBLISH' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '',
          'name': 'argo.AMSPublisher-Check',
          'mtype': 'Active',
          'tags': ['internal', 'test_tag1', 'test_tag3'],
          'description': '',
          'probeversion': 'ams-publisher-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-publisher-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '1' },
            { key: 'timeout', value: '120' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
            { key: 'interval', value: '180' },
            { key: 'retryInterval', value: '1' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [
            { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock' },
            { key: '-q', value: 'w:metrics+g:published180' }
          ],
          'flags': [
            { key: 'NOHOSTNAME', value: '1' },
            { key: 'NOTIMEOUT', value: '1' },
            { key: 'NOPUBLISH', value: '1' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully added', 'Added', 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Error syncing metric tags: 500 SERVER ERROR</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning", 0, expect.any(Function)
    )
  })

  test('Test error in saving metric template with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Metric template with this name already exists')
    } )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMS-Publisher' } })
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ams-publisher-probe (0.1.12)')

    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-publisher-probe' } })

    fireEvent.change(screen.getByTestId("config.0.value"), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId("config.1.value"), { target: { value: '120' } });
    fireEvent.change(screen.getByTestId("config.2.value"), { target: { value: '/usr/libexec/argo-monitoring/probes/argo' } });
    fireEvent.change(screen.getByTestId("config.3.value"), { target: { value: '180' } });
    fireEvent.change(screen.getByTestId("config.4.value"), { target: { value: '1' } });

    fireEvent.change(screen.getByTestId('parameter.0.key'), { target: { value: '-s' } });
    fireEvent.change(screen.getByTestId('parameter.0.value'), { target: { value: '/var/run/argo-nagios-ams-publisher/sock' } });
    fireEvent.click(screen.getByTestId('parameter.addnew'))
    fireEvent.change(screen.getByTestId('parameter.1.key'), { target: { value: '-q' } });
    fireEvent.change(screen.getByTestId('parameter.1.value'), { target: { value: 'w:metrics+g:published180' } });

    fireEvent.change(screen.getByTestId('flags.0.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.0.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOTIMEOUT' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOPUBLISH' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '',
          'name': 'argo.AMS-Publisher',
          'mtype': 'Active',
          'tags': [],
          'description': '',
          'probeversion': 'ams-publisher-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-publisher-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '1' },
            { key: 'timeout', value: '120' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
            { key: 'interval', value: '180' },
            { key: 'retryInterval', value: '1' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [
            { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock' },
            { key: '-q', value: 'w:metrics+g:published180' }
          ],
          'flags': [
            { key: 'NOHOSTNAME', value: '1' },
            { key: 'NOTIMEOUT', value: '1' },
            { key: 'NOPUBLISH', value: '1' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Metric template with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric template without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: 'argo.AMS-Publisher' } })
    await selectEvent.select(screen.getAllByText(/select/i)[0], 'ams-publisher-probe (0.1.12)')

    fireEvent.change(screen.getByTestId("probeexecutable"), { target: { value: 'ams-publisher-probe' } })

    fireEvent.change(screen.getByTestId('config.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('config.1.value'), { target: { value: '120' } });
    fireEvent.change(screen.getByTestId('config.2.value'), { target: { value: '/usr/libexec/argo-monitoring/probes/argo' } });
    fireEvent.change(screen.getByTestId('config.3.value'), { target: { value: '180' } });
    fireEvent.change(screen.getByTestId('config.4.value'), { target: { value: '1' } });

    fireEvent.change(screen.getByTestId('parameter.0.key'), { target: { value: '-s' } });
    fireEvent.change(screen.getByTestId('parameter.0.value'), { target: { value: '/var/run/argo-nagios-ams-publisher/sock' } });
    fireEvent.click(screen.getByTestId('parameter.addnew'))
    fireEvent.change(screen.getByTestId('parameter.1.key'), { target: { value: '-q' } });
    fireEvent.change(screen.getByTestId('parameter.1.value'), { target: { value: 'w:metrics+g:published180' } });

    fireEvent.change(screen.getByTestId('flags.0.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.0.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOTIMEOUT' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOPUBLISH' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '',
          'name': 'argo.AMS-Publisher',
          'mtype': 'Active',
          'tags': [],
          'description': '',
          'probeversion': 'ams-publisher-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-publisher-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '1' },
            { key: 'timeout', value: '120' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/probes/argo' },
            { key: 'interval', value: '180' },
            { key: 'retryInterval', value: '1' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [
            { key: '-s', value: '/var/run/argo-nagios-ams-publisher/sock' },
            { key: '-q', value: 'w:metrics+g:published180' }
          ],
          'flags': [
            { key: 'NOHOSTNAME', value: '1' },
            { key: 'NOTIMEOUT', value: '1' },
            { key: 'NOPUBLISH', value: '1' }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding metric template</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test metric template cloneview on SuperPOEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/metrictemplates/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplate)

            case '/api/v2/internal/metrictemplates/org.apel.APEL-Pub':
              return Promise.resolve({
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
                parameter: []
              })

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');

    const typeField = screen.getByText('Active');

    const probeField = screen.getByText('ams-probe (0.1.12)')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const tagsElement = screen.getByLabelText('Tags:')

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
    const parentField = screen.getByText(/select/i)

    expect(screen.queryByTestId("dependency.0.key")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dependency.0.value")).not.toBeInTheDocument()

    expect(nameField.value).toBe('argo.AMS-Check');
    expect(typeField).toBeEnabled()

    expect(screen.queryByText('Passive')).not.toBeInTheDocument()
    selectEvent.openMenu(typeField)
    expect(screen.getByText('Passive')).toBeInTheDocument()

    expect(probeField).toBeEnabled()

    expect(screen.queryByText('ams-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).not.toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).not.toBeInTheDocument()
    selectEvent.openMenu(probeField)
    expect(screen.queryByText('ams-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.11)')).toBeInTheDocument()
    expect(screen.queryByText('ams-publisher-probe (0.1.12)')).toBeInTheDocument()
    expect(screen.queryByText('ams-probe-new (0.1.13)')).toBeInTheDocument()

    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(groupField).not.toBeInTheDocument();

    expect(tagsElement).toBeInTheDocument()
    expect(screen.queryByText("test_tag1")).toBeInTheDocument()
    expect(screen.queryByText("test_tag2")).toBeInTheDocument()
    expect(screen.queryByText("internal")).not.toBeInTheDocument()
    expect(screen.queryByText("deprecated")).not.toBeInTheDocument()

    expect(executableField.value).toBe('ams-probe');
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('4');
    expect(configVal1).toBeEnabled()
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('70');
    expect(configVal2).toBeEnabled()
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3).toBeEnabled()
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5');
    expect(configVal4).toBeEnabled()
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeEnabled()
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeVal.value).toBe('--token');
    expect(parameterKey.value).toBe('--project');
    expect(parameterVal.value).toBe('EGI');
    expect(flagKey.value).toBe('OBSESS');
    expect(flagVal.value).toBe('1');

    expect(screen.queryByText('argo.AMS-Publisher')).not.toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).not.toBeInTheDocument()
    selectEvent.openMenu(parentField)
    expect(screen.queryByText('argo.AMS-Publisher')).toBeInTheDocument()
    expect(screen.queryByText('org.apel.APEL-Pub')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  test('Test clone active metric template and save', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const configVal2 = screen.getByTestId('config.1.value');

    fireEvent.change(nameField, { target: { value: 'argo.AMS-Check-clone' } })
    fireEvent.change(configVal2, { target: { value: '80' } });
    fireEvent.click(screen.getByTestId('attributes.0.remove'));
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '1',
          'name': 'argo.AMS-Check-clone',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'Some description of argo.AMS-Check metric template.',
          'probeversion': 'ams-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '80' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '5' },
            { key: 'retryInterval', value: '3' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '--project', value: 'EGI' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully added', 'Added', 2000
    )
  })

  test('Test clone passive metric template and save', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderCloneView({ passive: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');

    fireEvent.change(nameField, { target: { value: 'org.apel.APEL-Clone' } });
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.2.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.2.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': 2,
          'name': 'org.apel.APEL-Clone',
          'mtype': 'Passive',
          'tags': [],
          'description': '',
          'probeversion': '',
          'parent': '',
          'probeexecutable': '',
          'config': [{ key: '', value: '' }],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '', value: '' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'PASSIVE', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric template successfully added', 'Added', 2000
    )
  })

  test('Test error in saving cloned metric template with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; Metric template with this name already exists')
    } )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('config.1.value'), { target: { value: '80' } });
    fireEvent.click(screen.getByTestId('attributes.0.remove'));
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '1',
          'name': 'argo.AMS-Check',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'Some description of argo.AMS-Check metric template.',
          'probeversion': 'ams-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '80' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '5' },
            { key: 'retryInterval', value: '3' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '--project', value: 'EGI' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; Metric template with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error in saving metric template without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('config.1.value'), { target: { value: '80' } });
    fireEvent.click(screen.getByTestId('attributes.0.remove'));
    fireEvent.click(screen.getByTestId('flags.addnew'));
    fireEvent.change(screen.getByTestId('flags.1.key'), { target: { value: 'NOHOSTNAME' } });
    fireEvent.change(screen.getByTestId('flags.1.value'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metrictemplates/',
        {
          'cloned_from': '1',
          'name': 'argo.AMS-Check',
          'mtype': 'Active',
          'tags': ['test_tag1', 'test_tag2'],
          'description': 'Some description of argo.AMS-Check metric template.',
          'probeversion': 'ams-probe (0.1.12)',
          'parent': '',
          'probeexecutable': 'ams-probe',
          'config': [
            { key: 'maxCheckAttempts', value: '4' },
            { key: 'timeout', value: '80' },
            { key: 'path', value: '/usr/libexec/argo-monitoring/' },
            { key: 'interval', value: '5' },
            { key: 'retryInterval', value: '3' }
          ],
          'attribute': [{ key: '', value: '' }],
          'dependency': [{ key: '', value: '' }],
          'parameter': [{ key: '--project', value: 'EGI' }],
          'flags': [
            { key: 'OBSESS', value: '1' },
            { key: 'NOHOSTNAME', value: '1', isNew: true }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('metrictemplate');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('public_metrictemplate');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding metric template</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Test metric template detail view on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/metrictemplates':
              return Promise.resolve(mockListOfMetricTemplates)

            case '/api/v2/internal/metrictemplates/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplate)

            case '/api/v2/internal/metrictemplates/org.apel.APEL-Pub':
              return Promise.resolve(mockPassiveMetricTemplate)

            case '/api/v2/internal/mttypes':
              return Promise.resolve(['Active', 'Passive'])

            case '/api/v2/internal/metrictags':
              return Promise.resolve(mockMetricTags)

            case '/api/v2/internal/version/probe':
              return Promise.resolve(mockProbeVersions)
          }
        }
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
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
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(descriptionField).toBeDisabled();
    expect(groupField).not.toBeInTheDocument();
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('4');
    expect(configVal1).toBeDisabled()
    expect(configVal1).toBeDisabled()
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('70');
    expect(configVal2).toBeDisabled()
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/');
    expect(configVal3).toBeDisabled()
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5');
    expect(configVal4).toBeDisabled()
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeDisabled()
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metrictemplates/argo.AMS-Check/history');
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })
})


describe('Test metric template version detail view', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/version/metrictemplate/argo.AMS-Check':
              return Promise.resolve(mockMetricTemplateVersions)

            case '/api/v2/internal/version/metrictemplate/org.apel.APEL-Pub':
              return Promise.resolve(passiveMetricTemplateVersions)

            case '/api/v2/internal/version/probe/ams-probe':
              return Promise.resolve(amsProbeVersions)

            case '/api/v2/internal/version/probe/':
              return Promise.resolve(mockProbeVersions)
          }
        }
      }
    })
  })

  test('Test that active metric template version detail page renders properly', async () => {
    renderVersionDetailsView();

    await waitFor(() => {
      expect(screen.getByTestId("config.0.key")).toBeInTheDocument()
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
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
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()
    expect(probeField.value).toBe('ams-probe (0.1.12)');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('nagios-plugins-argo (0.1.12)')
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('Some description of argo.AMS-Check metric template.');
    expect(descriptionField).toBeDisabled();
    expect(groupField).not.toBeInTheDocument();
    expect(executableField.value).toBe('ams-probe');
    expect(executableField).toBeDisabled()
    expect(configKey1.value).toBe('maxCheckAttempts');
    expect(configKey1).toBeDisabled()
    expect(configVal1.value).toBe('4');
    expect(configVal1).toBeDisabled()
    expect(configVal1).toBeDisabled()
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(configKey2.value).toBe('timeout');
    expect(configKey2).toBeDisabled()
    expect(configVal2.value).toBe('70');
    expect(configVal2).toBeDisabled()
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(configKey3.value).toBe('path');
    expect(configKey3).toBeDisabled()
    expect(configVal3.value).toBe('/usr/libexec/argo-monitoring/probes/argo');
    expect(configVal3).toBeDisabled()
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(configKey4.value).toBe('interval');
    expect(configKey4).toBeDisabled()
    expect(configVal4.value).toBe('5');
    expect(configVal4).toBeDisabled()
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(configKey5.value).toBe('retryInterval');
    expect(configKey5).toBeDisabled()
    expect(configVal5.value).toBe('3');
    expect(configVal5).toBeDisabled()
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(attributeKey.value).toBe('argo.ams_TOKEN');
    expect(attributeKey).toBeDisabled()
    expect(attributeVal.value).toBe('--token');
    expect(attributeVal).toBeDisabled()
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();
    expect(parameterKey.value).toBe('--project');
    expect(parameterKey).toBeDisabled()
    expect(parameterVal.value).toBe('EGI');
    expect(parameterVal).toBeDisabled()
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();
    expect(flagKey.value).toBe('OBSESS');
    expect(flagKey).toBeDisabled()
    expect(flagVal.value).toBe('1');
    expect(flagVal).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test that passive metric template version detail page renders properly', async () => {
    renderVersionDetailsView({ passive: true });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /apel-pub/i }).textContent).toBe('org.apel.APEL-Pub ');
    })

    const nameField = screen.getByTestId('name');
    const typeField = screen.getByTestId('mtype');
    const probeField = screen.getByTestId('probeversion')
    const packageField = screen.getByTestId('package');
    const descriptionField = screen.getByTestId('description');
    const groupField = screen.queryByText(/group/i)
    const executableField = screen.queryByTestId('probeexecutable');
    const configKey1 = screen.queryByTestId('config.0.key');
    const configKey2 = screen.queryByTestId('config.1.key');
    const configKey3 = screen.queryByTestId('config.2.key');
    const configKey4 = screen.queryByTestId('config.3.key');
    const configKey5 = screen.queryByTestId('config.4.key');
    const configVal1 = screen.queryByTestId('config.0.value');
    const configVal2 = screen.queryByTestId('config.1.value');
    const configVal3 = screen.queryByTestId('config.2.value');
    const configVal4 = screen.queryByTestId('config.3.value');
    const configVal5 = screen.queryByTestId('config.4.value');
    const attributeKey = screen.queryByTestId('empty-key.attributes');
    const attributeVal = screen.queryByTestId('empty-value.attributes')
    const dependencyKey = screen.queryByTestId('empty-key.dependency');
    const dependencyVal = screen.queryByTestId('empty-value.dependency');
    const parameterKey = screen.queryByTestId('empty-key.parameter');
    const parameterVal = screen.queryByTestId('empty-value.parameter');
    const flagKey1 = screen.getByTestId('flags.0.key');
    const flagVal1 = screen.getByTestId('flags.0.value');
    const flagKey2 = screen.getByTestId('flags.1.key');
    const flagVal2 = screen.getByTestId('flags.1.value');
    const parentField = screen.getByTestId('parent');

    expect(nameField.value).toBe('org.apel.APEL-Pub');
    expect(nameField).toBeDisabled()
    expect(typeField.value).toBe('Passive');
    expect(typeField).toBeDisabled()
    expect(screen.queryByRole('option', { name: /active/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /passive/i })).not.toBeInTheDocument()
    expect(probeField.value).toBe('');
    expect(probeField).toBeDisabled();
    expect(packageField.value).toBe('');
    expect(packageField).toBeDisabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeDisabled();
    expect(groupField).not.toBeInTheDocument();
    expect(executableField).not.toBeInTheDocument();
    expect(configKey1).not.toBeInTheDocument();
    expect(configVal1).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.0.remove')).not.toBeInTheDocument();
    expect(configKey2).not.toBeInTheDocument();
    expect(configVal2).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.1.remove')).not.toBeInTheDocument();
    expect(configKey3).not.toBeInTheDocument();
    expect(configVal3).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.2.remove')).not.toBeInTheDocument();
    expect(configKey4).not.toBeInTheDocument();
    expect(configVal4).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.3.remove')).not.toBeInTheDocument();
    expect(configKey5).not.toBeInTheDocument();
    expect(configVal5).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.4.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config.addnew')).not.toBeInTheDocument();
    expect(attributeKey).not.toBeInTheDocument();
    expect(attributeVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attributes.addnew')).not.toBeInTheDocument();
    expect(dependencyKey).not.toBeInTheDocument();
    expect(dependencyVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dependency.addnew')).not.toBeInTheDocument();
    expect(parameterKey).not.toBeInTheDocument();
    expect(parameterVal).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parameter.addnew')).not.toBeInTheDocument();
    expect(flagKey1.value).toBe('OBSESS');
    expect(flagKey1).toBeDisabled()
    expect(flagVal1.value).toBe('1');
    expect(flagVal1).toBeDisabled()
    expect(screen.queryByTestId('flags.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('flags.addnew')).not.toBeInTheDocument();
    expect(flagKey2.value).toBe('PASSIVE');
    expect(flagKey2).toBeDisabled()
    expect(flagVal2.value).toBe('1');
    expect(flagVal2).toBeDisabled()
    expect(parentField.value).toBe('');
    expect(parentField).toBeDisabled()
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })
})