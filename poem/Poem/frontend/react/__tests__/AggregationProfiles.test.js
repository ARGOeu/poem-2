import React from 'react';
import { render, waitFor, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { Backend, WebApi } from '../DataManager';
import { AggregationProfilesChange, AggregationProfilesList } from '../AggregationProfiles';
import { queryCache } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

const mockChangeObject = jest.fn();
const mockChangeAggregation = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteAggregation = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear()
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
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['TEST2'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
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



function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}aggregationprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <AggregationProfilesList {...props} publicView={true} /> }
          />
        </Router>
      )
    }

  else
    return {
      ...render(
        <Router history={history}>
          <Route component={AggregationProfilesList} />
        </Router>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}aggregationprofiles/TEST_PROFILE`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            path='/ui/public_aggregationprofiles/:name'
            render={ props => <AggregationProfilesChange
              {...props}
              webapimetric='https://mock.metrics.com'
              webapiaggregation='https://mock.aggregations.com'
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
          <Route exact path="/ui/aggregationprofiles/:name"
            render={props => <AggregationProfilesChange
              {...props}
              webapiaggregation='https://mock.aggregations.com'
              webapimetric='https://mock.metrics.com'
              webapitoken='token'
              tenantname='TENANT' /> }
          />
        </Router>
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select aggregation profile to change')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select aggregation profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
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

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchMetricProfiles: () => Promise.resolve(mockWebApiMetricProfiles),
        fetchAggregationProfile: () => Promise.resolve(mockWebApiProfile),
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

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');
    const metricOperation = screen.getByTestId('metric_operation').firstChild;
    const aggrOperation = screen.getByTestId('profile_operation').firstChild;
    const endpointGroup = screen.getByTestId('endpoint_group').firstChild;
    const metricProfileRow = within(screen.getByTestId('metric_profile_row'));
    const metricProfileField = metricProfileRow.getByRole('combobox');

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeEnabled();
    expect(groupField.value).toBe('EGI');
    expect(groupField).toBeEnabled();

    expect(metricOperation.value).toBe('AND');
    expect(metricOperation).toBeEnabled();
    expect(aggrOperation.value).toBe('AND');
    expect(aggrOperation).toBeEnabled();
    expect(endpointGroup.value).toBe('servicegroups');
    expect(endpointGroup).toBeEnabled();
    expect(metricProfileField.value).toBe('ARGO_MON_CRITICAL');
    expect(metricProfileField).toBeEnabled();

    expect(screen.getAllByTestId(/card/i)).toHaveLength(4);
    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));
    const card2 = within(screen.getByTestId('card-2'));
    const card3 = within(screen.getByTestId('card-3'));

    expect(screen.getAllByTestId(/group-operation/i)).toHaveLength(4);
    expect(screen.getByTestId('group-operation-0').firstChild.value).toBe('AND');
    expect(screen.getByTestId('group-operation-1').firstChild.value).toBe('AND');
    expect(screen.getByTestId('group-operation-2').firstChild.value).toBe('AND');
    expect(screen.getByTestId('group-operation-3').firstChild.value).toBe('AND');

    expect(card0.getByPlaceholderText(/service group/i).value).toBe('compute')
    const serviceFields0 = card0.getAllByRole('textbox')
    expect(serviceFields0).toHaveLength(5);
    // the first serviceFields0 element is the title of the group
    expect(serviceFields0[1].value).toBe('ARC-CE');
    expect(serviceFields0[2].value).toBe('GRAM5');
    expect(serviceFields0[3].value).toBe('QCG.Computing');
    expect(serviceFields0[4].value).toBe('org.opensciencegrid.htcondorce');
    expect(card0.getAllByTestId(/operation-/i)).toHaveLength(4);
    expect(card0.getByTestId('operation-0').firstChild.value).toBe('OR');
    expect(card0.getByTestId('operation-1').firstChild.value).toBe('OR');
    expect(card0.getByTestId('operation-2').firstChild.value).toBe('OR');
    expect(card0.getByTestId('operation-3').firstChild.value).toBe('OR');
    expect(card0.getAllByTestId(/remove/i)).toHaveLength(5);
    expect(card0.getAllByTestId(/insert/i)).toHaveLength(4);
    expect(card0.getByTestId('operation').firstChild.value).toBe('OR');

    expect(card1.getByPlaceholderText(/service group/i).value).toBe('storage')
    const serviceFields1 = card1.getAllByRole('textbox')
    expect(serviceFields1).toHaveLength(2);
    expect(serviceFields1[1].value).toBe('SRM');
    expect(card1.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card1.getByTestId('operation-0').firstChild.value).toBe('OR');
    expect(card1.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card1.getAllByTestId(/insert/i)).toHaveLength(1);
    expect(card1.getByTestId('operation').firstChild.value).toBe('OR');

    expect(card2.getByPlaceholderText(/service group/i).value).toBe('information')
    const serviceFields2 = card2.getAllByRole('textbox')
    expect(serviceFields2).toHaveLength(2);
    expect(serviceFields2[1].value).toBe('Site-BDII');
    expect(card2.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card2.getByTestId('operation-0').firstChild.value).toBe('OR');
    expect(card2.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card2.getAllByTestId(/insert/i)).toHaveLength(1);
    expect(card2.getByTestId('operation').firstChild.value).toBe('OR');

    expect(card3.getByPlaceholderText(/service group/i).value).toBe('cloud')
    const serviceFields3 = card3.getAllByRole('textbox')
    expect(serviceFields3).toHaveLength(2);
    expect(serviceFields3[1].value).toBe('org.openstack.nova');
    expect(card3.getAllByTestId(/operation-/i)).toHaveLength(1);
    expect(card3.getByTestId('operation-0').firstChild.value).toBe('OR');
    expect(card3.getAllByTestId(/remove/i)).toHaveLength(2);
    expect(card3.getAllByTestId(/insert/i)).toHaveLength(1);
    expect(card3.getByTestId('operation').firstChild.value).toBe('OR');

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/aggregationprofiles/TEST_PROFILE/history')
    expect(screen.getByRole('button', { name: 'Add new group' })).toBeInTheDocument();


    expect(screen.getByRole('alert')).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /details/i }).textContent).toBe('Aggregation profile details');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');
    const metricOperation = screen.getByTestId('metric_operation').firstChild;
    const aggrOperation = screen.getByTestId('profile_operation').firstChild;
    const endpointGroup = screen.getByTestId('endpoint_group').firstChild;
    const metricProfileRow = within(screen.getByTestId('metric_profile_row'));
    const metricProfileField = metricProfileRow.getByRole('textbox');

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

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  })

  test('Test error changing aggregation profile on web api with error message', async () => {
    mockChangeAggregation.mockReturnValueOnce(
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
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metric_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('profile_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('endpoint_group').firstChild, { target: { value: 'sites' } });
    fireEvent.change(within(screen.getByTestId('metric_profile_row')).getByRole('combobox'), { target: { value: 'FEDCLOUD' } })

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-2'));
    fireEvent.change(card0.getByTestId('operation-1').firstChild, { target: { value: 'AND' } })

    fireEvent.click(card1.getByTestId('insert-0'));
    const serviceFields = within(screen.getByTestId('card-1')).getAllByRole('textbox');
    fireEvent.change(serviceFields[2], { target: { value: 'webdav' } });

    fireEvent.change(within(screen.getByTestId('card-3')).getByTestId('operation').firstChild, { target: { value: 'AND' } })

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group'));

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
          name: 'FEDCLOUD',
          id: '56785678-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled();
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

  test('Test error changing aggregation profile on web api without error message', async () => {
    mockChangeAggregation.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metric_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('profile_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('endpoint_group').firstChild, { target: { value: 'sites' } });
    fireEvent.change(within(screen.getByTestId('metric_profile_row')).getByRole('combobox'), { target: { value: 'FEDCLOUD' } })

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-2'));
    fireEvent.change(card0.getByTestId('operation-1').firstChild, { target: { value: 'AND' } })

    fireEvent.click(card1.getByTestId('insert-0'));
    const serviceFields = within(screen.getByTestId('card-1')).getAllByRole('textbox');
    fireEvent.change(serviceFields[2], { target: { value: 'webdav' } });

    fireEvent.change(within(screen.getByTestId('card-3')).getByTestId('operation').firstChild, { target: { value: 'AND' } })

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group'));

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
          name: 'FEDCLOUD',
          id: '56785678-oooo-kkkk-aaaa-aaeekkccnnee'
        },
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled();
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing aggregation profile on internal API with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )
    mockChangeAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metric_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('profile_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('endpoint_group').firstChild, { target: { value: 'sites' } });
    fireEvent.change(within(screen.getByTestId('metric_profile_row')).getByRole('combobox'), { target: { value: 'FEDCLOUD' } })

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-2'));
    fireEvent.change(card0.getByTestId('operation-1').firstChild, { target: { value: 'AND' } })

    fireEvent.click(card1.getByTestId('insert-0'));
    const serviceFields = within(screen.getByTestId('card-1')).getAllByRole('textbox');
    fireEvent.change(serviceFields[2], { target: { value: 'webdav' } });

    fireEvent.change(within(screen.getByTestId('card-3')).getByTestId('operation').firstChild, { target: { value: 'AND' } })

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group'));

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
          name: 'FEDCLOUD',
          id: '56785678-oooo-kkkk-aaaa-aaeekkccnnee'
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
          metric_profile: 'FEDCLOUD',
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing aggregation profile on internal API without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )
    mockChangeAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metric_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('profile_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('endpoint_group').firstChild, { target: { value: 'sites' } });
    fireEvent.change(within(screen.getByTestId('metric_profile_row')).getByRole('combobox'), { target: { value: 'FEDCLOUD' } })

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-2'));
    fireEvent.change(card0.getByTestId('operation-1').firstChild, { target: { value: 'AND' } })

    fireEvent.click(card1.getByTestId('insert-0'));
    const serviceFields = within(screen.getByTestId('card-1')).getAllByRole('textbox');
    fireEvent.change(serviceFields[2], { target: { value: 'webdav' } });

    fireEvent.change(within(screen.getByTestId('card-3')).getByTestId('operation').firstChild, { target: { value: 'AND' } })

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group'));

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
          name: 'FEDCLOUD',
          id: '56785678-oooo-kkkk-aaaa-aaeekkccnnee'
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
          metric_profile: 'FEDCLOUD',
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test change aggregation profile and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'ARGO' } });

    fireEvent.change(screen.getByTestId('metric_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('profile_operation').firstChild, { target: { value: 'OR' } });
    fireEvent.change(screen.getByTestId('endpoint_group').firstChild, { target: { value: 'sites' } });
    fireEvent.change(within(screen.getByTestId('metric_profile_row')).getByRole('combobox'), { target: { value: 'FEDCLOUD' } })

    const card0 = within(screen.getByTestId('card-0'));
    const card1 = within(screen.getByTestId('card-1'));

    fireEvent.click(card0.getByTestId('remove-2'));
    fireEvent.change(card0.getByTestId('operation-1').firstChild, { target: { value: 'AND' } })

    fireEvent.click(card1.getByTestId('insert-0'));
    const serviceFields = within(screen.getByTestId('card-1')).getAllByRole('textbox');
    fireEvent.change(serviceFields[2], { target: { value: 'webdav' } });

    fireEvent.change(within(screen.getByTestId('card-3')).getByTestId('operation').firstChild, { target: { value: 'AND' } })

    fireEvent.click(within(screen.getByTestId('card-2')).getByTestId('remove-group'));

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
          name: 'FEDCLOUD',
          id: '56785678-oooo-kkkk-aaaa-aaeekkccnnee'
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
          metric_profile: 'FEDCLOUD',
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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully changed', 'Changed', 2000
    )
  })

  test('Test successfully deleting aggregation profile', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
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

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Aggregation profile successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting aggregation profile on web api with error message', async () => {
    mockDeleteAggregation.mockReturnValueOnce(
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
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
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

  test('Test error deleting aggregation profile on web api without error message', async () => {
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting aggregation profile on internal backend with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting aggregation profile on internal backend without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )
    mockDeleteAggregation.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change/i }).textContent).toBe('Change aggregation profile');
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting aggregation profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})
