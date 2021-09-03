import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ChangePassword, UserChange, UsersList } from '../Users';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

global.fetch = jest.fn();

const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockAddObject = jest.fn();

const queryClient = new QueryClient();


beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
  queryClient.clear();
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
    date_joined: '2019-07-08 12:58:08',
    last_login: '2020-02-15 14:51:42',
    id: '1'
  }
}

const mockUserProfile = {
  subject: 'some subject',
  egiid: 'id',
  displayname: 'Alan_Ford'
}

const mockUsersGroups = {
  aggregations: ['aggr-group1'],
  metrics: ['metric-group1', 'metric-group2'],
  metricprofiles: ['mp-group1'],
  reports: ['report-group2'],
  thresholdsprofiles: ['threshold-group3']
}

const mockAllUserGroups = {
  aggregations: ['aggr-group1', 'aggr-group2'],
  metrics: ['metric-group1', 'metric-group2', 'metric-group3'],
  metricprofiles: ['mp-group1'],
  reports: ['report-group1', 'report-group2'],
  thresholdsprofiles: ['threshold-group2', 'threshold-group3']
}


function renderListView() {
  const route = '/ui/administration/users';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route path='/ui/administration/users'
            render={ props =>
              <UsersList {...props} isTenantSchema={true} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderChangeView(username='Alan_Ford') {
  const route = `/ui/administration/users/${username}`;
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/users/:user_name'
            render={ props => <UserChange {...props} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderAddView() {
  const route = '/ui/administration/users/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/users/add'
            render={ props => <UserChange {...props} addview={true} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderTenantChangeView(username='Alan_Ford') {
  const route = `/ui/administration/users/${username}`;
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/users/:user_name'
            render={ props => <UserChange {...props} isTenantSchema={true} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderTenantAddview() {
  const route = '/ui/administration/users/add';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/users/add'
            render={ props => <UserChange {...props} addview={true} isTenantSchema={true} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderChangePassword() {
  const route = '/ui/administration/users/poem/change_password';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/users/:user_name/change_password'
            render={ props => <ChangePassword {...props} /> }
          />
        </Router>
      </QueryClientProvider>
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

const mockFetchData = jest.fn();

describe('Test user changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: mockFetchData,
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    mockFetchData.mockReturnValue(Promise.resolve(mockUser))
    renderChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    const usernameField = screen.getByTestId('username');
    const passwordField = screen.queryByTestId('password');
    const confirmPasswordField = screen.queryByTestId('confirm_password');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.getByTestId('last_login');
    const dateJoinedField = screen.getByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })

    expect(usernameField.value).toBe('Alan_Ford');
    expect(usernameField).toBeEnabled();
    expect(passwordField).not.toBeInTheDocument();
    expect(confirmPasswordField).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /password/i })).not.toBeInTheDocument();
  })

  test('Test that page renders properly if changeview of logged in user', async () => {
    mockFetchData.mockReturnValueOnce(
      Promise.resolve(mockActiveSession['userdetails'])
    )

    renderChangeView('poem');

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user');
    })

    const usernameField = screen.getByTestId('username');
    const passwordField = screen.queryByTestId('password');
    const confirmPasswordField = screen.queryByTestId('confirm_password');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.getByTestId('last_login');
    const dateJoinedField = screen.getByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })

    expect(usernameField.value).toBe('poem');
    expect(usernameField).toBeEnabled();
    expect(passwordField).not.toBeInTheDocument();
    expect(confirmPasswordField).not.toBeInTheDocument();
    expect(firstNameField.value).toBe('');
    expect(firstNameField).toBeEnabled();
    expect(lastNameField.value).toBe('');
    expect(lastNameField).toBeEnabled();
    expect(emailField.value).toBe('test@email.com');
    expect(emailField).toBeEnabled();
    expect(lastLoginField.value).toBe('2020-02-15 14:51:42');
    expect(lastLoginField).toHaveAttribute('readonly');
    expect(dateJoinedField.value).toBe('2019-07-08 12:58:08');
    expect(dateJoinedField).toHaveAttribute('readonly');
    expect(superUserCheckbox.checked).toBeTruthy();
    expect(activeCheckbox.checked).toBeTruthy();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /password/i })).toBeInTheDocument();
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

  test('Test form validation when changing user', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }));

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findAllByTestId('error-msg')).toHaveLength(2);
    expect(mockChangeObject).not.toHaveBeenCalled();
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

  test('Test successfully deleting user', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'User successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting user with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting user without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting user</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for user addview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        addObject: mockAddObject
      }
    })
  })

  test('Test page renders properly', async () => {
    renderAddView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Add user');
    })

    const usernameField = screen.getByTestId('username');
    const passwordField = screen.getByTestId('password');
    const confirmPasswordField = screen.getByTestId('confirm_password');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.queryByTestId('last_login');
    const dateJoinedField = screen.queryByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })

    expect(usernameField.value).toBe('');
    expect(usernameField).toBeEnabled();
    expect(passwordField.value).toBe('');
    expect(passwordField).toBeEnabled();
    expect(confirmPasswordField.value).toBe('')
    expect(confirmPasswordField).toBeEnabled();
    expect(firstNameField.value).toBe('');
    expect(firstNameField).toBeEnabled();
    expect(lastNameField.value).toBe('');
    expect(lastNameField).toBeEnabled();
    expect(emailField.value).toBe('');
    expect(emailField).toBeEnabled();
    expect(lastLoginField).not.toBeInTheDocument();
    expect(dateJoinedField).not.toBeInTheDocument();
    expect(superUserCheckbox.checked).toBeFalsy();
    expect(activeCheckbox.checked).toBeTruthy();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test('Test successfully adding user', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Add user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@tnt.com' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          username: 'Bob_Rock',
          first_name: 'Bob',
          last_name: 'Rock',
          email: 'bob.rock@tnt.com',
          is_superuser: false,
          is_active: true,
          password: 'foobar28'
        }
      )

      expect(NotificationManager.success).toHaveBeenCalledWith(
        'User successfully added', 'Added', 2000
      )
    })
  })

  test('Test form validation when adding user', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Add user');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar25' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findAllByTestId('error-msg')).toHaveLength(3);
    expect(mockAddObject).not.toHaveBeenCalled();
  })

  test('Test error adding user with error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'User with this username already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Add user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@tnt.com' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          username: 'Bob_Rock',
          first_name: 'Bob',
          last_name: 'Rock',
          email: 'bob.rock@tnt.com',
          is_superuser: false,
          is_active: true,
          password: 'foobar28'
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

  test('Test error adding user without error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user/i }).textContent).toBe('Add user');
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@tnt.com' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/',
        {
          username: 'Bob_Rock',
          first_name: 'Bob',
          last_name: 'Rock',
          email: 'bob.rock@tnt.com',
          is_superuser: false,
          is_active: true,
          password: 'foobar28'
        }
      )

      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>Error adding user</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error: 500 SERVER ERROR',
        0,
        expect.any(Function)
      )
    })
  })
})


