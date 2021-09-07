import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ThresholdsProfilesChange, ThresholdsProfilesList, ThresholdsProfileVersionDetail } from '../ThresholdProfiles';
import { Backend, WebApi } from '../DataManager';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn(),
    WebApi: jest.fn()
  }
})

jest.setTimeout(10000);

const mockChangeObject = jest.fn();
const mockChangeThresholdsProfile = jest.fn();
const mockDeleteObject = jest.fn();
const mockDeleteThresholdsProfile = jest.fn();
const mockAddObject = jest.fn();
const mockAddThresholdsProfile = jest.fn();

const queryClient = new QueryClient();


beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


const mockThresholdsProfiles = [
  {
    name: 'PROFILE1',
    description: 'Description of PROFILE1',
    appid: '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: ''
  },
  {
    name: 'PROFILE2',
    description: 'Description of PROFILE2',
    apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
    groupname: 'TEST'
  }
]

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
      aggregations: ['TEST1'],
      metricprofiles: ['TEST2'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
}

const mockWebApiProfile = {
  id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
  date: '2020-12-03',
  name: 'TEST_PROFILE',
  rules: [
    {
      endpoint_group: 'Group 1',
      host: 'host.foo.bar',
      metric: 'argo.AMS-Check',
      thresholds: 'freshness=1s;0:10;9:;0;25 entries=2B;0:;2: test=0;0:;0: test2=0;0:;0:'
    },
    {
      host: 'host.foo.baz',
      metric: 'argo.API-Status-Check',
      thresholds: 'test0=0KB;0:;2:;0;25 test1=2TB;2:8;3:8;0;2'
    }
  ]
}

const mockBackendProfile = {
  name: 'TEST_PROFILE',
  description: 'Description of TEST_PROFILE',
  apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
  groupname: 'TEST'
}


