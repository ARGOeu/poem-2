import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ThresholdsProfilesList } from '../ThresholdProfiles';
import { Backend } from '../DataManager';
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
    id: '1'
  }
}


function renderListView(publicView=false) {
  const route = `/ui/${publicView ? 'public_' : ''}thresholdsprofiles`;
  const history = createMemoryHistory({ initialEntries: [route] })

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <ThresholdsProfilesList {...props} publicView={true} /> }
          />
        </Router>
      )
    }
  return {
    ...render(
      <Router history={history}>
        <Route component={ThresholdsProfilesList} />
      </Router>
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
