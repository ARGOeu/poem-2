import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { Backend, WebApi } from '../DataManager';
import { queryCache } from 'react-query';
import {
  MetricProfilesChange,
  MetricProfilesList,
  MetricProfilesClone,
  MetricProfileVersionDetails
} from '../MetricProfiles';
import { NotificationManager } from 'react-notifications'
import useEvent from '@testing-library/user-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

const mockChangeObject = jest.fn();
const mockChangeMetricProfile = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteMetricProfile = jest.fn();
const mockAddObject = jest.fn();
const mockAddMetricProfile = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
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

const mockServiceTypes = [
  "ARC-CE",
  "argo.mon",
  "argo.webui",
  "Central-LFC",
  "egi.AppDB",
  "eu.argo.ams",
  "org.opensciencegrid.htcondorce"
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
        <Router history={history}>
          <Route
            path='/ui/public_metricprofiles'
            render={ props => <MetricProfilesList publicView={true} {...props} /> }
          />
        </Router>
      )
    }

  else
    return {
      ...render(
        <Router history={history}>
          <Route path='/ui/metricprofiles' component={MetricProfilesList} />
        </Router>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}metricprofiles/ARGO_MON`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
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
      )
    }

  else
    return {
      ...render(
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
      )
    }
}


function renderAddView() {
  const route = '/ui/metricprofiles/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
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
    )
  }
}


function renderCloneView() {
  const route = '/ui/metricprofiles/ARGO_MON2/clone';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
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
    )
  }
}


function renderVersionDetailsView() {
  const route = '/ui/metricprofiles/TEST_PROFILE/history/20201214-085323';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/metricprofiles/:name/history/:version'
          render={ props => <MetricProfileVersionDetails {...props} /> }
        />
      </Router>
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

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile),
        changeMetricProfile: mockChangeMetricProfile,
        deleteMetricProfile: mockDeleteMetricProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile),
        fetchListOfNames: (path) => {
          switch (path) {
            case '/api/v2/internal/metricsall':
              return Promise.resolve(mockMetrics)

            case '/api/v2/internal/serviceflavoursall':
              return Promise.resolve(mockServiceTypes)
          }
        },
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
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    const row1 = within(rows[2]).getAllByRole('textbox');
    const row2 = within(rows[3]).getAllByRole('textbox');
    const row3 = within(rows[4]).getAllByRole('textbox');
    const row4 = within(rows[5]).getAllByRole('textbox');
    const row5 = within(rows[6]).getAllByRole('textbox');
    const row6 = within(rows[7]).getAllByRole('textbox');
    const row7 = within(rows[8]).getAllByRole('textbox');
    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(7);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(7);
    expect(row1[0].value).toBe('argo.mon');
    expect(row1[1].value).toBe('eu.egi.CertValidity');
    expect(row2[0].value).toBe('argo.mon');
    expect(row2[1].value).toBe('org.nagios.NagiosWebInterface');
    expect(row2[0].value).toBe('argo.mon');
    expect(row2[1].value).toBe('org.nagios.NagiosWebInterface');
    expect(row3[0].value).toBe('argo.webui');
    expect(row3[1].value).toBe('org.nagios.ARGOWeb-AR');
    expect(row4[0].value).toBe('argo.webui');
    expect(row4[1].value).toBe('org.nagios.ARGOWeb-Status');
    expect(row5[0].value).toBe('Central-LFC');
    expect(row5[1].value).toBe('ch.cern.LFC-Ping');
    expect(row6[0].value).toBe('Central-LFC');
    expect(row6[1].value).toBe('ch.cern.LFC-Read');
    expect(row7[0].value).toBe('Central-LFC');
    expect(row7[1].value).toBe('ch.cern.LFC-Write');

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

    const row1 = within(newRows[2]).getAllByRole('textbox');
    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(1);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(1);
    expect(row1[0].value).toBe('Central-LFC');
    expect(row1[1].value).toBe('ch.cern.LFC-Write');
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

  test('Test import csv successfully', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change metric profile');
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
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);

    const row1 = within(rows[2]).getAllByRole('textbox');
    const row2 = within(rows[3]).getAllByRole('textbox');

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(row1[0].value).toBe('org.opensciencegrid.htcondorce');
    expect(row1[1].value).toBe('ch.cern.HTCondorCE-JobState');
    expect(row2[0].value).toBe('org.opensciencegrid.htcondorce');
    expect(row2[1].value).toBe('ch.cern.HTCondorCE-JobSubmit');

    expect(screen.queryByTestId('error-msg')).not.toBeInTheDocument();
  })

  test('Test import csv with nonexisting metrics', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change metric profile');
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
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('ARGO_MON');
    expect(nameField).toBeDisabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(4);

    const row1 = within(rows[2]).getAllByRole('textbox');
    const row2 = within(rows[3]).getAllByRole('textbox');

    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(2);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(2);

    expect(row1[0].value).toBe('org.opensciencegrid.htcondorce');
    expect(row1[1].value).toBe('ch.cern.HTCondorCE-CertValidity');
    expect(row2[0].value).toBe('org.opensciencegrid.htcondorce');
    expect(row2[1].value).toBe('ch.cern.HTCondorCE-JobSubmit');

    expect(screen.getByTestId('error-msg')).toBeInTheDocument();
    expect(screen.getByTestId('error-msg').textContent).toBe('Must be one of predefined metrics')
  })

  test('Test export csv successfully', async () => {
    const helpers = require('../Helpers');
    jest.spyOn(helpers, 'downloadCSV').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

    const content = 'service,metric\r\nargo.mon,eu.egi.CertValidity\r\nargo.mon,org.nagios.NagiosWebInterface\r\nargo.webui,org.nagios.ARGOWeb-AR\r\nargo.webui,org.nagios.ARGOWeb-Status\r\nCentral-LFC,ch.cern.LFC-Ping\r\nCentral-LFC,ch.cern.LFC-Read\r\nCentral-LFC,ch.cern.LFC-Write';

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1);
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, 'ARGO_MON.csv');
  })

  test('Test export csv when form has been changed', async () => {
    const helpers = require('../Helpers');
    jest.spyOn(helpers, 'downloadCSV').mockReturnValueOnce(null);

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change metric profile');
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
    const row4 = within(rows[6]).getAllByRole('textbox');

    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'org.openstack.nova' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.cloud.InfoProvider' } });
    })

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export/i }));

    const content = 'service,metric\r\nargo.mon,eu.egi.CertValidity\r\nargo.mon,org.nagios.NagiosWebInterface\r\nargo.webui,org.nagios.ARGOWeb-AR\r\nargo.webui,org.nagios.ARGOWeb-Status\r\norg.openstack.nova,eu.egi.cloud.InfoProvider';

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1);
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, 'ARGO_MON.csv')
  })

  test('Test error changing metric profile on web api with error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          code: '406',
          message: 'Content Not acceptable',
          errors: [
            {
              message: 'Content Not acceptable',
              code: '406',
              details: 'There has been an error.'
            }
          ],
          details: 'There has been an error.'
        }),
        status: 406,
        statusText: 'Content Not acceptable'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 406 Content Not acceptable',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing metric profile on web api without error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing metric profile on internal api with error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been error in the backend.' }),
        status: '400',
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been error in the backend.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing metric profile on internal api without error message', async () => {
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: '500', statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully changing and saving metric profile', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully changed', 'Changed', 2000
    )
  })

  test('Test import csv, make some changes and save profile', async() => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
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

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
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
  })

  test('Test successfully deleting metric profile', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting metric profile on web api with error message', async () => {
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          code: '406',
          message: 'Content Not acceptable',
          errors: [
            {
              message: 'Content Not acceptable',
              code: '406',
              details: 'There has been an error.'
            }
          ],
          details: 'There has been an error.'
        }),
        status: 406,
        statusText: 'Content Not acceptable'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 406 Content Not acceptable',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on web api without error message', async () => {
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on internal backend with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an internal error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an internal error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting metric profile on internal backend without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )
    mockDeleteMetricProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change metric profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for metric profile addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        addMetricProfile: mockAddMetricProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchListOfNames: (path) => {
          switch (path) {
            case '/api/v2/internal/metricsall':
              return Promise.resolve(mockMetrics)

            case '/api/v2/internal/serviceflavoursall':
              return Promise.resolve(mockServiceTypes)
          }
        },
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
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();
    expect(groupField.value).toBe('');
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    expect(metricInstances.getAllByRole('row')).toHaveLength(3);
    expect(metricInstances.getAllByRole('row', { name: '' })).toHaveLength(1);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test('Test successfully adding a metric profile', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: 'CREATED' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row3[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row3[1], { target: { value: 'argo.AMSPublisher-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'argo.mon' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.CertValidity' } });
    })

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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added', 'Added', 2000
    )
  })

  test('Test error adding a metric profile in web api with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          code: '406',
          message: 'Content Not acceptable',
          errors: [
            {
              message: 'Content Not acceptable',
              code: '406',
              details: 'There has been an error.'
            }
          ],
          details: 'There has been an error.'
        }),
        status: 406,
        statusText: 'Content Not acceptable'
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row3[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row3[1], { target: { value: 'argo.AMSPublisher-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'argo.mon' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.CertValidity' } });
    })

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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 406 Content Not acceptable',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in web api without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row3[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row3[1], { target: { value: 'argo.AMSPublisher-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'argo.mon' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.CertValidity' } });
    })

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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in backend with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an internal error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row3[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row3[1], { target: { value: 'argo.AMSPublisher-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'argo.mon' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.CertValidity' } });
    })

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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an internal error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding a metric profile in backend without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NEW_PROFILE' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[2]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row3 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row3[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row3[1], { target: { value: 'argo.AMSPublisher-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-2'));
    rows = metricInstances.getAllByRole('row');
    const row4 = within(rows[5]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row4[0], { target: { value: 'argo.mon' } });
    })

    await waitFor(() => {
      fireEvent.change(row4[1], { target: { value: 'eu.egi.CertValidity' } });
    })

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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for metric profile cloneview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfile: () => Promise.resolve(mockWebApiMetricProfile2),
        addMetricProfile: mockAddMetricProfile,
      }
    })
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: () => Promise.resolve(mockBackendMetricProfile2),
        fetchListOfNames: (path) => {
          switch (path) {
            case '/api/v2/internal/metricsall':
              return Promise.resolve(mockMetrics)

            case '/api/v2/internal/serviceflavoursall':
              return Promise.resolve(mockServiceTypes)
          }
        },
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
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('Cloned ARGO_MON2');
    expect(nameField).toBeEnabled();
    expect(descriptionField.value).toBe('Central ARGO-MON profile');
    expect(descriptionField).toBeEnabled();
    expect(groupField.value).toBe('ARGO');
    expect(groupField).toBeEnabled();

    const metricInstances = within(screen.getByRole('table'));
    const rows = metricInstances.getAllByRole('row');
    expect(rows).toHaveLength(9);

    const row1 = within(rows[2]).getAllByRole('textbox');
    const row2 = within(rows[3]).getAllByRole('textbox');
    const row3 = within(rows[4]).getAllByRole('textbox');
    const row4 = within(rows[5]).getAllByRole('textbox');
    const row5 = within(rows[6]).getAllByRole('textbox');
    const row6 = within(rows[7]).getAllByRole('textbox');
    const row7 = within(rows[8]).getAllByRole('textbox');
    expect(metricInstances.getAllByTestId(/remove-/i)).toHaveLength(7);
    expect(metricInstances.getAllByTestId(/insert-/i)).toHaveLength(7);
    expect(row1[0].value).toBe('argo.mon');
    expect(row1[1].value).toBe('eu.egi.CertValidity');
    expect(row2[0].value).toBe('argo.mon');
    expect(row2[1].value).toBe('org.nagios.NagiosWebInterface');
    expect(row2[0].value).toBe('argo.mon');
    expect(row2[1].value).toBe('org.nagios.NagiosWebInterface');
    expect(row3[0].value).toBe('argo.webui');
    expect(row3[1].value).toBe('org.nagios.ARGOWeb-AR');
    expect(row4[0].value).toBe('argo.webui');
    expect(row4[1].value).toBe('org.nagios.ARGOWeb-Status');
    expect(row5[0].value).toBe('Central-LFC');
    expect(row5[1].value).toBe('ch.cern.LFC-Ping');
    expect(row6[0].value).toBe('Central-LFC');
    expect(row6[1].value).toBe('ch.cern.LFC-Read');
    expect(row7[0].value).toBe('Central-LFC');
    expect(row7[1].value).toBe('ch.cern.LFC-Write');

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })

  test('Test successfully cloning a metric profile', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: 'CREATED' })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Metric profile successfully added', 'Added', 2000
    )
  })

  test('Test error cloning metric profile on web api with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          code: '406',
          message: 'Content Not acceptable',
          errors: [
            {
              message: 'Content Not acceptable',
              code: '406',
              details: 'There has been an error.'
            }
          ],
          details: 'There has been an error.'
        }),
        status: 406,
        statusText: 'Content Not acceptable'
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 406 Content Not acceptable',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on web api without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } })
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on internal api with error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been error in the backend.' }),
        status: '400',
        statusText: 'BAD REQUEST'
      })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been error in the backend.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning metric profile on internal api without error message', async () => {
    mockAddMetricProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
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
        }),
        ok: true,
        status: 200,
        statusText: 'Metric profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ status: '500', statusText: 'SERVER ERROR' })
    )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Clone metric profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'ARGO_MON' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New central ARGO_MON profile.' } });

    const metricInstances = within(screen.getByRole('table'));
    var rows = metricInstances.getAllByRole('row');

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('remove-1'));
    })

    await waitFor(() => {
      fireEvent.click(metricInstances.getByTestId('insert-0'));
    })

    rows = metricInstances.getAllByRole('row');

    const row1 = within(rows[3]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row1[0], { target: { value: 'eu.argo.ams' } });
    })

    await waitFor(() => {
      fireEvent.change(row1[1], { target: { value: 'argo.AMS-Check' } });
    })

    fireEvent.click(metricInstances.getByTestId('insert-1'));
    rows = metricInstances.getAllByRole('row');
    const row2 = within(rows[4]).getAllByRole('textbox');
    await waitFor(() => {
      fireEvent.change(row2[0], { target: { value: 'egi.AppDB' } });
    })

    await waitFor(() => {
      fireEvent.change(row2[1], { target: { value: 'org.nagiosexchange.AppDB-WebCheck' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding metric profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Test for metric profile version detail page', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
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
    expect(rows).toHaveLength(4);

    expect(within(rows[1]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[2]).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(rows[3]).queryAllByRole('textbox')).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/remove-/i)).toHaveLength(0);
    expect(metricInstances.queryAllByTestId(/insert-/i)).toHaveLength(0);

    expect(rows[1].textContent).toBe('1AMGAorg.nagios.SAML-SP');
    expect(rows[2].textContent).toBe('2APELorg.apel.APEL-Pub');
    expect(rows[3].textContent).toBe('3APELorg.apel.APEL-Sync')

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
  })
})
