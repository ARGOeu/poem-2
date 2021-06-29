import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { Backend } from '../DataManager';
import { ReportsList } from '../Reports';
import { queryCache } from 'react-query';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
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


function renderListView() {
  const route = '/ui/reports';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/reports'
          render={ props => <ReportsList
            {...props}
            webapitoken='token'
            webapireports='https://mock.reports.com'
          /> }
        />
      </Router>
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