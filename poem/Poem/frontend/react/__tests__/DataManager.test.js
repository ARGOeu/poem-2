import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom/extend-expect';
import { Backend, WebApi } from '../DataManager';

// eslint-disable-next-line no-undef
global.fetch = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
})


const mockTenantActiveSession = {
  "active": true,
  "userdetails": {
    "first_name": "",
    "last_name": "",
    "username": "poem",
    "is_active": true,
    "is_superuser": true,
    "email": "poem@example.com",
    "date_joined": "2017-07-20T14:48:52.238000",
    "pk": 1,
    "groups":{
      "aggregations": ["TEST1"],
      "metrics": ["TEST2", "TEST3"],
      "metricprofiles": ["TEST4", "TEST5"],
      "thresholdsprofiles": ["TEST6"],
      "reports": ["TEST7"]
    },
    "token":"m0ck-t0k3n"
  }
};

const mockSuperActiveSession = {
  "active": true,
  "userdetails": {
    "first_name": "",
    "last_name": "",
    "username": "poem",
    "is_active": true,
    "is_superuser": true,
    "email":"poem@example.com",
    "date_joined": "2019-07-08T12:58:08.108000",
    "pk": 1
  }
};

const mockAPIKey = {
  id: '1',
  name: 'TEST',
  token: 'Oowei9en4jaefuuc',
  created: '2021-09-20',
  revoked: false
};

const mockConfigOptions = {
  'result': {
    'saml_login_string': 'Log in using B2ACCESS',
    'webapimetric': 'https://metric.profile.com',
    'webapiaggregation': 'https://aggregations.com',
    'webapithresholds': 'https://thresholds.com',
    'webapioperations': 'https://operations.com',
    'version': '1.0.0',
    'webapireports': {
        'main': 'https://reports.com',
        'crud': true,
        'tags': 'https://reports-tags.com',
        'topologygroups': 'https://topology-groups.com',
        'topologyendpoints': 'https://endpoints.com'
    },
    'tenant_name': 'Tenant'
  }
};

