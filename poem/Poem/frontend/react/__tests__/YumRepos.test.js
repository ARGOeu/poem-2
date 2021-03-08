import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { YumRepoList } from '../YumRepos';
import { Backend } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
})


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


function renderListView() {
  const route = '/ui/yumrepos';
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
