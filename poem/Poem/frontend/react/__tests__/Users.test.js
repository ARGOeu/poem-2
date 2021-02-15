import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { queryCache } from 'react-query';
import { UserChange, UsersList } from '../Users';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockChangeObject = jest.fn();


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

const mockUser = {
    first_name: 'Alan',
    last_name: 'Ford',
    username: 'Alan_Ford',
    is_active: true,
    is_superuser: false,
    email: 'alan.ford@tnt.com',
    date_joined: '2020-02-02 15:17:23',
    last_login: '',
    pk: 2
}

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


function renderChangeView() {
  const route = '/ui/administration/users/Alan_Ford';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/administration/users/:user_name'
          render={ props => <UserChange {...props} /> }
        />
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


describe('Test user changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockUser),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    const usernameField = screen.getByTestId('username');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.getByTestId('last_login');
    const dateJoinedField = screen.getByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })

    expect(usernameField.value).toBe('Alan_Ford');
    expect(usernameField).toBeEnabled();
    expect(firstNameField.value).toBe('Alan');
    expect(firstNameField).toBeEnabled();
    expect(lastNameField.value).toBe('Ford');
    expect(lastNameField).toBeEnabled();
    expect(emailField.value).toBe('alan.ford@tnt.com');
    expect(emailField).toBeEnabled();
    expect(lastLoginField.value).toBe('');
    expect(lastLoginField).toHaveAttribute('readonly');
    expect(dateJoinedField.value).toBe('2020-02-02 15:17:23');
    expect(dateJoinedField).toHaveAttribute('readonly');
    expect(superUserCheckbox.checked).toBeFalsy();
    expect(activeCheckbox.checked).toBeTruthy();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test successfully changing and saving user', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          pk: 2,
          username: 'Alan.Ford',
          first_name: 'Al',
          last_name: 'Fordy',
          email: 'alan.ford@group-tnt.com',
          is_superuser: true,
          is_active: true
        }
      )

      expect(NotificationManager.success).toHaveBeenCalledWith(
        'User successfully changed', 'Changed', 2000
      )
    })
  })

  test('Test error changing and saving user with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'User with this username already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          pk: 2,
          username: 'Alan.Ford',
          first_name: 'Al',
          last_name: 'Fordy',
          email: 'alan.ford@group-tnt.com',
          is_superuser: true,
          is_active: true
        }
      )

      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>User with this username already exists.</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error: 400 BAD REQUEST',
        0,
        expect.any(Function)
      )
    })
  })

  test('Test error changing and saving user without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          pk: 2,
          username: 'Alan.Ford',
          first_name: 'Al',
          last_name: 'Fordy',
          email: 'alan.ford@group-tnt.com',
          is_superuser: true,
          is_active: true
        }
      )

      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>Error changing user</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error: 500 SERVER ERROR',
        0,
        expect.any(Function)
      )
    })
  })
})