const mockThresholdProfileVersions = [
  {
    id: '14',
    object_repr: 'TEST_PROFILE2',
    fields: {
      name: 'TEST_PROFILE2',
      description: '',
      groupname: 'NEW_GROUP',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      rules: [
        {
          host: 'hostFoo',
          metric: 'newMetric',
          endpoint_group: 'test',
          thresholds: 'entries=1;3:;0:2'
        }
      ]
    },
    user: 'testuser',
    date_created: '2021-03-26 10:21:48',
    comment: 'Changed name and groupname. Added rule for metric "newMetric". Deleted rule for metric "metricA".',
    version: '20210326-102148'
  },
  {
    id: '10',
    object_repr: 'TEST_PROFILE',
    fields: {
      name: 'TEST_PROFILE',
      description: '',
      groupname: 'GROUP',
      apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      rules: [
        {
          host: 'hostFoo',
          metric: 'metricA',
          thresholds: 'freshness=1s;10:;9:;0;25 entries=1;3:;0:2'
        }
      ]
    },
    user: 'testuser',
    date_created: '2020-12-24 03:58:47',
    comment: 'Initial version.',
    version: '20201224-035847'
  }
];


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}thresholdsprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] })

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              render={ props => <ThresholdsProfilesList {...props} publicView={true} /> }
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
            <Route component={ThresholdsProfilesList} />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}thresholdsprofiles/TEST_PROFILE`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/public_thresholdsprofiles/:name'
              render={ props => <ThresholdsProfilesChange
                {...props}
                webapithresholds='https://mock.thresholds.com'
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
              path='/ui/thresholdsprofiles/:name'
              render={ props => <ThresholdsProfilesChange
                {...props}
                webapithresholds='https://mock.thresholds.com'
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
  const route = '/ui/thresholdsprofiles/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/thresholdsprofiles/add'
            render={ props => <ThresholdsProfilesChange
              {...props}
              webapithresholds='https://mock.thresholds.com'
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


function renderVersionDetailsView() {
  const route = '/ui/thresholdsprofiles/TEST_PROFILE/history/20201224-035847';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/thresholdsprofiles/:name/history/:version'
            render={ props =>  <ThresholdsProfileVersionDetail {...props} />}
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe('Tests for thresholds profiles listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/thresholdsprofiles':
              return Promise.resolve(mockThresholdsProfiles)

            case '/api/v2/internal/public_thresholdsprofiles':
              return Promise.resolve(mockThresholdsProfiles)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select thresholds profile to change')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /profile1/i }).textContent).toBe('1PROFILE1Description of PROFILE1');
    expect(screen.getByRole('link', { name: /profile1/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/PROFILE1');
    expect(screen.getByRole('row', { name: /profile2/i }).textContent).toBe('2PROFILE2Description of PROFILE2TEST');
    expect(screen.getByRole('link', { name: /profile2/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/PROFILE2');

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select thresholds profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(8);
    expect(screen.getByRole('row', { name: /profile1/i }).textContent).toBe('1PROFILE1Description of PROFILE1');
    expect(screen.getByRole('link', { name: /profile1/i }).closest('a')).toHaveAttribute('href', '/ui/public_thresholdsprofiles/PROFILE1');
    expect(screen.getByRole('row', { name: /profile2/i }).textContent).toBe('2PROFILE2Description of PROFILE2TEST');
    expect(screen.getByRole('link', { name: /profile2/i }).closest('a')).toHaveAttribute('href', '/ui/public_thresholdsprofiles/PROFILE2');

    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Tests for threshols profile changeview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchThresholdsProfile: () => Promise.resolve(mockWebApiProfile),
        changeThresholdsProfile: mockChangeThresholdsProfile,
        deleteThresholdsProfile: mockDeleteThresholdsProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockBackendProfile),
        fetchListOfNames: () => Promise.resolve(['argo.AMS-Check', 'argo.AMSPublisher-Check', 'argo.POEM-API-MON', 'argo.API-Status-Check']),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(screen.getByTestId('rules.0')).toBeInTheDocument();
    expect(screen.getByTestId('rules.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('rules.1')).toBeInTheDocument();
    expect(screen.getByTestId('rules.1.remove')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.2.remove')).not.toBeInTheDocument();

    const metric1 = screen.getByTestId('autocomplete-rules[0].metric');
    const host1 = screen.getByTestId('rules.0.host');
    const endpoint1 = screen.getByTestId('rules.0.endpoint_group');
    const table1 = within(screen.getByTestId('rules.0.thresholds'));
    const metric2 = screen.getByTestId('autocomplete-rules[1].metric');
    const host2 = screen.getByTestId('rules.1.host');
    const endpoint2 = screen.getByTestId('rules.1.endpoint_group');
    const table2 = within(screen.getByTestId('rules.1.thresholds'));

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('TEST');
    expect(groupField).toBeEnabled();

    expect(metric1.value).toBe('argo.AMS-Check');
    expect(metric1).toBeEnabled();
    expect(host1.value).toBe('host.foo.bar');
    expect(host1).toBeEnabled();
    expect(endpoint1.value).toBe('Group 1');
    expect(endpoint1).toBeEnabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(5);
    expect(table1.getAllByRole('columnheader')).toHaveLength(8);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.0.label').value).toBe('freshness');
    expect(screen.getByTestId('values.rules.0.thresholds.0.value').value).toBe('1');
    expect(screen.getByTestId('values.rules.0.thresholds.0.uom').value).toBe('s');
    expect(screen.getByTestId('values.rules.0.thresholds.0.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.0.warn2').value).toBe('10');
    expect(screen.getByTestId('values.rules.0.thresholds.0.crit1').value).toBe('9');
    expect(screen.getByTestId('values.rules.0.thresholds.0.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.0.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.0.max').value).toBe('25');
    expect(screen.getByTestId('values.rules.0.thresholds.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.0.add')).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.1.label').value).toBe('entries');
    expect(screen.getByTestId('values.rules.0.thresholds.1.value').value).toBe('2');
    expect(screen.getByTestId('values.rules.0.thresholds.1.uom').value).toBe('B');
    expect(screen.getByTestId('values.rules.0.thresholds.1.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.1.warn2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.1.crit1').value).toBe('2');
    expect(screen.getByTestId('values.rules.0.thresholds.1.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.1.min').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.1.max').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.1.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.1.add')).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.2.label').value).toBe('test');
    expect(screen.getByTestId('values.rules.0.thresholds.2.value').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.2.uom').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.2.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.2.warn2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.2.crit1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.2.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.2.min').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.2.max').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.2.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.2.add')).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.0.thresholds.3.label').value).toBe('test2');
    expect(screen.getByTestId('values.rules.0.thresholds.3.value').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.3.uom').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.3.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.3.warn2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.3.crit1').value).toBe('0');
    expect(screen.getByTestId('values.rules.0.thresholds.3.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.3.min').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.3.max').value).toBe('');
    expect(screen.getByTestId('values.rules.0.thresholds.3.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.0.thresholds.3.add')).toBeInTheDocument();

    expect(metric2.value).toBe('argo.API-Status-Check');
    expect(metric2).toBeEnabled();
    expect(host2.value).toBe('host.foo.baz');
    expect(host2).toBeEnabled();
    expect(endpoint2.value).toBe('');
    expect(endpoint2).toBeEnabled();

    const table2Rows = table2.getAllByRole('row');
    expect(table2Rows).toHaveLength(3);
    expect(table2.getAllByRole('columnheader')).toHaveLength(8);
    expect(table2.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.1.thresholds.0.label').value).toBe('test0');
    expect(screen.getByTestId('values.rules.1.thresholds.0.value').value).toBe('0');
    expect(screen.getByTestId('values.rules.1.thresholds.0.uom').value).toBe('KB');
    expect(screen.getByTestId('values.rules.1.thresholds.0.warn1').value).toBe('0');
    expect(screen.getByTestId('values.rules.1.thresholds.0.warn2').value).toBe('');
    expect(screen.getByTestId('values.rules.1.thresholds.0.crit1').value).toBe('2');
    expect(screen.getByTestId('values.rules.1.thresholds.0.crit2').value).toBe('');
    expect(screen.getByTestId('values.rules.1.thresholds.0.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.1.thresholds.0.max').value).toBe('25');
    expect(screen.getByTestId('values.rules.1.thresholds.0.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.1.thresholds.0.add')).toBeInTheDocument();

    expect(screen.getByTestId('values.rules.1.thresholds.1.label').value).toBe('test1');
    expect(screen.getByTestId('values.rules.1.thresholds.1.value').value).toBe('2');
    expect(screen.getByTestId('values.rules.1.thresholds.1.uom').value).toBe('TB');
    expect(screen.getByTestId('values.rules.1.thresholds.1.warn1').value).toBe('2');
    expect(screen.getByTestId('values.rules.1.thresholds.1.warn2').value).toBe('8');
    expect(screen.getByTestId('values.rules.1.thresholds.1.crit1').value).toBe('3');
    expect(screen.getByTestId('values.rules.1.thresholds.1.crit2').value).toBe('8');
    expect(screen.getByTestId('values.rules.1.thresholds.1.min').value).toBe('0');
    expect(screen.getByTestId('values.rules.1.thresholds.1.max').value).toBe('2');
    expect(screen.getByTestId('values.rules.1.thresholds.1.remove')).toBeInTheDocument();
    expect(screen.getByTestId('values.rules.1.thresholds.1.add')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Add new rule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i }).closest('a')).toHaveAttribute('href', '/ui/thresholdsprofiles/TEST_PROFILE/history')
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderChangeView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Thresholds profile details');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(screen.getByTestId('rules.0')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.getByTestId('rules.1')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.1.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.2.remove')).not.toBeInTheDocument();

    const metric1 = screen.getByTestId('rules.0.metric');
    const host1 = screen.getByTestId('rules.0.host');
    const endpoint1 = screen.getByTestId('rules.0.endpoint_group');
    const table1 = within(screen.getByTestId('rules.0.thresholds'));
    const metric2 = screen.getByTestId('rules.1.metric');
    const host2 = screen.getByTestId('rules.1.host');
    const endpoint2 = screen.getByTestId('rules.1.endpoint_group');
    const table2 = within(screen.getByTestId('rules.1.thresholds'));

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('TEST');
    expect(groupField).toBeDisabled();

    expect(metric1.value).toBe('argo.AMS-Check');
    expect(metric1).toBeDisabled();
    expect(host1.value).toBe('host.foo.bar');
    expect(host1).toBeDisabled();
    expect(endpoint1.value).toBe('Group 1');
    expect(endpoint1).toBeDisabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(5);
    expect(table1.getAllByRole('columnheader')).toHaveLength(7);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1Rows[1].textContent).toBe('1freshness1s0:109:025')
    expect(table1Rows[2].textContent).toBe('2entries2B0:2:')
    expect(table1Rows[3].textContent).toBe('3test00:0:')
    expect(table1Rows[4].textContent).toBe('4test200:0:')

    expect(metric2.value).toBe('argo.API-Status-Check');
    expect(metric2).toBeDisabled();
    expect(host2.value).toBe('host.foo.baz');
    expect(host2).toBeDisabled();
    expect(endpoint2.value).toBe('');
    expect(endpoint2).toBeDisabled();

    const table2Rows = table2.getAllByRole('row');
    expect(table2Rows).toHaveLength(3);
    expect(table2.getAllByRole('columnheader')).toHaveLength(7);
    expect(table2.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table2.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table2Rows[1].textContent).toBe('1test00KB0:2:025')
    expect(table2Rows[2].textContent).toBe('2test12TB2:83:802')

    expect(screen.queryByRole('button', { name: 'Add new rule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test change thresholds profile and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TESTa' } })

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.3.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.2.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20;0;25'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20;0;25'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'entries=2B;0:;2:'
            }
          ]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing thresholds profile on web api with error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
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
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TESTa' } })

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.3.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.2.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20;0;25'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'entries=2B;0:;2:'
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

  test('Test error changing thresholds profile on web api without error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TESTa' } })

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.3.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.2.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20;0;25'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).not.toHaveBeenCalled()
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error changing thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing thresholds profile on internal backend with error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TESTa' } })

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.3.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.2.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20;0;25'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20;0;25'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'entries=2B;0:;2:'
            }
          ]
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

  test('Test error changing thresholds profile on internal backend without error message', async () => {
    mockChangeThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TESTa' } })

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.3.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.2.remove'))
    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'))

    fireEvent.click(screen.getByTestId('rules.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeThresholdsProfile).toHaveBeenCalledWith({
        id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
        name: 'TEST_PROFILE',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20;0;25'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'entries=2B;0:;2:'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE',
          groupname: 'TESTa',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20;0;25'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'entries=2B;0:;2:'
            }
          ]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error changing thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting thresholds profile', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting thresholds profile on web api with error message', async () => {
    mockDeleteThresholdsProfile.mockReturnValueOnce(
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
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
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

  test('Test error deleting thresholds profile on web api without error message', async () => {
    mockDeleteThresholdsProfile.mockReturnValueOnce({ status: 500, statusText: 'SERVER ERROR' })

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).not.toHaveBeenCalled()
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error deleting thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting thresholds profile on internal api with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
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

  test('Test error deleting thresholds profile on internal api without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )
    mockDeleteThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Change thresholds profile');
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteThresholdsProfile).toHaveBeenCalledWith(
        '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
      )
    })

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/00000000-oooo-kkkk-aaaa-aaeekkccnnee'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error deleting thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for thresholds profiles addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        addThresholdsProfile: mockAddThresholdsProfile
      }
    })
    Backend.mockImplementation(() => {
      return {
        fetchListOfNames: () => Promise.resolve(['argo.AMS-Check', 'argo.AMSPublisher-Check', 'argo.POEM-API-MON', 'argo.API-Status-Check']),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        addObject: mockAddObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(groupField.value).toBe('');
    expect(groupField).toBeEnabled();

    expect(screen.queryByTestId('rules.0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('table')).toHaveLength(0);

    expect(screen.getByRole('button', { name: 'Add a rule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test('Test successfully adding thresholds profile', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          status: {
            message: 'Thresholds profile Created',
            code: "200"
          },
          data: {
            id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            links: {
              self: 'string'
            }
          }
        }),
        ok: true,
        status: 200,
        statusText: 'Thresholds profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: 'CREATED' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'test=2TB;2:8;3:8;0;10'
            }
          ]
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Thresholds profile successfully added', 'Added', 2000
    )
  })

  test('Test error adding thresholds profile in web api with error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
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
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'test=2TB;2:8;3:8;0;10'
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

  test('Test error adding thresholds profile in web api without error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).not.toHaveBeenCalled()
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Web API error adding thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Web API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding thresholds profile in internal api with error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          status: {
            message: 'Thresholds profile Created',
            code: "200"
          },
          data: {
            id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            links: {
              self: 'string'
            }
          }
        }),
        ok: true,
        status: 200,
        statusText: 'Thresholds profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'test=2TB;2:8;3:8;0;10'
            }
          ]
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

  test('Test error adding thresholds profile in internal api without error message', async () => {
    mockAddThresholdsProfile.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({
          status: {
            message: 'Thresholds profile Created',
            code: "200"
          },
          data: {
            id: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            links: {
              self: 'string'
            }
          }
        }),
        ok: true,
        status: 200,
        statusText: 'Thresholds profile Created'
      })
    )
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Add thresholds profile');
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'TEST_PROFILE2' } });
    fireEvent.change(screen.getByTestId('groupname'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add a rule' }));

    fireEvent.change(screen.getByTestId('rules.0.endpoint_group'), { target: { value: 'Group 1a' } });
    fireEvent.change(screen.getByTestId('rules.0.host'), { target: { value: 'host.foo-bar.baz' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[0].metric'), { target: { value: 'argo.AMSPublisher-Check' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.label'), { target: { value: 'freshness' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.value'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.uom'), { target: { value: 's' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.warn2'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit1'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.0.crit2'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.0.add'));
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.label'), { target: { value: 'entries' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.uom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.warn1'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.0.thresholds.1.crit1'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add new rule' }));
    fireEvent.change(screen.getByTestId('rules.1.endpoint_group'), { target: { value: 'Group 2a' } });
    fireEvent.change(screen.getByTestId('autocomplete-rules[1].metric'), { target: { value: 'argo.POEM-API-MON' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.label'), { target: { value: 'test' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.value'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.uom'), { target: { value: 'TB' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn1'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.warn2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit1'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.crit2'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.min'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('values.rules.1.thresholds.0.max'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('values.rules.0.thresholds.1.remove'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddThresholdsProfile).toHaveBeenCalledWith({
        name: 'TEST_PROFILE2',
        rules: [
          {
            endpoint_group: 'Group 1a',
            host: 'host.foo-bar.baz',
            metric: 'argo.AMSPublisher-Check',
            thresholds: 'freshness=1s;1:15;10:20'
          },
          {
            endpoint_group: 'Group 2a',
            metric: 'argo.POEM-API-MON',
            thresholds: 'test=2TB;2:8;3:8;0;10'
          }
        ]
      })
    })

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/thresholdsprofiles/',
        {
          apiid: '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
          name: 'TEST_PROFILE2',
          groupname: 'TEST',
          rules: [
            {
              endpoint_group: 'Group 1a',
              host: 'host.foo-bar.baz',
              metric: 'argo.AMSPublisher-Check',
              thresholds: 'freshness=1s;1:15;10:20'
            },
            {
              endpoint_group: 'Group 2a',
              metric: 'argo.POEM-API-MON',
              thresholds: 'test=2TB;2:8;3:8;0;10'
            }
          ]
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Internal API error adding thresholds profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Internal API error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for thresholds profile version detail page', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockThresholdProfileVersions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderVersionDetailsView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('TEST_PROFILE (2020-12-24 03:58:47)');
    })

    const nameField = screen.getByTestId('name');
    const groupField = screen.getByTestId('groupname');

    expect(screen.getByTestId('rules.0')).toBeInTheDocument();
    expect(screen.queryByTestId('rules.0.remove')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rules.1.remove')).not.toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(1);

    const metric1 = screen.getByTestId('rules.0.metric');
    const host1 = screen.getByTestId('rules.0.host');
    const endpoint1 = screen.getByTestId('rules.0.endpoint_group');
    const table1 = within(screen.getByTestId('rules.0.thresholds'));

    expect(nameField.value).toBe('TEST_PROFILE');
    expect(nameField).toBeDisabled();
    expect(groupField.value).toBe('GROUP');
    expect(groupField).toBeDisabled();

    expect(metric1.value).toBe('metricA');
    expect(metric1).toBeDisabled();
    expect(host1.value).toBe('hostFoo');
    expect(host1).toBeDisabled();
    expect(endpoint1.value).toBe('');
    expect(endpoint1).toBeDisabled();

    const table1Rows = table1.getAllByRole('row');
    expect(table1Rows).toHaveLength(3);
    expect(table1.getAllByRole('columnheader')).toHaveLength(7);
    expect(table1.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Warning' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'Critical' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'min' })).toBeInTheDocument();
    expect(table1.getByRole('columnheader', { name: 'max' })).toBeInTheDocument();
    expect(table1Rows[1].textContent).toBe('1freshness1s10:9:025')
    expect(table1Rows[2].textContent).toBe('2entries13:0:2')

    expect(screen.queryByRole('button', { name: 'Add new rule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })
})
