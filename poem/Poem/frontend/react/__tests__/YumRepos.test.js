import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { YumRepoComponent, YumRepoList } from '../YumRepos';
import { Backend } from '../DataManager';
import { QueryClientProvider, QueryClient, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';
import selectEvent from 'react-select-event';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const queryClient = new QueryClient();
// turning off logging, because we do not want react-query to write logs to console in tests
setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})


beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockAddObject = jest.fn();


const mockListYUMRepos = [
  {
    'id': '1',
    'name': 'repo-1',
    'tag': 'CentOS 6',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 1 description.'
  },
  {
    'id': '2',
    'name': 'repo-2',
    'tag': 'CentOS 7',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 2 description.'
  },
  {
    'id': '3',
    'name': 'repo-3',
    'tag': 'CentOS 7',
    'content': 'content1=content1\ncontent2=content2',
    'description': 'Repo 3 description'
  }
];


const mockYUMRepo = {
  id: 1,
  name: 'argo',
  tag: 'CentOS 6',
  content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos6/\ngpgcheck=0enabled=1\npriority=99\nexclude=\nincludepkgs=',
  description: 'ARGO Product Repository - devel CentOS 6'
}


function renderListView(tenant=false) {
  const route = `/ui/${tenant ? 'administration/' : ''}yumrepos`;

  if (tenant)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <YumRepoList isTenantSchema={ true } />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <YumRepoList />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(tenant=false) {
  const route = `/ui/${tenant ? 'administration/' : ''}yumrepos/argo-centos6`;

  if (tenant)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/administration/yumrepos/:name"
                element={ <YumRepoComponent disabled={ true } /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/yumrepos/:name"
                element={ <YumRepoComponent /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = '/ui/yumrepos/add';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <YumRepoComponent addview={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderCloneView() {
  const route = '/ui/yumrepos/argo-centos6/clone'

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/yumrepos/:name/clone"
              element={ <YumRepoComponent cloneview={ true } /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Test list of YUM repos on SuperAdmin POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockListYUMRepos)

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        }
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /repo/i }).textContent).toBe('Select YUM repo to change')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /tag/i })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /centos/i })).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 6' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 7' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(22);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(17);
    expect(screen.getByRole('row', { name: /repo-1/i }).textContent).toBe('1repo-1Repo 1 description.CentOS 6');
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('2repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('row', { name: /repo-3/i }).textContent).toBe('3repo-3Repo 3 descriptionCentOS 7');
    expect(screen.getByRole('link', { name: /repo-1/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-1-centos6');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-2-centos7');
    expect(screen.getByRole('link', { name: /repo-3/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-3-centos7');
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  })

  test('Test filter repos', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /repo/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'CentOS 6' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(19);
    expect(screen.getByRole('row', { name: /repo-1/i }).textContent).toBe('1repo-1Repo 1 description.CentOS 6');
    expect(screen.getByRole('link', { name: /repo-1/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-1-centos6');

    fireEvent.change(screen.getByDisplayValue('CentOS 6'), { target: { value: 'CentOS 7' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(18);
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('1repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('row', { name: /repo-3/i }).textContent).toBe('2repo-3Repo 3 descriptionCentOS 7');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-2-centos7');
    expect(screen.getByRole('link', { name: /repo-3/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-3-centos7');

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: '2' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(19);
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('1repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/repo-2-centos7');
  })
})


describe('Test list of YUM repos on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos':
              return Promise.resolve(mockListYUMRepos)

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        }
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /repo/i }).textContent).toBe('Select YUM repo for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /tag/i })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Search')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Show all' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: /centos/i })).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 6' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 7' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(22);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(17);
    expect(screen.getByRole('row', { name: /repo-1/i }).textContent).toBe('1repo-1Repo 1 description.CentOS 6');
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('2repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('row', { name: /repo-3/i }).textContent).toBe('3repo-3Repo 3 descriptionCentOS 7');
    expect(screen.getByRole('link', { name: /repo-1/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-1-centos6');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-2-centos7');
    expect(screen.getByRole('link', { name: /repo-3/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-3-centos7');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test filter repos', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /repo/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Show all'), { target: { value: 'CentOS 6' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(19);
    expect(screen.getByRole('row', { name: /repo-1/i }).textContent).toBe('1repo-1Repo 1 description.CentOS 6');
    expect(screen.getByRole('link', { name: /repo-1/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-1-centos6');

    fireEvent.change(screen.getByDisplayValue('CentOS 6'), { target: { value: 'CentOS 7' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(18);
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('1repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('row', { name: /repo-3/i }).textContent).toBe('2repo-3Repo 3 descriptionCentOS 7');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-2-centos7');
    expect(screen.getByRole('link', { name: /repo-3/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-3-centos7');

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], { target: { value: '2' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(19);
    expect(screen.getByRole('row', { name: /repo-2/i }).textContent).toBe('1repo-2Repo 2 description.CentOS 7');
    expect(screen.getByRole('link', { name: /repo-2/ }).closest('a')).toHaveAttribute('href', '/ui/administration/yumrepos/repo-2-centos7');
  })
})


describe('Tests for YUM repos changeview on SuperAdmin POEM', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos/argo/centos6':
              return Promise.resolve(mockYUMRepo)

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i }).textContent).toBe('Change YUM repo')
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    expect(nameField.value).toBe('argo');
    expect(nameField).toBeEnabled();
    expect(tagField).toBeEnabled();

    expect(screen.queryByText('CentOS 7')).not.toBeInTheDocument()
    selectEvent.openMenu(tagField)
    expect(screen.getByText('CentOS 7')).toBeInTheDocument()

    expect(contentField.value).toBe('[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos6/\ngpgcheck=0enabled=1\npriority=99\nexclude=\nincludepkgs=')
    expect(contentField).toBeEnabled();
    expect(descriptionField.value).toBe('ARGO Product Repository - devel CentOS 6')
    expect(descriptionField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clone/i }).closest('a')).toHaveAttribute('href', '/ui/yumrepos/argo-centos6/clone');
  })

  test('Test successfully changing repo', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          id: 1,
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'YUM repo successfully changed', 'Changed', 2000
    )
  })

  test('Test error changing repo with error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; YUM repo with this name and tag already exists.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          id: 1,
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>400 BAD REQUEST; YUM repo with this name and tag already exists.</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })

  test('Test error changing repo without error message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          id: 1,
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>Error changing YUM repo</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })

  test('Test successfully deleting repo', async () => {
    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/argo/centos6',
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'YUM repo successfully deleted', 'Deleted', 2000
    )
  })

  test('Test error deleting YUM repo with error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error('404 NOT FOUND; YUM repo not found.')
    } )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/argo/centos6',
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>404 NOT FOUND; YUM repo not found.</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })

  test('Test error deleting YUM repo without error message', async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'delete' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/argo/centos6',
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting YUM repo</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for YUM repos changeview on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos/argo/centos6':
              return Promise.resolve(mockYUMRepo)

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        }
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderChangeView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i }).textContent).toBe('YUM repo details')
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByTestId('tag');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    expect(nameField.value).toBe('argo');
    expect(nameField).toBeDisabled();
    expect(tagField.value).toBe('CentOS 6');
    expect(tagField).toBeDisabled();
    expect(contentField.value).toBe('[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos6/\ngpgcheck=0enabled=1\npriority=99\nexclude=\nincludepkgs=')
    expect(contentField).toBeDisabled();
    expect(descriptionField.value).toBe('ARGO Product Repository - devel CentOS 6')
    expect(descriptionField).toBeDisabled();

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })
})