const mockData = [
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

const mockResult = {
  result: {
    aggregations: ['aggr-group1', 'aggr-group2'],
    metrics: ['metric-group1', 'metric-group2', 'metric-group3'],
    metricprofiles: ['mp-group1'],
    reports: ['report-group1', 'report-group2'],
    thresholdsprofiles: ['threshold-group2', 'threshold-group3']
  }
}

const mockSendValues = {
  id: 'oKo1paFohth8iSie',
  key1: 'value1',
  key2: 'value2',
  key3: {
    key4: 'value4'
  }
};

const mockImportMetrics = {
  imported: "metric1, metric2 have been successfully imported.",
  warn: "metric3 has been imported with older probe version. ",
  err: "metric4, metric5, metric6 have not been imported since they already exist in the database.",
  unavailable: "metric7 has not been imported, since it is not available for the package version you use."
}

const mockBulkDeleteMTs = {
  info: 'Metric templates argo.AMS-Check, test.AMS-Check successfully deleted.'
}

const mockMetricProfiles = {
  status: {
    message: 'Success',
    code: '200'
  },
  data: [
    {
      id: 'chi6ahPhoh5ioTha',
      date: '2021-02-03',
      name: 'PROFILE1',
      description: 'Description for PROFILE1',
      services: [
        {
          service: 'org.opensciencegrid.htcondorce',
          metrics: [
            'ch.cern.HTCondorCE-JobState',
            'ch.cern.HTCondorCE-JobSubmit'
          ]
        }
      ]
    },
    {
      id: 'aa7eiy5Ahvegiree',
      date: '2021-01-26',
      name: 'PROFILE2',
      description: 'Description for PROFILE2',
      services: [
        {
          service: 'argo.mon',
          metrics: [
            'eu.egi.CertValidity',
            'org.nagios.NagiosWebInterface'
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
    }
  ]
};

const mockMetricProfile = {
  status: {
    message: 'Success',
    code: '200'
  },
  data: [
    {
      id: 'chi6ahPhoh5ioTha',
      date: '2021-02-03',
      name: 'PROFILE1',
      description: 'Description for PROFILE1',
      services: [
        {
          service: 'org.opensciencegrid.htcondorce',
          metrics: [
            'ch.cern.HTCondorCE-JobState',
            'ch.cern.HTCondorCE-JobSubmit'
          ]
        }
      ]
    }
  ]
};

const mockOperationsProfiles = [
  {
   "id": "1111-2222-3333-4444-5555",
   "date": "2015-01-01",
   "name": "egi_ops",
   "available_states": [
    "OK",
    "WARNING",
    "UNKNOWN",
    "MISSING",
    "CRITICAL",
    "DOWNTIME"
   ],
   "defaults": {
    "down": "DOWNTIME",
    "missing": "MISSING",
    "unknown": "UNKNOWN"
   },
   "operations": [
    {
     "name": "AND",
     "truth_table": [
      {
       "a": "OK",
       "b": "OK",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "OK",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "OK",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "OK",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "OK",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "WARNING",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "WARNING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "WARNING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "WARNING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "UNKNOWN",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "UNKNOWN",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "UNKNOWN",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "MISSING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "MISSING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "MISSING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "CRITICAL",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "CRITICAL",
       "b": "DOWNTIME",
       "x": "CRITICAL"
      },
      {
       "a": "DOWNTIME",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      }
     ]
    },
    {
     "name": "OR",
     "truth_table": [
      {
       "a": "OK",
       "b": "OK",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "WARNING",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "UNKNOWN",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "MISSING",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "CRITICAL",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "DOWNTIME",
       "x": "OK"
      },
      {
       "a": "WARNING",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "UNKNOWN",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "MISSING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "CRITICAL",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "DOWNTIME",
       "x": "WARNING"
      },
      {
       "a": "UNKNOWN",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "MISSING",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "UNKNOWN",
       "b": "DOWNTIME",
       "x": "UNKNOWN"
      },
      {
       "a": "MISSING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "MISSING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "MISSING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "CRITICAL",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "CRITICAL",
       "b": "DOWNTIME",
       "x": "CRITICAL"
      },
      {
       "a": "DOWNTIME",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      }
     ]
    }
   ]
  }
];

const mockReports = [
  {
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
      }
    ]
  },
  {
    id: "Feeyi0ieBiezooth",
    tenant: "EGI",
    disabled: false,
    info: {
      name: "Report2",
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
      }
    ]
  }
];


describe('Tests for backend', () => {
  test('Test tenant active session', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockTenantActiveSession)
      })
    )

    const backend = new Backend();

    const response = await backend.isActiveSession();
    expect(fetch).toBeCalledWith('/api/v2/internal/sessionactive/true')
    expect(response).toBe(mockTenantActiveSession);
  })

  test('Test tenant active session with error', async () => {
    fetch.mockImplementationOnce( () => { throw Error('There has been an error.') } );

    const backend = new Backend();

    const response = await backend.isActiveSession();
    expect(fetch).toBeCalledWith('/api/v2/internal/sessionactive/true')
    expect(response).toBe(false);
  })

  test('Test super POEM active session', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockSuperActiveSession)
      })
    )

    const backend = new Backend();

    const response = await backend.isActiveSession(false);
    expect(fetch).toBeCalledWith('/api/v2/internal/sessionactive/false')
    expect(response).toBe(mockSuperActiveSession)
  })

  test('Test super POEM active session with error', async () => {
    fetch.mockImplementationOnce( () => { throw Error('There has been an error.') } );

    const backend = new Backend();

    const response = await backend.isActiveSession(false);
    expect(fetch).toBeCalledWith('/api/v2/internal/sessionactive/false')
    expect(response).toBe(false);
  })

  test('Test if is tenant', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ isTenantSchema: true })
      })
    )

    const backend = new Backend();
    const response = await backend.isTenantSchema();
    expect(fetch).toBeCalledWith('/api/v2/internal/istenantschema');
    expect(response).toBeTruthy();
  })

  test('Test if is not tenant', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ isTenantSchema: false })
      })
    )

    const backend = new Backend();
    const response = await backend.isTenantSchema();
    expect(fetch).toBeCalledWith('/api/v2/internal/istenantschema');
    expect(response).toBeFalsy();
  })

  test('Test if is tenant with error', async () => {
    fetch.mockImplementationOnce( () => { throw Error('There has been an error.') } );

    const backend = new Backend();
    const response = await backend.isTenantSchema();
    expect(fetch).toBeCalledWith('/api/v2/internal/istenantschema');
    expect(response).toBeFalsy();
  })

  test('Test fetch public token', async () => {
   fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockAPIKey)
      })
   )

    const backend = new Backend();

    const response = await backend.fetchPublicToken()
    expect(fetch).toBeCalledWith('/api/v2/internal/public_apikey');
    expect(response).toBe('Oowei9en4jaefuuc')
  })

  test('Test fetch public token with error', async () => {
   fetch.mockImplementationOnce( () => { throw Error('There has been an error.') } );

    const backend = new Backend();

    const response = await backend.fetchPublicToken()
    expect(fetch).toBeCalledWith('/api/v2/internal/public_apikey');
    expect(response).toBeFalsy();
  })

  test('Test fetch config options', async () => {
   fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockConfigOptions)
      })
    )

    const backend = new Backend();

    const response = await backend.fetchConfigOptions();
    expect(fetch).toBeCalledWith('/api/v2/internal/config_options');
    expect(response).toBe(mockConfigOptions);
  })

  test('Test fetch config options with error', async () => {
   fetch.mockImplementationOnce( () => { throw Error('There has been an error') } );

    const backend = new Backend();

    try {
      await backend.fetchConfigOptions();
    } catch(e) {
      expect(e.message).toEqual('Error: There has been an error in fetch /api/v2/internal/config_options');
    }
    expect(fetch).toBeCalledWith('/api/v2/internal/config_options');
  })

  test('Test fetch data successfully', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockData)
      })
    )

    const backend = new Backend();

    const response = await backend.fetchData('/some/mock/url');

    await waitFor(() => {
      expect(response).toBe(mockData)
    })

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching data with a json error message', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ 'detail': 'There has been an error.' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchData('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url: There has been an error.')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching data with an invalid json error message', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ 'message': 'There has been an error.' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchData('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching data without json error message', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const backend = new Backend();

    try {
      await backend.fetchData('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching data with error in fetch', async () => {
    fetch.mockImplementationOnce( () => {
      throw Error('There has been an error')
    } );

    const backend = new Backend();

    try {
      await backend.fetchData('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test fetch list of names successfully', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockData)
      })
    )

    const backend = new Backend();

    const response = await backend.fetchListOfNames('/some/mock/url');

    expect(response).toStrictEqual(['argo.AMS-Check', 'argo.AMS-Publisher', 'org.apel.APEL-Pub'])

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching list of names with json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchListOfNames('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url: There has been an error')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching list of names with an invalid json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchListOfNames('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching list of names without json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const backend = new Backend();

    try {
      await backend.fetchListOfNames('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test error fetching list of names with fetch error', async () => {
    fetch.mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    const backend = new Backend();

    try {
      await backend.fetchListOfNames('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in fetch /some/mock/url')
    }

    expect(fetch).toBeCalledWith('/some/mock/url');
  })

  test('Test fetch result successfully', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResult)
      })
    )

    const backend = new Backend();

    const response = await backend.fetchResult('/some/mock/url');

    expect(response).toBe(mockResult['result']);

    expect(fetch).toHaveBeenCalledWith('/some/mock/url');
  })

  test('Test error fetching result with json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchResult('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url: There has been an error')
    }

    expect(fetch).toHaveBeenCalledWith('/some/mock/url');
  })

  test('Test error fetching result with an invalid json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    const backend = new Backend();

    try {
      await backend.fetchResult('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url')
    }

    expect(fetch).toHaveBeenCalledWith('/some/mock/url');
  })

  test('Test error fetching result without json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const backend = new Backend();

    try {
      await backend.fetchResult('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in fetch /some/mock/url')
    }

    expect(fetch).toHaveBeenCalledWith('/some/mock/url');
  })

  test('Test error fetching result with fetch error', async () => {
    fetch.mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    const backend = new Backend();

    try {
      await backend.fetchResult('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in fetch /some/mock/url')
    }

    expect(fetch).toHaveBeenCalledWith('/some/mock/url');
  })

  test('Test successfully changing an object', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: 'CREATED'
      })
    )

    const response = await backend.changeObject('/some/mock/url', mockSendValues);

    expect(response).toStrictEqual({ ok: true, status: 201, statusText: 'CREATED' });
    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'PUT', mockSendValues);
  })

  test('Test error changing an object with json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    try {
      await backend.changeObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in PUT /some/mock/url: There has been an error')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'PUT', mockSendValues);
  })

  test('Test error changing an object with an invalid json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    try {
      await backend.changeObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in PUT /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'PUT', mockSendValues);
  })

  test('Test error changing an object without json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    try {
      await backend.changeObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in PUT /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'PUT', mockSendValues);
  })

  test('Test error changing an object with fetching error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    try {
      await backend.changeObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in PUT /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'PUT', mockSendValues);
  })

  test('Test successfully adding object', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: 'CREATED'
      })
    )

    const response = await backend.addObject('/some/mock/url', mockSendValues);

    expect(response).toBeFalsy();
    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'POST', mockSendValues);
  })

  test('Test error adding object with json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    try {
      await backend.addObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST /some/mock/url: There has been an error')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'POST', mockSendValues);
  })

  test('Test error adding object with an invalid json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    try {
      await backend.addObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'POST', mockSendValues);
  })

  test('Test error adding object without json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    try {
      await backend.addObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in POST /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'POST', mockSendValues);
  })

  test('Test error adding object with fetching error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    try {
      await backend.addObject('/some/mock/url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in POST /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'POST', mockSendValues);
  })

  test('Test successfully deleting an object', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 204,
        statusTExt: 'NO CONTENT'
      })
    )

    const response = await backend.deleteObject('/some/mock/url');

    expect(response).toBeFalsy();
    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'DELETE')
  })

  test('Test error deleting an object with json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    try {
      await backend.deleteObject('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in DELETE /some/mock/url: There has been an error')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'DELETE')
  })

  test('Test error deleting an object with an invalid json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    try {
      await backend.deleteObject('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in DELETE /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'DELETE')
  })

  test('Test error deleting an object without json message', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    try {
      await backend.deleteObject('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in DELETE /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'DELETE')
  })

  test('Test error deleting an object with fetching error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    try {
      await backend.deleteObject('/some/mock/url');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in DELETE /some/mock/url')
    }

    expect(spy).toHaveBeenCalledWith('/some/mock/url', 'DELETE')
  })

  test('Test successfully importing metrics', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: 'CREATED',
        json: () => Promise.resolve(mockImportMetrics)
      })
    )

    const metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7'];

    const response = await backend.importMetrics(metrics);

    expect(response).toBe(mockImportMetrics)
    expect(spy).toHaveBeenCalledWith('/api/v2/internal/importmetrics/', 'POST', metrics)
  })

  test('Test error importing metrics with json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    const metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7'];

    try {
      await backend.importMetrics(metrics);
    } catch(err){
      expect(err.message).toBe('400 BAD REQUEST in POST /api/v2/internal/importmetrics/: There has been an error')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/importmetrics/', 'POST', metrics)
  })

  test('Test error importing metrics with an invalid json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    const metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7'];

    try {
      await backend.importMetrics(metrics);
    } catch(err){
      expect(err.message).toBe('400 BAD REQUEST in POST /api/v2/internal/importmetrics/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/importmetrics/', 'POST', metrics)
  })

  test('Test error importing metrics without json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7'];

    try {
      await backend.importMetrics(metrics);
    } catch(err){
      expect(err.message).toBe('500 SERVER ERROR in POST /api/v2/internal/importmetrics/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/importmetrics/', 'POST', metrics)
  })

  test('Test error importing metrics with fetching error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    const metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7'];

    try {
      await backend.importMetrics(metrics);
    } catch(err){
      expect(err.message).toBe('Error: There has been an error in POST /api/v2/internal/importmetrics/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/importmetrics/', 'POST', metrics)
  })

  test('Test successfully bulk delete metric templates', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockBulkDeleteMTs)
      })
    )

    const metrics = ['argo.AMS-Check', 'test.AMS-Check'];

    const response = await backend.bulkDeleteMetrics(metrics);

    expect(response).toBe(mockBulkDeleteMTs);
    expect(spy).toHaveBeenCalledWith('/api/v2/internal/deletetemplates/', 'POST', metrics);
  })

  test('Test error bulk deleting metric templates with json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ detail: 'There has been an error' })
      })
    )

    const metrics = ['argo.AMS-Check', 'test.AMS-Check'];

    try {
      await backend.bulkDeleteMetrics(metrics);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST /api/v2/internal/deletetemplates/: There has been an error')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/deletetemplates/', 'POST', metrics);
  })

  test('Test error bulk deleting metric templates with an invalid json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ message: 'There has been an error' })
      })
    )

    const metrics = ['argo.AMS-Check', 'test.AMS-Check'];

    try {
      await backend.bulkDeleteMetrics(metrics);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST /api/v2/internal/deletetemplates/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/deletetemplates/', 'POST', metrics);
  })

  test('Test error bulk deleting metric templates without json error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const metrics = ['argo.AMS-Check', 'test.AMS-Check'];

    try {
      await backend.bulkDeleteMetrics(metrics);
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in POST /api/v2/internal/deletetemplates/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/deletetemplates/', 'POST', metrics);
  })

  test('Test error bulk deleting metric templates with fetching error', async () => {
    const backend = new Backend();

    let spy = jest.spyOn(backend, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    const metrics = ['argo.AMS-Check', 'test.AMS-Check'];

    try {
      await backend.bulkDeleteMetrics(metrics);
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in POST /api/v2/internal/deletetemplates/')
    }

    expect(spy).toHaveBeenCalledWith('/api/v2/internal/deletetemplates/', 'POST', metrics);
  })
})


