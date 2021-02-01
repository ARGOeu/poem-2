import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { queryCache } from 'react-query';
import { OperationsProfilesList } from '../OperationsProfiles';
import { WebApi } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    WebApi: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
})


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


function renderListView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}operationsprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <OperationsProfilesList
              {...props}
              publicView={true}
              webapioperations={'https://mock.operations.com'}
              webapitoken={'token'}
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
            render={ props => <OperationsProfilesList
              {...props}
              webapioperations={'https://mock.operations.com'}
              webapitoken={'token'}
              />
            }
          />
        </Router>
      )
    }
}


describe('Test list of operations profiles', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchOperationsProfiles: () => Promise.resolve(mockOperationsProfiles)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select operations profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(9);
    expect(screen.getByRole('row', { name: /egi/i }).textContent).toBe('1egi_ops');
    expect(screen.getByRole('link', { name: /egi/i }).closest('a')).toHaveAttribute('href', '/ui/operationsprofiles/egi_ops');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select operations profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(9);
    expect(screen.getByRole('row', { name: /egi/i }).textContent).toBe('1egi_ops');
    expect(screen.getByRole('link', { name: /egi/i }).closest('a')).toHaveAttribute('href', '/ui/public_operationsprofiles/egi_ops');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})