describe('Tests for YUM repo addview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(['CentOS 6', 'CentOS 7']),
        addObject: mockAddObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i }).textContent).toBe('Add YUM repo')
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText(/select/i);
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    expect(nameField.value).toBe('');
    expect(nameField).toBeEnabled();
    expect(tagField).toBeEnabled();

    expect(screen.queryByText('CentOS 6')).not.toBeInTheDocument()
    expect(screen.queryByText('CentOS 7')).not.toBeInTheDocument()
    selectEvent.openMenu(tagField)
    expect(screen.getByText('CentOS 6')).toBeInTheDocument()
    expect(screen.getByText('CentOS 7')).toBeInTheDocument()

    expect(contentField.value).toBe('');
    expect(contentField).toBeEnabled();
    expect(descriptionField.value).toBe('');
    expect(descriptionField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test successfully adding new YUM repo', async() => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'etf' } });
    await selectEvent.select(screen.getByText(/select/i), 'CentOS 7')
    fireEvent.change(screen.getByLabelText('File content'), { target: { value: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'CERN ETF Repo' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'etf',
          tag: 'CentOS 7',
          content: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99',
          description: 'CERN ETF Repo'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'YUM repo successfully added', 'Added', 2000
    )
  })

  test('Test error adding new YUM repo with error message', async() => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; YUM repo with this name and tag already exists.')
    } )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'etf' } });
    await selectEvent.select(screen.getByText(/select/i), 'CentOS 7')
    fireEvent.change(screen.getByLabelText('File content'), { target: { value: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'CERN ETF Repo' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'etf',
          tag: 'CentOS 7',
          content: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99',
          description: 'CERN ETF Repo'
        }
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>400 BAD REQUEST; YUM repo with this name and tag already exists.</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })

  test('Test error adding new YUM repo without error message', async() => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } )

    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'etf' } });
    await selectEvent.select(screen.getByText(/select/i), 'CentOS 7')
    fireEvent.change(screen.getByLabelText('File content'), { target: { value: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'CERN ETF Repo' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'add' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'etf',
          tag: 'CentOS 7',
          content: '[etf]\nname=CERN ETF Repo\nbaseurl=http://linuxsoft.cern.ch/internal/repos/etf7-qa/x86_64/os/\ngpgcheck=0\nenabled=1\npriority=99',
          description: 'CERN ETF Repo'
        }
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>Error adding YUM repo</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })
})