describe('Tests for WebApi', () => {
  test('Test fetch profiles', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    const response = await webapi.fetchProfiles('/some/mock/url');

    expect(response).toBe(mockMetricProfiles['data']);
    expect(fetch).toBeCalledWith(
      '/some/mock/url', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching profiles with json error', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ status: { details: 'There has been an error' } })
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfiles('/some/mock/url');
    } catch (err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url: There has been an error');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching profiles with an invalid json error', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({  details: 'There has been an error' } )
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfiles('/some/mock/url');
    } catch (err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching profiles without json error', async () => {
    fetch.mockReturnValueOnce(
        Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfiles('/some/mock/url');
    } catch (err) {
      expect(err.message).toBe('500 SERVER ERROR in fetch /some/mock/url');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching profiles with fetch error', async () => {
    fetch.mockImplementationOnce( () => {
      throw Error('There has been an error')
    } )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfiles('/some/mock/url');
    } catch (err) {
      expect(err.message).toBe('Error: There has been an error in fetch /some/mock/url');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test fetch metric profiles', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', metricProfiles: 'mock.metricprofile.url' });

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchMetricProfiles();

    expect(spy).toHaveBeenCalledWith('mock.metricprofile.url')
  })

  test('Test fetch aggregation profiles', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', aggregationProfiles: 'mock.aggregation.url' });

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchAggregationProfiles();

    expect(spy).toHaveBeenCalledWith('mock.aggregation.url')
  })

  test('Test fetch operations profiles', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', operationsProfiles: 'mock.operationsprofiles.url' });

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchOperationsProfiles();

    expect(spy).toHaveBeenCalledWith('mock.operationsprofiles.url')
  })

  test('Test fetch reports', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchReports();

    expect(spy).toHaveBeenCalledWith('mock.reports.url')
  })

  test('Test fetch topology endpoints', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchReportsTopologyEndpoints();

    expect(spy).toHaveBeenCalledWith('mock.reports-topology-endpoints.url')
  })

  test('Test fetch topology groups', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchReportsTopologyGroups();

    expect(spy).toHaveBeenCalledWith('mock.reports-topology-groups.url')
  })

  test('Test fetch topology tags', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchProfiles').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfiles)
      })
    )

    await webapi.fetchReportsTopologyTags();

    expect(spy).toHaveBeenCalledWith('mock.reports-tags.url')
  })

  test('Test successfully fetch a profile', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockMetricProfile)
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    const response = await webapi.fetchProfile('/some/mock/url/chi6ahPhoh5ioTha');

    expect(response).toBe(mockMetricProfile['data'][0]);
    expect(fetch).toBeCalledWith(
      '/some/mock/url/chi6ahPhoh5ioTha', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching a profile with json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ status: { details: 'There has been an error' } })
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfile('/some/mock/url/chi6ahPhoh5ioTha');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url/chi6ahPhoh5ioTha: There has been an error');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url/chi6ahPhoh5ioTha', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching a profile with an invalid json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ details: 'There has been an error' } )
      })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfile('/some/mock/url/chi6ahPhoh5ioTha');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in fetch /some/mock/url/chi6ahPhoh5ioTha');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url/chi6ahPhoh5ioTha', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching a profile without json error', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfile('/some/mock/url/chi6ahPhoh5ioTha');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in fetch /some/mock/url/chi6ahPhoh5ioTha');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url/chi6ahPhoh5ioTha', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test error fetching a profile with error in fetch', async () => {
    fetch.mockImplementationOnce( () => { throw Error('There has been an error') })

    const webapi = new WebApi({ token: 'reimohl4thub0Zai' });

    try {
      await webapi.fetchProfile('/some/mock/url/chi6ahPhoh5ioTha');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in fetch /some/mock/url/chi6ahPhoh5ioTha');
    }

    expect(fetch).toBeCalledWith(
      '/some/mock/url/chi6ahPhoh5ioTha', { headers: { 'Accept': 'application/json', 'x-api-key': 'reimohl4thub0Zai' } }
      )
  })

  test('Test fetch metric profile', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', metricProfiles: 'mock.metricprofiles.url' });

    let spy = jest.spyOn(webapi, 'fetchProfile').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
    );

    await webapi.fetchMetricProfile('ziyaiph3Quaethea');

    expect(spy).toHaveBeenCalledWith('mock.metricprofiles.url/ziyaiph3Quaethea')
  })

  test('Test fetch operations profile', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', metricProfiles: 'mock.metricprofiles.url' });

    let spy = jest.spyOn(webapi, 'fetchOperationsProfiles').mockReturnValueOnce(
      Promise.resolve(mockOperationsProfiles)
    );

    const response = await webapi.fetchOperationProfile('egi_ops')

    expect(response).toBe(mockOperationsProfiles[0]);

    expect(spy).toHaveBeenCalledTimes(1);
  })

  test('Test fetch operations profile if empty', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', metricProfiles: 'mock.metricprofiles.url' });

    let spy = jest.spyOn(webapi, 'fetchOperationsProfiles').mockReturnValueOnce(
      Promise.resolve([])
    );

    const response = await webapi.fetchOperationProfile('egi_ops')

    expect(response).toStrictEqual({});

    expect(spy).toHaveBeenCalledTimes(1);
  })

  test('Test fetch report', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchReports').mockReturnValueOnce(
      Promise.resolve(mockReports)
    )

    const response = await webapi.fetchReport('Critical');

    expect(response).toBe(mockReports[0]);

    expect(spy).toHaveBeenCalledTimes(1);
  })

  test('Test fetch report if empty', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'fetchReports').mockReturnValueOnce(
      Promise.resolve([])
    )

    const response = await webapi.fetchReport('Critical');

    expect(response).toStrictEqual({});

    expect(spy).toHaveBeenCalledTimes(1);
  })

  test('Test fetch aggregation profile', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', aggregationProfiles: 'mock.aggregations.url' });

    let spy = jest.spyOn(webapi, 'fetchProfile').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
    );

    await webapi.fetchAggregationProfile('ziyaiph3Quaethea');

    expect(spy).toHaveBeenCalledWith('mock.aggregations.url/ziyaiph3Quaethea')
  })

  test('Test fetch thresholdsprofile profile', async () => {
    const webapi = new WebApi({ token: 'reimohl4thub0Zai', thresholdsProfiles: 'mock.thresholds.url' });

    let spy = jest.spyOn(webapi, 'fetchProfile').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
    );

    await webapi.fetchThresholdsProfile('ziyaiph3Quaethea');

    expect(spy).toHaveBeenCalledWith('mock.thresholds.url/ziyaiph3Quaethea')
  })

  test('Test successfully change profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ ok: 'ok' })
      })
    );

    const response = await webapi.changeProfile('some.mock.url', mockSendValues);

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('some.mock.url/oKo1paFohth8iSie', 'PUT', mockSendValues)
  })

  test('Test error change profile with json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ status: { details: 'not ok' } })
      })
    );

    try {
      await webapi.changeProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in PUT some.mock.url: not ok');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url/oKo1paFohth8iSie', 'PUT', mockSendValues)
  })

  test('Test error change profile with an invalid json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ details: 'not ok' } )
      })
    );

    try {
      await webapi.changeProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in PUT some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url/oKo1paFohth8iSie', 'PUT', mockSendValues)
  })

  test('Test error change profile without json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    );

    try {
      await webapi.changeProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in PUT some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url/oKo1paFohth8iSie', 'PUT', mockSendValues)
  })

  test('Test error change profile with error in fetch', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } );

    try {
      await webapi.changeProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in PUT some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url/oKo1paFohth8iSie', 'PUT', mockSendValues)
  })

  test('Test change aggregation profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', aggregationProfiles: 'mock.aggregations.url' })

    let spy = jest.spyOn(webapi, 'changeProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.changeAggregation(mockData);

    expect(response).toStrictEqual({ ok: 'ok' });
    expect(spy).toHaveBeenCalledWith('mock.aggregations.url', mockData)
  })

  test('Test change metric profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', metricProfiles: 'mock.metricprofiles.url' })

    let spy = jest.spyOn(webapi, 'changeProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.changeMetricProfile(mockData);

    expect(response).toStrictEqual({ ok: 'ok' });
    expect(spy).toHaveBeenCalledWith('mock.metricprofiles.url', mockData)
  })

  test('Test change thresholds profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', thresholdsProfiles: 'mock.thresholds.url' })

    let spy = jest.spyOn(webapi, 'changeProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.changeThresholdsProfile(mockData);

    expect(response).toStrictEqual({ ok: 'ok' });
    expect(spy).toHaveBeenCalledWith('mock.thresholds.url', mockData)
  })

  test('Test change report', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'changeProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.changeReport(mockData);

    expect(response).toStrictEqual({ ok: 'ok' });
    expect(spy).toHaveBeenCalledWith('mock.reports.url', mockData)
  })

  test('Test succesfully add profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ ok: 'ok' })
      })
    );

    const response = await webapi.addProfile('some.mock.url', mockSendValues);

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('some.mock.url', 'POST', mockSendValues)
  })

  test('Test error adding profile with json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ status: { details: 'not ok' } })
      })
    );

    try {
      await webapi.addProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST some.mock.url: not ok');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'POST', mockSendValues)
  })

  test('Test error adding profile with an invalid json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve( { details: 'not ok' } )
      })
    );

    try {
      await webapi.addProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in POST some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'POST', mockSendValues)
  })

  test('Test error adding profile without json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    );

    try {
      await webapi.addProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in POST some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'POST', mockSendValues)
  })

  test('Test error adding profile with error in fetch', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockImplementationOnce( () => {
      throw Error('There has been an error')
    } );

    try {
      await webapi.addProfile('some.mock.url', mockSendValues);
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in POST some.mock.url');
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'POST', mockSendValues)
  })

  test('Test add metric profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', metricProfiles: 'mock.metricprofiles.url' })

    let spy = jest.spyOn(webapi, 'addProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.addMetricProfile(mockSendValues)

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('mock.metricprofiles.url', mockSendValues)
  })

  test('Test add aggregation profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', aggregationProfiles: 'mock.aggregations.url' })

    let spy = jest.spyOn(webapi, 'addProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.addAggregation(mockSendValues)

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('mock.aggregations.url', mockSendValues)
  })

  test('Test add thresholds profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu', thresholdsProfiles: 'mock.thresholds.url' })

    let spy = jest.spyOn(webapi, 'addProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.addThresholdsProfile(mockSendValues)

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('mock.thresholds.url', mockSendValues)
  })

  test('Test add report', async () => {
    const webapi = new WebApi({
      token: 'reimohl4thub0Zai',
      reportsConfigurations: {
        main: 'mock.reports.url',
        crud: true,
        tags: 'mock.reports-tags.url',
        topologygroups: 'mock.reports-topology-groups.url',
        topologyendpoints: 'mock.reports-topology-endpoints.url'
      }
    })

    let spy = jest.spyOn(webapi, 'addProfile').mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    const response = await webapi.addReport(mockSendValues)

    expect(response).toStrictEqual({ ok: 'ok' })
    expect(spy).toHaveBeenCalledWith('mock.reports.url', mockSendValues)
  })

  test('Test successfully delete a profile', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
    );

    const response = await webapi.deleteProfile('some.mock.url');

    expect(response).toStrictEqual({ ok: true, status: 200, statusText: 'OK' });
    expect(spy).toHaveBeenCalledWith('some.mock.url', 'DELETE');
  })

  test('Test error deleting a profile with json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ status: { details: 'not ok' } })
      })
    );

    try {
      await webapi.deleteProfile('some.mock.url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in DELETE some.mock.url: not ok')
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'DELETE');
  })

  test('Test error deleting a profile with an invalid json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({
        status: 400,
        statusText: 'BAD REQUEST',
        json: () => Promise.resolve({ details: 'not ok'  })
      })
    );

    try {
      await webapi.deleteProfile('some.mock.url');
    } catch(err) {
      expect(err.message).toBe('400 BAD REQUEST in DELETE some.mock.url')
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'DELETE');
  })

  test('Test error deleting a profile without json error', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    );

    try {
      await webapi.deleteProfile('some.mock.url');
    } catch(err) {
      expect(err.message).toBe('500 SERVER ERROR in DELETE some.mock.url')
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'DELETE');
  })

  test('Test error deleting a profile with error in fetch', async () => {
    const webapi = new WebApi({ token: 'Voh2jaRu' })

    let spy = jest.spyOn(webapi, 'send').mockImplementationOnce(() => {
      throw Error('There has been an error')
    })

    try {
      await webapi.deleteProfile('some.mock.url');
    } catch(err) {
      expect(err.message).toBe('Error: There has been an error in DELETE some.mock.url')
    }

    expect(spy).toHaveBeenCalledWith('some.mock.url', 'DELETE');
  })

})