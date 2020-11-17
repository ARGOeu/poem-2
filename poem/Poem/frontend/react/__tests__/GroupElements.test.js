import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { GroupList } from '../GroupElements';
import { render, waitFor, screen } from '@testing-library/react';


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
    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <Route render={props => <GroupList {...props} group='metrics' id='groupofmetrics' name='group of metrics' />} />
      </Router>
    )

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
})