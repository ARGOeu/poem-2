import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { Backend, WebApi } from '../DataManager';
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
    WebApi: jest.fn()
  }
})

jest.setTimeout(20000);

const mockChangeObject = jest.fn();
const mockChangeMetricProfile = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteMetricProfile = jest.fn();
const mockAddObject = jest.fn();
const mockAddMetricProfile = jest.fn();


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
    id: '1',
    groups: {
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['ARGO', 'TEST'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
};

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
  "argo.AMSPublisher-Check",
  "ch.cern.HTCondorCE-JobState",
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


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}metricprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_metricprofiles'
              render={ props => <MetricProfilesList
                {...props}
                webapimetric='https://mock.metrics.com'
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
            <Route path='/ui/metricprofiles'
              render={ props => <MetricProfilesList
                {...props}
                webapimetric='https://mock.metrics.com'
                webapitoken='token'
              /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}metricprofiles/ARGO_MON`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_metricprofiles/:name'
              render={ props => <MetricProfilesChange
                {...props}
                webapimetric='https://mock.metrics.com'
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
              path='/ui/metricprofiles/:name'
              render={props => <MetricProfilesChange
                {...props}
                webapimetric='https://mock.metrics.com'
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
  const route = '/ui/metricprofiles/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/metricprofiles/add'
            render={props => <MetricProfilesChange
              {...props}
              webapimetric='https://mock.metrics.com'
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


function renderCloneView() {
  const route = '/ui/metricprofiles/ARGO_MON2/clone';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path="/ui/metricprofiles/:name/clone"
            render={props => <MetricProfilesClone
              {...props}
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
              tenantname='TENANT'
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderVersionDetailsView() {
  const route = '/ui/metricprofiles/TEST_PROFILE/history/20201214-085323';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/metricprofiles/:name/history/:version'
            render={ props => <MetricProfileVersionDetails {...props} /> }
          />
        </Router>
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select metric profile to change');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select metric profile for details');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
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
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile),
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
        changeMetricProfile: mockChangeMetricProfile,
        deleteMetricProfile: mockDeleteMetricProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

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
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Metric profile details');
    })

    const nameField = screen.getByTestId('name');
    const descriptionField = screen.getByLabelText(/description/i);
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeDisabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeDisabled();

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
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Metric profile details');
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))

    fireEvent.click(screen.getByTestId("remove-2"))

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    await selectEvent.select(row5.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row5.getAllByText("Select...")[0], "argo.AMS-Check")

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    await selectEvent.select(row2.getAllByText("Select...")[0], "Central-LFC")
    await selectEvent.select(row2.getAllByText("Select...")[0], "ch.cern.LFC-Write")

    expect(screen.queryByText(/duplicated/i)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("remove-7"))

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    fireEvent.click(screen.getByTestId("remove-6"))
    fireEvent.click(screen.getByTestId("remove-5"))
    fireEvent.click(screen.getByTestId("remove-4"))
    fireEvent.click(screen.getByTestId("remove-3"))
    fireEvent.click(screen.getByTestId("remove-2"))
    fireEvent.click(screen.getByTestId("remove-1"))
    fireEvent.click(screen.getByTestId("remove-0"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getAllByText("Select...")).toHaveLength(2)
  })

  test('Test import csv successfully', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
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

    expect(input.files[0]).toStrictEqual(file)
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
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
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

    expect(input.files[0]).toStrictEqual(file)
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
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /change/i })).toBeInTheDocument()
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

    await selectEvent.select(row4.getAllByText("Select...")[0], "org.opensciencegrid.htcondorce")

    await selectEvent.select(row4.getAllByText("Select...")[0], "ch.cern.HTCondorCE-JobState")

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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

  test('Test error changing metric profile on web api without error message', async () => {
    mockChangeMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been error in the backend.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3])
    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(metricInstances.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    fireEvent.click(screen.getByTestId('remove-1'))

    fireEvent.click(screen.getByTestId('insert-0'))

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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

  test('Test import csv, make some changes and save profile', async() => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: 'ok' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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

    expect(input.files[0]).toStrictEqual(file)
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId('file_input'))
    })

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

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
            service: 'org.opensciencegrid.htcondorce',
            metrics: [
              'ch.cern.HTCondorCE-JobState',
              'ch.cern.HTCondorCE-JobSubmit'
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
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'org.opensciencegrid.htcondorce', metric: 'ch.cern.HTCondorCE-JobState' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'org.opensciencegrid.htcondorce', metric: 'ch.cern.HTCondorCE-JobSubmit' }
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('metricprofile');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('public_metricprofile');
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting metric profile on web api with error message', async () => {
    mockDeleteMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(mockDeleteObject).not.toHaveBeenCalled()
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(mockDeleteObject).not.toHaveBeenCalled()
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
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an internal error.')
    } );
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv'
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
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv'
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
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        addMetricProfile: mockAddMetricProfile,
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

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

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[2]).getAllByText("Select...")).toHaveLength(2)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test("Test add main profile info", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))
    var rows = metricInstances.getAllByRole("row")
    var row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.egi.CertValidity")

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("insert-0"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    var row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row2.getAllByText("Select...")[0], "argo.AMS-Check")

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    row1 = within(rows[2])
    row2 = within(rows[3])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId("insert-1"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(5)
    var row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.egi.CertValidity")

    expect(screen.queryByText(/duplicated/i)).toBeInTheDocument()

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(6)
    row1 = within(rows[2])
    row2 = within(rows[3])
    row3 = within(rows[4])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(row3.getByText("argo.mon")).toBeInTheDocument()
    expect(row3.getByText("eu.egi.CertValidity")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("remove-2"))

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(4)
    row1 = within(rows[2])
    row2 = within(rows[3])
    expect(row1.getByText("argo.mon")).toBeInTheDocument()
    expect(row1.getByText("eu.egi.CertValidity")).toBeInTheDocument()
    expect(row2.getByText("eu.argo.ams")).toBeInTheDocument()
    expect(row2.getByText("argo.AMS-Check")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("remove-1"))

    fireEvent.click(screen.getByTestId("remove-0"))

    rows = metricInstances.getAllByRole("row")
    expect(rows).toHaveLength(3)
    row1 = within(rows[2])
    expect(row1.getAllByText("Select...")).toHaveLength(2)
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    var row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    var row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

    fireEvent.click(screen.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.AMSPublisher-Check")

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row4.getAllByText("Select...")[0], "eu.egi.CertValidity")

    fireEvent.click(metricInstances.getByTestId('remove-3'));

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
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

  test('Test error adding a metric profile in web api with error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.AMSPublisher-Check")

    fireEvent.click(screen.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row4.getAllByText("Select...")[0], "eu.egi.CertValidity")

    fireEvent.click(screen.getByTestId('remove-3'));

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
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

  test('Test error adding a metric profile in web api without error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.AMSPublisher-Check")

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row4.getAllByText("Select...")[0], "eu.egi.CertValidity")

    fireEvent.click(metricInstances.getByTestId('remove-3'));

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
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
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been an internal error.')
    } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.AMSPublisher-Check")

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row4.getAllByText("Select...")[0], "eu.egi.CertValidity")

    fireEvent.click(metricInstances.getByTestId('remove-3'));

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
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
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getAllByText("Select...")[0], 'ARGO')

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[2])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(metricInstances.getByTestId('insert-0'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4])

    await selectEvent.select(row3.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row3.getAllByText("Select...")[0], "argo.AMSPublisher-Check")

    fireEvent.click(screen.getByTestId('insert-2'));

    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5])

    await selectEvent.select(row4.getAllByText("Select...")[0], "argo.mon")
    await selectEvent.select(row4.getAllByText("Select...")[0], "eu.egi.CertValidity")

    fireEvent.click(screen.getByTestId('remove-3'));

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check',
              'argo.AMSPublisher-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
            ]
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          apiid: 'va0ahsh6-6rs0-14ho-xlh9-wahso4hie7iv',
          name: 'NEW_PROFILE',
          groupname: 'ARGO',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
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
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile2),
        fetchServiceTypes: () => Promise.resolve(mockWebApiServiceTypes),
        addMetricProfile: mockAddMetricProfile,
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile2),
        fetchListOfNames: () => Promise.resolve(mockMetrics),
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

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

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test("Test change main profile info", async () => {
    renderCloneView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    const metricInstances = within(screen.getByRole("table"))

    fireEvent.click(screen.getByTestId("remove-2"))

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    await selectEvent.select(row5.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row5.getAllByText("Select...")[0], "argo.AMS-Check")

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    await selectEvent.select(row2.getAllByText("Select...")[0], "Central-LFC")
    await selectEvent.select(row2.getAllByText("Select...")[0], "ch.cern.LFC-Write")

    expect(screen.queryByText(/duplicated/i)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("remove-7"))

    expect(screen.queryByText(/duplicated/i)).not.toBeInTheDocument()

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

    fireEvent.click(screen.getByTestId("remove-6"))
    fireEvent.click(screen.getByTestId("remove-5"))
    fireEvent.click(screen.getByTestId("remove-4"))
    fireEvent.click(screen.getByTestId("remove-3"))
    fireEvent.click(screen.getByTestId("remove-2"))
    fireEvent.click(screen.getByTestId("remove-1"))
    fireEvent.click(screen.getByTestId("remove-0"))

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
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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

  test('Test error cloning metric profile on web api with error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => {
      throw Error('406 Content Not acceptable: There has been an error.')
    } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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

  test('Test error cloning metric profile on web api without error message', async () => {
    mockAddMetricProfile.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: There has been error in the backend.')
    } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    await selectEvent.select(screen.getByText('ARGO'), 'TEST')

    fireEvent.click(screen.getByTestId('remove-1'));

    fireEvent.click(screen.getByTestId('insert-0'));

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');
    const row1 = within(rows[3])

    await selectEvent.select(row1.getAllByText("Select...")[0], "eu.argo.ams")
    await selectEvent.select(row1.getAllByText("Select...")[0], "argo.AMS-Check")

    fireEvent.click(screen.getByTestId('insert-1'));

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4])

    await selectEvent.select(row2.getAllByText("Select...")[0], "egi.AppDB")
    await selectEvent.select(row2.getAllByText("Select...")[0], "org.nagiosexchange.AppDB-WebCheck")

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
            service: 'eu.argo.ams',
            metrics: [
              'argo.AMS-Check'
            ]
          },
          {
            service: 'egi.AppDB',
            metrics: [
              'org.nagiosexchange.AppDB-WebCheck'
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
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricprofiles/',
        {
          name: 'ARGO_MON',
          apiid: 'hithai1j-zn0i-sj7d-p3pz-gothoorie2ei',
          groupname: 'TEST',
          description: 'New central ARGO_MON profile.',
          services: [
            { service: 'argo.mon', metric: 'eu.egi.CertValidity' },
            { service: 'eu.argo.ams', metric: 'argo.AMS-Check' },
            { service: 'egi.AppDB', metric: 'org.nagiosexchange.AppDB-WebCheck' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-AR' },
            { service: 'argo.webui', metric: 'org.nagios.ARGOWeb-Status' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Ping' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Read' },
            { service: 'Central-LFC', metric: 'ch.cern.LFC-Write' }
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /test/i }).textContent).toBe('TEST_PROFILE (2020-12-14 08:53:23)')
    })

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