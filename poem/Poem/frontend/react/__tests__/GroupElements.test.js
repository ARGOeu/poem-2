import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { GroupList, GroupChange } from '../GroupElements';
import { render, waitFor, screen } from '@testing-library/react';
import { Backend } from '../DataManager';


function renderListView(
  group = 'metrics',
  id = 'groupofmetrics',
  name = 'group of metrics'
) {
  const history = createMemoryHistory();

  return {
    ...render(
      <Router history={history}>
        <Route render={props => <GroupList {...props} group={group} id={id} name={name} />} />
      </Router>
    )
  }
}

function renderChangeView() {
  const route = '/ui/administration/group/TestGroup';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route path='/ui/administration/group/:name' render={
          props => <GroupChange
            {...props}
            group='metrics'
            id='groupofmetrics'
            title='metrics'
          />}
        />
      </Router>
    )
  }
}

const mockListGroups = {
  'aggregations': ['aggrgroup1', 'aggrgroup2'],
  'metrics': ['metricgroup1', 'metricgroup2'],
  'metricprofiles': ['metricprofilegroup1', 'metricprofilegroup2'],
  'thresholdsprofiles': ['thresholdsgroup1', 'thresholdsgroup2']
}

jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn().mockImplementation(() => {
      return {
        fetchResult: () => Promise.resolve(mockListGroups)
      }
    })
  }
})

afterEach(() => {
  jest.clearAllMocks();
})

describe('Tests for groups listviews', () => {
  test('Render group of metrics listview', async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Select group of metrics to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe('Group of metrics');
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(8);
    expect(screen.getAllByRole('row', {name: /metricgroup/i})).toHaveLength(2);
    expect(screen.getByRole('row', {name: /metricgroup1/i}).textContent).toBe('1metricgroup1')
    expect(screen.getByRole('row', {name: /metricgroup2/i}).textContent).toBe('2metricgroup2')
    expect(screen.getByRole('link', {name: /1/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetrics/metricgroup1')
    expect(screen.getByRole('link', {name: /2/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetrics/metricgroup2')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  test('Render group of aggregations listview', async () => {
    renderListView('aggregations', 'groupofaggregations', 'group of aggregations')

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Select group of aggregations to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe('Group of aggregations');
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(8);
    expect(screen.getAllByRole('row', {name: /aggrgroup/i})).toHaveLength(2);
    expect(screen.getByRole('row', {name: /aggrgroup1/i}).textContent).toBe('1aggrgroup1')
    expect(screen.getByRole('row', {name: /aggrgroup2/i}).textContent).toBe('2aggrgroup2')
    expect(screen.getByRole('link', {name: /1/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofaggregations/aggrgroup1')
    expect(screen.getByRole('link', {name: /2/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofaggregations/aggrgroup2')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  test('Render group of metric profiles listview', async () => {
    renderListView('metricprofiles', 'groupofmetricprofiles', 'group of metric profiles')

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Select group of metric profiles to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe('Group of metric profiles');
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(8);
    expect(screen.getAllByRole('row', {name: /metricprofilegroup/i})).toHaveLength(2);
    expect(screen.getByRole('row', {name: /group1/i}).textContent).toBe('1metricprofilegroup1')
    expect(screen.getByRole('row', {name: /group2/i}).textContent).toBe('2metricprofilegroup2')
    expect(screen.getByRole('link', {name: /1/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetricprofiles/metricprofilegroup1')
    expect(screen.getByRole('link', {name: /2/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofmetricprofiles/metricprofilegroup2')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  test('Render group of thresholds profiles listview', async () => {
    renderListView('thresholdsprofiles', 'groupofthresholdsprofiles', 'group of thresholds profiles')

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Select group of thresholds profiles to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe('Group of thresholds profiles');
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(8);
    expect(screen.getAllByRole('row', {name: /thresholdsgroup/i})).toHaveLength(2);
    expect(screen.getByRole('row', {name: /group1/i}).textContent).toBe('1thresholdsgroup1')
    expect(screen.getByRole('row', {name: /group2/i}).textContent).toBe('2thresholdsgroup2')
    expect(screen.getByRole('link', {name: /1/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofthresholdsprofiles/thresholdsgroup1')
    expect(screen.getByRole('link', {name: /2/i})).toHaveProperty('href', 'http://localhost/ui/administration/groupofthresholdsprofiles/thresholdsgroup2')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  test('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchResult: () => Promise.resolve({
          'aggregations': ['aggrgroup1', 'aggrgroup2'],
          'metrics': [],
          'metricprofiles': ['metricprofilegroup1', 'metricprofilegroup2'],
          'thresholdsprofiles': ['thresholdsgroup1', 'thresholdsgroup2']
        })
      }
    })

    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Select group of metrics to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe('Group of metrics')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(9)
    expect(screen.getByRole('row', {name: /no/i}).textContent).toBe('No groups')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })
})

describe('Tests for group elements changeview', () => {
  beforeAll(() => {
    const mockMetricGroup = [
      'argo.AMS-Check',
      'argo.AMSPublisher-Check',
      'org.nagios.AmsDirSize',
      'org.nagios.CertLifetime'
    ];

    Backend.mockImplementation(() => {
      return {
        fetchResult: () => Promise.resolve(mockMetricGroup)
      }
    })
  })

  test('Test changeview renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Change group of metrics')
    });
    expect(screen.getByRole('heading', {name: 'metrics'})).toBeInTheDocument();
    expect(screen.getByTestId('name').value).toBe('TestGroup');
    expect(screen.getByTestId('name')).toBeDisabled();
    expect(screen.getByRole('button', {name: /add/i}).textContent).toBe('Add new metrics to group');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe(' Metrics in group');
    expect(screen.getByRole('columnheader', {name: 'Remove'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('row', {name: /1/i}).textContent).toBe('1argo.AMS-Check')
    expect(screen.getByRole('row', {name: /2/i}).textContent).toBe('2argo.AMSPublisher-Check')
    expect(screen.getByRole('row', {name: /3/i}).textContent).toBe('3org.nagios.AmsDirSize')
    expect(screen.getByRole('row', {name: /4/i}).textContent).toBe('4org.nagios.CertLifetime')
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument();
  })

  test('Test changeview renders properly if no elements in group', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchResult: () => Promise.resolve([])
      }
    })

    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Change group of metrics')
    });
    expect(screen.getByRole('heading', {name: 'metrics'})).toBeInTheDocument();
    expect(screen.getByTestId('name').value).toBe('TestGroup');
    expect(screen.getByTestId('name')).toBeDisabled();
    expect(screen.getByRole('button', {name: /add/i}).textContent).toBe('Add new metrics to group');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', {name: '#'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: /group/i}).textContent).toBe(' Metrics in group');
    expect(screen.getByRole('columnheader', {name: 'Remove'})).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument();
  })
})