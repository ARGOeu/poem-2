import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { GroupList, GroupChange } from '../GroupElements';
import { render, waitFor, screen, fireEvent, within } from '@testing-library/react';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';


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

function renderAddView() {
  const route = '/ui/administration/group/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route render={
          props => <GroupChange
            {...props}
            group='metrics'
            id='groupofmetrics'
            title='metrics'
            addview={true}
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

const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockAddObject = jest.fn();

beforeEach(() => {
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
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  beforeAll(() => {
    const mockMetricGroup = [
      'argo.AMS-Check',
      'argo.AMSPublisher-Check',
      'org.nagios.AmsDirSize',
      'org.nagios.CertLifetime'
    ];

    const mockAvailableMetrics = [
      'test.AMS-Check',
      'argo.CE-Check'
    ];

    Backend.mockImplementation(() => {
      return {
        fetchResult: (path) => {
          switch (path) {
            case '/api/v2/internal/metricsgroup':
              return Promise.resolve(mockAvailableMetrics)

            case '/api/v2/internal/metricsgroup/TestGroup':
              return Promise.resolve(mockMetricGroup)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
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
    const selectField = screen.getByTestId('available_metrics');
    expect(within(selectField).getByRole('textbox').textContent).toBe('');
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
    Backend.mockImplementationOnce(() => {
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
    const selectField = screen.getByTestId('available_metrics');
    expect(within(selectField).getByRole('textbox').textContent).toBe('');
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

  test('Test search items in group', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByTestId('search_items')).toBeInTheDocument()
    })
    expect(screen.getAllByRole('row')).toHaveLength(6);
    fireEvent.change(screen.getByTestId('search_items'), { target: { value: 'nAGios' } })
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('row', {name: /1/i}).textContent).toBe('1org.nagios.AmsDirSize')
    expect(screen.getByRole('row', {name: /2/i}).textContent).toBe('2org.nagios.CertLifetime')
  })

  test('Test remove item from group and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByTestId('search_items')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('search_items'), { target: { value: 'ams-check' } })
    fireEvent.click(screen.getByRole('button', { name: '' }))
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'TestGroup', items: ['argo.AMSPublisher-Check', 'org.nagios.AmsDirSize', 'org.nagios.CertLifetime'] }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Group of metrics successfully changed',
      'Changed',
      2000
    );
  })

  test('Test failed saving of group with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There is something wrong with your group.' }),
        status: 400,
        statusText: 'BAD REQUEST' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledTimes(1);
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'TestGroup', items: ['argo.AMS-Check', 'argo.AMSPublisher-Check', 'org.nagios.AmsDirSize', 'org.nagios.CertLifetime'] }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There is something wrong with your group.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test failed saving of group without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        status: 500,
        statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'TestGroup', items: ['argo.AMS-Check', 'argo.AMSPublisher-Check', 'org.nagios.AmsDirSize', 'org.nagios.CertLifetime'] }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing group of metrics</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test add item to group and save', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })

    expect(screen.getAllByRole('row')).toHaveLength(6);

    const selectField = screen.getByTestId('available_metrics');
    fireEvent.change(within(selectField).getByRole('textbox'), { target: { value: 'test' } })
    fireEvent.click(within(selectField).getByText('test.AMS-Check'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(screen.getAllByRole('row')).toHaveLength(7);

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'TestGroup', items: ['argo.AMS-Check', 'argo.AMSPublisher-Check', 'org.nagios.AmsDirSize', 'org.nagios.CertLifetime', 'test.AMS-Check'] }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Group of metrics successfully changed',
      'Changed',
      2000
    );
  })

  test('Test delete a group', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status_code: 204 })
    );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/TestGroup'
      )
    })
  })

  test('Test delete group with error', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/TestGroup'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting group of metrics</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})

describe('Tests for groups addviews', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    const mockAvailableMetrics = [
      'test.AMS-Check',
      'argo.CE-Check'
    ];

    Backend.mockImplementation(() => {
      return {
        fetchResult: () => Promise.resolve(mockAvailableMetrics),
        addObject: mockAddObject
      }
    })
  })

  test('Test that addview renders properly', async () => {
    renderAddView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /group/i}).textContent).toBe('Add group of metrics')
    });

    expect(screen.getByRole('heading', { name: 'metrics' })).toBeInTheDocument();
    expect(screen.getByTestId('name').value).toBe('');
    expect(screen.getByTestId('name')).toBeEnabled();
    const selectField = screen.getByTestId('available_metrics');
    expect(within(selectField).getByRole('textbox').textContent).toBe('')
    expect(screen.getByRole('button', { name: /add/i }).textContent).toBe('Add new metrics to group');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /group/i }).textContent).toBe(' Metrics in group');
    expect(screen.getByRole('columnheader', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })

  test('Test creating new group', async () => {
    mockAddObject.mockReturnValueOnce(Promise.resolve({ ok: true, status: 200 }));

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NewGroup' } });

    const selectField = screen.getByTestId('available_metrics');
    fireEvent.change(within(selectField).getByRole('textbox'), { target: { value: 'test' } })
    fireEvent.click(within(selectField).getByText('test.AMS-Check'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Are you sure you want to add group of metrics?')
    })
    expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Add group of metrics');

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))
    expect(mockAddObject).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'NewGroup', items: ['test.AMS-Check'] }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith('Group of metrics successfully added', 'Added', 2000)
  })

  test('Test creating new groups without assigned resources', async () => {
    mockAddObject.mockReturnValueOnce(Promise.resolve({ ok: true, status: 200 }));

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })
    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NewGroup' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Are you sure you want to add group of metrics?')
    })
    expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Add group of metrics');

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))
    expect(mockAddObject).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'NewGroup', items: [] }
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('Group of metrics successfully added', 'Added', 2000)
  })

  test('Test error adding new group with message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'Group of metrics with this name already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })
    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NewGroup' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Are you sure you want to add group of metrics?')
    })
    expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Add group of metrics');

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    expect(mockAddObject).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'NewGroup', items: [] }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Group of metrics with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error adding new group without message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        status: 500,
        statusText: 'SERVER ERROR'
      })
    );

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /group/i })).toBeInTheDocument();
    })
    fireEvent.change(screen.getByTestId('name'), { target: { value: 'NewGroup' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Are you sure you want to add group of metrics?')
    })
    expect(screen.getByRole('dialog', { title: /add/i }).textContent).toContain('Add group of metrics');

    fireEvent.click(screen.getByRole('button', { name: /yes/i }))

    expect(mockAddObject).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/metricsgroup/',
        { name: 'NewGroup', items: [] }
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding group of metrics</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})