describe('Tests for YUM repo cloneview', () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case '/api/v2/internal/yumrepos/argo/centos6':
              return Promise.resolve(mockYUMRepo)

            case '/api/v2/internal/ostags':
              return Promise.resolve(['CentOS 6', 'CentOS 7'])
          }
        },
        addObject: mockAddObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i }).textContent).toBe('Clone YUM repo')
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    expect(nameField.value).toBe('argo');
    expect(nameField).toBeEnabled();
    expect(tagField).toBeEnabled();

    expect(screen.queryByText('CentOS 7')).not.toBeInTheDocument()
    selectEvent.openMenu(tagField)
    expect(screen.getByText('CentOS 7')).toBeInTheDocument()

    expect(contentField.value).toBe('[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos6/\ngpgcheck=0enabled=1\npriority=99\nexclude=\nincludepkgs=')
    expect(contentField).toBeEnabled();
    expect(descriptionField.value).toBe('ARGO Product Repository - devel CentOS 6')
    expect(descriptionField).toBeEnabled();

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
  })

  test('Test successfully cloning new YUM repo', async () => {
    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      'YUM repo successfully added', 'Added', 2000
    )
  })

  test('Test error cloning new YUM repo with error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST; YUM repo with this name and tag already exists.')
    } )

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; YUM repo with this name and tag already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test error cloning new YUM repo without error message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderCloneView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByText('CentOS 6');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    await selectEvent.select(tagField, 'CentOS 7')
    fireEvent.change(contentField, { target: { value: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1'} })
    fireEvent.change(descriptionField, { target: { value: 'ARGO Product Repository - devel CentOS 7' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: 'change' })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/yumrepos/',
        {
          name: 'argo-devel',
          tag: 'CentOS 7',
          content: '[argo-devel]\nname=ARGO Product Repository\nbaseurl=http://rpm-repo.argo.grnet.gr/ARGO/devel/centos7/enabled=1',
          description: 'ARGO Product Repository - devel CentOS 7'
        }
      )
    })

    await waitFor(() => {
      expect(NotificationManager.error).toHaveBeenCalledWith(
        <div>
          <p>Error adding YUM repo</p>
          <p>Click to dismiss.</p>
        </div>,
        'Error',
        0,
        expect.any(Function)
      )
    })
  })
})