describe('Tests for user changeview on tenant POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/users/Alan_Ford':
              return Promise.resolve(mockUser)

            case '/api/v2/internal/userprofile/Alan_Ford':
              return Promise.resolve(mockUserProfile)
          }
        },
        fetchResult: (path) => {
          switch (path) {
            case '/api/v2/internal/usergroups/Alan_Ford':
              return Promise.resolve(mockUsersGroups)

            case '/api/v2/internal/usergroups':
              return Promise.resolve(mockAllUserGroups)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderTenantChangeView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    const usernameField = screen.getByTestId('username');
    const passwordField = screen.queryByTestId('password');
    const confirmPasswordField = screen.queryByTestId('confirm_password');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.getByTestId('last_login');
    const dateJoinedField = screen.getByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
    const groupsOfMetricsField = screen.getByLabelText(/groups of metrics/i);
    const groupsOfMetricsOptions = screen.getAllByTestId('groupsofmetrics-option');
    const groupsOfMetricProfilesField = screen.getByLabelText(/groups of metric profiles/i);
    const groupsOfMetricProfilesOptions = screen.getAllByTestId('groupsofmetricprofiles-option');
    const groupsOfAggregationsField = screen.getByLabelText(/groups of aggregation/i);
    const groupsOfAggregationsOptions = screen.getAllByTestId('groupsofaggregations-option');
    const groupsOfThresholdsField = screen.getByLabelText(/groups of threshold/i)
    const groupsOfThresholdsOptions = screen.getAllByTestId('groupsofthresholdsprofiles-option');
    const groupsOfReportsField = screen.getByLabelText(/groups of reports/i);
    const groupsOfReportsOptions = screen.getAllByTestId('groupsofreports-option');
    const subjectField = screen.getByTestId('subject');
    const egiidField = screen.getByTestId('egiid');
    const displayNameField = screen.getByTestId('displayname');

    expect(usernameField.value).toBe('Alan_Ford');
    expect(usernameField).toBeEnabled();
    expect(passwordField).not.toBeInTheDocument();
    expect(confirmPasswordField).not.toBeInTheDocument();
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
    expect(groupsOfMetricsField).toBeInTheDocument();
    expect(groupsOfMetricsOptions).toHaveLength(3);
    expect(groupsOfMetricsOptions[0].selected).toBeTruthy();
    expect(groupsOfMetricsOptions[1].selected).toBeTruthy();
    expect(groupsOfMetricsOptions[2].selected).toBeFalsy();
    expect(groupsOfMetricProfilesField).toBeInTheDocument();
    expect(groupsOfMetricProfilesOptions).toHaveLength(1);
    expect(groupsOfMetricProfilesOptions[0].selected).toBeTruthy();
    expect(groupsOfAggregationsField).toBeInTheDocument();
    expect(groupsOfAggregationsOptions).toHaveLength(2);
    expect(groupsOfAggregationsOptions[0].selected).toBeTruthy();
    expect(groupsOfAggregationsOptions[1].selected).toBeFalsy();
    expect(groupsOfThresholdsField).toBeInTheDocument();
    expect(groupsOfThresholdsOptions).toHaveLength(2);
    expect(groupsOfThresholdsOptions[0].selected).toBeFalsy();
    expect(groupsOfReportsField).toBeInTheDocument();
    expect(groupsOfReportsOptions).toHaveLength(2);
    expect(groupsOfReportsOptions[0].selected).toBeFalsy();
    expect(groupsOfReportsOptions[1].selected).toBeTruthy();
    expect(groupsOfThresholdsOptions[1].selected).toBeTruthy();
    expect(subjectField.value).toBe('some subject');
    expect(subjectField).toBeEnabled();
    expect(egiidField.value).toBe('id');
    expect(egiidField).toBeEnabled();
    expect(displayNameField.value).toBe('Alan_Ford');
    expect(displayNameField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /password/i })).not.toBeInTheDocument();
  })

  test('Test successfully changing and saving user', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    const metricGroups = screen.getByLabelText(/groups of metrics/i)

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = false; }
      else { option.selected = true; }
    })
    fireEvent.change(metricGroups)

    fireEvent.change(screen.getByTestId('subject'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('egiid'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('displayname'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject.mock.calls).toEqual([
        [
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
        ],
        [
          '/api/v2/internal/userprofile/',
          {
            username: 'Alan.Ford',
            displayname: '',
            egiid: '',
            subject: '',
            groupsofaggregations: ['aggr-group1'],
            groupsofmetrics: ['metric-group2', 'metric-group3'],
            groupsofmetricprofiles: ['mp-group1'],
            groupsofreports: ['report-group2'],
            groupsofthresholdsprofiles: ['threshold-group3']
          }
        ]
      ])
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'User successfully changed', 'Changed', 2000
    )
  })

  test('Test form validation when changing user', async () => {
    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }));

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findAllByTestId('error-msg')).toHaveLength(2);
    expect(mockChangeObject).not.toHaveBeenCalled();
  })

  test('Test error changing user with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'User with this username already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    const metricGroups = screen.getByLabelText(/groups of metrics/i)

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = false; }
      else { option.selected = true; }
    })
    fireEvent.change(metricGroups)

    fireEvent.change(screen.getByTestId('subject'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('egiid'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('displayname'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledTimes(1)
    })
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

  test('Test error changing user profile with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'You cannot change this userprofile.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    const metricGroups = screen.getByLabelText(/groups of metrics/i)

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = false; }
      else { option.selected = true; }
    })
    fireEvent.change(metricGroups)

    fireEvent.change(screen.getByTestId('subject'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('egiid'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('displayname'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledTimes(2)
    })
    expect(mockChangeObject.mock.calls).toEqual([
      [
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
      ],
      [
          '/api/v2/internal/userprofile/',
          {
            username: 'Alan.Ford',
            displayname: '',
            egiid: '',
            subject: '',
            groupsofaggregations: ['aggr-group1'],
            groupsofmetrics: ['metric-group2', 'metric-group3'],
            groupsofmetricprofiles: ['mp-group1'],
            groupsofreports: ['report-group2'],
            groupsofthresholdsprofiles: ['threshold-group3']
          }
      ]
    ])

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>You cannot change this userprofile.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing user without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    const metricGroups = screen.getByLabelText(/groups of metrics/i)

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = false; }
      else { option.selected = true; }
    })
    fireEvent.change(metricGroups)

    fireEvent.change(screen.getByTestId('subject'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('egiid'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('displayname'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledTimes(1)
    })
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

  test('Test error changing userprofile without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Alan.Ford' } });
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Fordy' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'alan.ford@group-tnt.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /superuser/i }))

    const metricGroups = screen.getByLabelText(/groups of metrics/i)

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = false; }
      else { option.selected = true; }
    })
    fireEvent.change(metricGroups)

    fireEvent.change(screen.getByTestId('subject'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('egiid'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('displayname'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledTimes(2)
    })
    expect(mockChangeObject.mock.calls).toEqual([
      [
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
      ],
      [
          '/api/v2/internal/userprofile/',
          {
            username: 'Alan.Ford',
            displayname: '',
            egiid: '',
            subject: '',
            groupsofaggregations: ['aggr-group1'],
            groupsofmetrics: ['metric-group2', 'metric-group3'],
            groupsofmetricprofiles: ['mp-group1'],
            groupsofreports: ['report-group2'],
            groupsofthresholdsprofiles: ['threshold-group3']
          }
      ]
    ])

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing user profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting user', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'User successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting user with error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting user without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /change user/i }).textContent).toBe('Change user')
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/users/Alan_Ford'
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting user</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for user addview on tenant POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        fetchResult: (path) => {
          switch (path) {
            case '/api/v2/internal/usergroups':
              return Promise.resolve(mockAllUserGroups)
          }
        },
        addObject: mockAddObject
      }
    })
  })

  test('Test page renders properly', async () => {
    renderTenantAddview();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user');
    })

    const usernameField = screen.getByTestId('username');
    const passwordField = screen.getByTestId('password');
    const confirmPasswordField = screen.getByTestId('confirm_password');
    const firstNameField = screen.getByTestId('first_name');
    const lastNameField = screen.getByTestId('last_name');
    const emailField = screen.getByTestId('email');
    const lastLoginField = screen.queryByTestId('last_login');
    const dateJoinedField = screen.queryByTestId('date_joined');
    const superUserCheckbox = screen.getByRole('checkbox', { name: /superuser/i });
    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
    const groupsOfMetricsField = screen.getByLabelText(/groups of metrics/i);
    const groupsOfMetricsOptions = screen.getAllByTestId('groupsofmetrics-option');
    const groupsOfMetricProfilesField = screen.getByLabelText(/groups of metric profiles/i);
    const groupsOfMetricProfilesOptions = screen.getAllByTestId('groupsofmetricprofiles-option');
    const groupsOfAggregationsField = screen.getByLabelText(/groups of aggregation/i);
    const groupsOfAggregationsOptions = screen.getAllByTestId('groupsofaggregations-option');
    const groupsOfThresholdsField = screen.getByLabelText(/groups of threshold/i)
    const groupsOfThresholdsOptions = screen.getAllByTestId('groupsofthresholdsprofiles-option');
    const groupsOfReportsField = screen.getByLabelText(/groups of reports/i);
    const groupsOfReportsOptions = screen.getAllByTestId('groupsofreports-option');
    const subjectField = screen.getByTestId('subject');
    const egiidField = screen.getByTestId('egiid');
    const displayNameField = screen.getByTestId('displayname');

    expect(usernameField.value).toBe('');
    expect(usernameField).toBeEnabled();
    expect(passwordField.value).toBe('');
    expect(passwordField).toBeEnabled();
    expect(confirmPasswordField.value).toBe('')
    expect(confirmPasswordField).toBeEnabled();
    expect(firstNameField.value).toBe('');
    expect(firstNameField).toBeEnabled();
    expect(lastNameField.value).toBe('');
    expect(lastNameField).toBeEnabled();
    expect(emailField.value).toBe('');
    expect(emailField).toBeEnabled();
    expect(lastLoginField).not.toBeInTheDocument();
    expect(dateJoinedField).not.toBeInTheDocument();
    expect(superUserCheckbox.checked).toBeFalsy();
    expect(activeCheckbox.checked).toBeTruthy();
    expect(groupsOfMetricsField).toBeInTheDocument();
    expect(groupsOfMetricsOptions).toHaveLength(3);
    expect(groupsOfMetricsOptions[0].selected).toBeFalsy();
    expect(groupsOfMetricsOptions[1].selected).toBeFalsy();
    expect(groupsOfMetricsOptions[2].selected).toBeFalsy();
    expect(groupsOfMetricProfilesField).toBeInTheDocument();
    expect(groupsOfMetricProfilesOptions).toHaveLength(1);
    expect(groupsOfMetricProfilesOptions[0].selected).toBeFalsy();
    expect(groupsOfAggregationsField).toBeInTheDocument();
    expect(groupsOfAggregationsOptions).toHaveLength(2);
    expect(groupsOfAggregationsOptions[0].selected).toBeFalsy();
    expect(groupsOfAggregationsOptions[1].selected).toBeFalsy();
    expect(groupsOfThresholdsField).toBeInTheDocument();
    expect(groupsOfThresholdsOptions).toHaveLength(2);
    expect(groupsOfThresholdsOptions[0].selected).toBeFalsy();
    expect(groupsOfThresholdsOptions[1].selected).toBeFalsy();
    expect(groupsOfReportsField).toBeInTheDocument();
    expect(groupsOfReportsOptions).toHaveLength(2);
    expect(groupsOfReportsOptions[0].selected).toBeFalsy();
    expect(groupsOfReportsOptions[1].selected).toBeFalsy();
    expect(subjectField.value).toBe('');
    expect(subjectField).toBeEnabled();
    expect(egiidField.value).toBe('');
    expect(egiidField).toBeEnabled();
    expect(displayNameField.value).toBe('');
    expect(displayNameField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /password/i })).not.toBeInTheDocument();
  })

  test('Test successfully saving user', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@group-tnt.com' } });

    const metricGroups = screen.getByLabelText(/groups of metrics/i);
    const metricProfilesGroups = screen.getByLabelText(/groups of metric profile/i);
    const aggrGroups = screen.getByLabelText(/groups of aggregation/i);
    const thresholdsGroups = screen.getByLabelText(/groups of threshold/i);

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricGroups);

    Array.from(metricProfilesGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricProfilesGroups);

    Array.from(aggrGroups.children, (option, i) => {
      if (i == 1) { option.selected = true }
    })
    fireEvent.change(aggrGroups);

    Array.from(thresholdsGroups.children, (option, i) => {
      if (i == 1) { option.selected = true; }
    })
    fireEvent.change(thresholdsGroups);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject.mock.calls).toEqual([
        [
          '/api/v2/internal/users/',
          {
            username: 'Bob_Rock',
            first_name: 'Bob',
            last_name: 'Rock',
            email: 'bob.rock@group-tnt.com',
            is_superuser: false,
            is_active: true,
            password: 'foobar28'
          }
        ],
        [
          '/api/v2/internal/userprofile/',
          {
            username: 'Bob_Rock',
            displayname: '',
            egiid: '',
            subject: '',
            groupsofaggregations: ['aggr-group2'],
            groupsofmetrics: ['metric-group1'],
            groupsofmetricprofiles: ['mp-group1'],
            groupsofreports: [],
            groupsofthresholdsprofiles: ['threshold-group3']
          }
        ]
      ])
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'User successfully added', 'Added', 2000
    )
  })

  test('Test form validation when adding user', async () => {
    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findAllByTestId('error-msg')).toHaveLength(4);
    expect(mockAddObject).not.toHaveBeenCalled();
  })

  test('Test error saving user with error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'User with this username already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@group-tnt.com' } });

    const metricGroups = screen.getByLabelText(/groups of metrics/i);
    const metricProfilesGroups = screen.getByLabelText(/groups of metric profile/i);
    const aggrGroups = screen.getByLabelText(/groups of aggregation/i);
    const thresholdsGroups = screen.getByLabelText(/groups of threshold/i);

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricGroups);

    Array.from(metricProfilesGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricProfilesGroups);

    Array.from(aggrGroups.children, (option, i) => {
      if (i == 1) { option.selected = true }
    })
    fireEvent.change(aggrGroups);

    Array.from(thresholdsGroups.children, (option, i) => {
      if (i == 1) { option.selected = true; }
    })
    fireEvent.change(thresholdsGroups);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledTimes(1);
    })
    expect(mockAddObject).toHaveBeenCalledWith(
      '/api/v2/internal/users/',
      {
        username: 'Bob_Rock',
        first_name: 'Bob',
        last_name: 'Rock',
        email: 'bob.rock@group-tnt.com',
        is_superuser: false,
        is_active: true,
        password: 'foobar28'
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

  test('Test error saving user without error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@group-tnt.com' } });

    const metricGroups = screen.getByLabelText(/groups of metrics/i);
    const metricProfilesGroups = screen.getByLabelText(/groups of metric profile/i);
    const aggrGroups = screen.getByLabelText(/groups of aggregation/i);
    const thresholdsGroups = screen.getByLabelText(/groups of threshold/i);

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricGroups);

    Array.from(metricProfilesGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricProfilesGroups);

    Array.from(aggrGroups.children, (option, i) => {
      if (i == 1) { option.selected = true }
    })
    fireEvent.change(aggrGroups);

    Array.from(thresholdsGroups.children, (option, i) => {
      if (i == 1) { option.selected = true; }
    })
    fireEvent.change(thresholdsGroups);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledTimes(1);
    })
    expect(mockAddObject).toHaveBeenCalledWith(
      '/api/v2/internal/users/',
      {
        username: 'Bob_Rock',
        first_name: 'Bob',
        last_name: 'Rock',
        email: 'bob.rock@group-tnt.com',
        is_superuser: false,
        is_active: true,
        password: 'foobar28'
      }
    )

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding user</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test error saving user profile with error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@group-tnt.com' } });

    const metricGroups = screen.getByLabelText(/groups of metrics/i);
    const metricProfilesGroups = screen.getByLabelText(/groups of metric profile/i);
    const aggrGroups = screen.getByLabelText(/groups of aggregation/i);
    const thresholdsGroups = screen.getByLabelText(/groups of threshold/i);

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricGroups);

    Array.from(metricProfilesGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricProfilesGroups);

    Array.from(aggrGroups.children, (option, i) => {
      if (i == 1) { option.selected = true }
    })
    fireEvent.change(aggrGroups);

    Array.from(thresholdsGroups.children, (option, i) => {
      if (i == 1) { option.selected = true; }
    })
    fireEvent.change(thresholdsGroups);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledTimes(2);
    })

    expect(mockAddObject.mock.calls).toEqual([
      [
        '/api/v2/internal/users/',
        {
          username: 'Bob_Rock',
          first_name: 'Bob',
          last_name: 'Rock',
          email: 'bob.rock@group-tnt.com',
          is_superuser: false,
          is_active: true,
          password: 'foobar28'
        }
      ],
      [
        '/api/v2/internal/userprofile/',
        {
          username: 'Bob_Rock',
          displayname: '',
          egiid: '',
          subject: '',
          groupsofaggregations: ['aggr-group2'],
          groupsofmetrics: ['metric-group1'],
          groupsofmetricprofiles: ['mp-group1'],
          groupsofreports: [],
          groupsofthresholdsprofiles: ['threshold-group3']
        }
      ]
    ])

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error saving user profile without error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    ).mockReturnValueOnce(
      Promise.resolve({status: 500, statusText: 'SERVER ERROR' })
    )

    renderTenantAddview();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add user/i }).textContent).toBe('Add user')
    })

    fireEvent.change(screen.getByTestId('username'), { target: { value: 'Bob_Rock' } });
    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })
    fireEvent.change(screen.getByTestId('first_name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('last_name'), { target: { value: 'Rock' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'bob.rock@group-tnt.com' } });

    const metricGroups = screen.getByLabelText(/groups of metrics/i);
    const metricProfilesGroups = screen.getByLabelText(/groups of metric profile/i);
    const aggrGroups = screen.getByLabelText(/groups of aggregation/i);
    const thresholdsGroups = screen.getByLabelText(/groups of threshold/i);

    Array.from(metricGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricGroups);

    Array.from(metricProfilesGroups.children, (option, i) => {
      if (i == 0) { option.selected = true; }
    })
    fireEvent.change(metricProfilesGroups);

    Array.from(aggrGroups.children, (option, i) => {
      if (i == 1) { option.selected = true }
    })
    fireEvent.change(aggrGroups);

    Array.from(thresholdsGroups.children, (option, i) => {
      if (i == 1) { option.selected = true; }
    })
    fireEvent.change(thresholdsGroups);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledTimes(2);
    })

    expect(mockAddObject.mock.calls).toEqual([
      [
        '/api/v2/internal/users/',
        {
          username: 'Bob_Rock',
          first_name: 'Bob',
          last_name: 'Rock',
          email: 'bob.rock@group-tnt.com',
          is_superuser: false,
          is_active: true,
          password: 'foobar28'
        }
      ],
      [
        '/api/v2/internal/userprofile/',
        {
          username: 'Bob_Rock',
          displayname: '',
          egiid: '',
          subject: '',
          groupsofaggregations: ['aggr-group2'],
          groupsofmetrics: ['metric-group1'],
          groupsofmetricprofiles: ['mp-group1'],
          groupsofreports: [],
          groupsofthresholdsprofiles: ['threshold-group3']
        }
      ]
    ])

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding user profile</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for changing password', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangePassword();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password')
    })

    const passwordField = screen.getByTestId('password');
    const confirmPasswordField = screen.getByTestId('confirm_password');

    expect(passwordField.value).toBe('');
    expect(passwordField).toBeEnabled();
    expect(confirmPasswordField.value).toBe('');
    expect(confirmPasswordField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /password/i })).not.toBeInTheDocument();
  })

  test('Test form validation if missing confirm password entry', async () => {
    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findAllByTestId('error-msg')).toHaveLength(1);
    expect(mockChangeObject).not.toHaveBeenCalled();
  })

  test('Test form validation if passwords not equal', async () => {
    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar38' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findAllByTestId('error-msg')).toHaveLength(1);
    expect(mockChangeObject).not.toHaveBeenCalled();
  })

  test('Test form validation if password not valid', async () => {
    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findAllByTestId('error-msg')).toHaveLength(1);
    expect(mockChangeObject).not.toHaveBeenCalled();
  })

  test('Test form validation if no password entered', async () => {
    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findAllByTestId('error-msg')).toHaveLength(2);
    expect(mockChangeObject).not.toHaveBeenCalled();
  })

  test('Test successfully changing password', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    expect(mockChangeObject).toHaveBeenCalledWith(
      '/api/v2/internal/change_password/',
      {
        username: 'poem',
        new_password: 'foobar28'
      }
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'Password successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing password with error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'There has been an error.' }),
        status: 403,
        statusText: 'FORBIDDEN'
      })
    )

    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    expect(mockChangeObject).toHaveBeenCalledWith(
      '/api/v2/internal/change_password/',
      {
        username: 'poem',
        new_password: 'foobar28'
      }
    )

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled()
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 403 FORBIDDEN',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing password without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password/i }).textContent).toBe('Change password');
    })

    fireEvent.change(screen.getByTestId('password'), { target: { value: 'foobar28' } });
    fireEvent.change(screen.getByTestId('confirm_password'), { target: { value: 'foobar28' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    expect(mockChangeObject).toHaveBeenCalledWith(
      '/api/v2/internal/change_password/',
      {
        username: 'poem',
        new_password: 'foobar28'
      }
    )

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled()
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing password</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})
