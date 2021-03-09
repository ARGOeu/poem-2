import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { YumRepoComponent, YumRepoList } from '../YumRepos';
import { Backend } from '../DataManager';
import { queryCache } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
  queryCache.clear();
})


const mockChangeObject = jest.fn();
const mockDeleteObject = jest.fn();


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
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          render={ props => <YumRepoList {...props} /> }
        />
      </Router>
    )
  }
}


function renderChangeView() {
  const route = '/ui/yumrepos/argo-centos6';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <Router history={history}>
        <Route
          path='/ui/yumrepos/:name'
          render={ props => <YumRepoComponent {...props} /> }
        />
      </Router>
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
        },
        isTenantSchema: () => Promise.resolve(false)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
        },
        isTenantSchema: () => Promise.resolve(true)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

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
    renderListView();

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

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i }).textContent).toBe('Change YUM repo')
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByTestId('tag');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    expect(nameField.value).toBe('argo');
    expect(nameField).toBeEnabled();
    expect(tagField.value).toBe('CentOS 6');
    expect(tagField).toBeEnabled();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'CentOS 6' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CentOS 7' })).toBeInTheDocument();
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByTestId('tag');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    fireEvent.change(tagField, { target: { value: 'CentOS 7' } });
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
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'YUM repo with this name and tag already exists.' }),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByTestId('tag');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    fireEvent.change(tagField, { target: { value: 'CentOS 7' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>YUM repo with this name and tag already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  test('Test error changing repo without error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

    renderChangeView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yum/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId('name');
    const tagField = screen.getByTestId('tag');
    const contentField = screen.getByLabelText('File content');
    const descriptionField = screen.getByLabelText('Description');

    fireEvent.change(nameField, { target: { value: 'argo-devel' } });
    fireEvent.change(tagField, { target: { value: 'CentOS 7' } });
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

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing YUM repo</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test successfully deleting repo', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'NO CONTENT' })
    )

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
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({ detail: 'YUM repo not found.' }),
        status: 404,
        statusText: 'NOT FOUND'
      })
    )

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
        <p>YUM repo not found.</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 404 NOT FOUND',
      0,
      expect.any(Function)
    )
  })

  test('Test error deleting YUM repo without error message', async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ status: 500, statusText: 'SERVER ERROR' })
    )

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
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})
