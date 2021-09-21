import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom/extend-expect';
import { Backend } from '../DataManager';

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