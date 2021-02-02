import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { queryCache } from 'react-query';
import { UsersList } from '../Users';
import { Backend } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
})


const mockUsers = [
  {
    first_name: 'Alan',
    last_name: 'Ford',
    username: 'Alan_Ford',
    is_active: true,
    is_superuser: false,
    email: 'alan.ford@tnt.com',
    date_joined: '2020-02-02 15:17:23',
    last_login: '',
    pk: 2
  },
  {
    first_name: 'Number',
    last_name: 'One',
    username: 'number1',
    is_active: true,
    is_superuser: true,
    email: 'number1@tnt.com',
    date_joined: '1970-01-01 00:00:00',
    last_login: '2020-02-02 15:19:02',
    pk: 1
  }
]


function renderListView() {
  const route = '/ui/administration/users';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route path='/ui/administration/users' component={UsersList}/>
      </Router>
    )
  }
}


describe('Test users listview', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockUsers)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Select user to change');
    })

    const columns = screen.getAllByRole('columnheader');
    expect(columns).toHaveLength(7);
    expect(columns[0].textContent).toBe('#');
    expect(columns[1].textContent).toBe('Username');
    expect(columns[2].textContent).toBe('First name');
    expect(columns[3].textContent).toBe('Last name');
    expect(columns[4].textContent).toBe('Email address');
    expect(columns[5].textContent).toBe('Superuser');
    expect(columns[6].textContent).toBe('Active');

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(21);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(18);
    expect(rows[0].textContent).toBe('#UsernameFirst nameLast nameEmail addressSuperuserActive');
    expect(rows[1].textContent).toBe('1Alan_FordAlanFordalan.ford@tnt.com')
    expect(rows[2].textContent).toBe('2number1NumberOnenumber1@tnt.com')

    expect(screen.getByRole('link', { name: /alan/i }).closest('a')).toHaveAttribute('href', '/ui/administration/users/Alan_Ford');
    expect(screen.getByRole('link', { name: /number/i }).closest('a')).toHaveAttribute('href', '/ui/administration/users/number1');

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })
})
