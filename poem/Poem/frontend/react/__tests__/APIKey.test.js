import React from "react";
import { render, waitFor, screen } from '@testing-library/react';
import { APIKeyList } from '../APIKey';
import { Backend } from '../DataManager';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';

jest.mock('../DataManager')

beforeEach(() => {
  Backend.mockClear();
})

describe("Tests for API keys listview", () => {
  it('Render properly', async () => {
    const fakeData = [
      {
        id: 1,
        name: 'FIRST_TOKEN',
        token: '123456',
        created: '2020-11-09 13:00:00',
        revoked: false
      },
      {
        id: 2,
        name: 'SECOND_TOKEN',
        token: 'abcdef',
        created: '2020-11-09 13:10:01',
        revoked: false
      }
    ];

    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(fakeData)
      }
    })

    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <Route render={props => <APIKeyList {...props} />}/>
      </Router>
    )

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(3)
    expect(screen.getAllByRole('row', {name: /token/i})).toHaveLength(2)
    expect(screen.getByRole('row', {name: /first_token/i}).textContent).toBe('1FIRST_TOKEN2020-11-09 13:00:00')
    expect(screen.getByRole('row', {name: /second_token/i}).textContent).toBe('2SECOND_TOKEN2020-11-09 13:10:01')
    expect(screen.getByRole('link', {name: /first/i})).toHaveProperty('href', 'http://localhost/ui/administration/apikey/FIRST_TOKEN')
    expect(screen.getByRole('link', {name: /second/i})).toHaveProperty('href', 'http://localhost/ui/administration/apikey/SECOND_TOKEN')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  it('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve([])
      }
    })

    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <Route render={props => <APIKeyList {...props} />} />
      </Router>
    )
    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(4)
    expect(screen.getByRole('row', {name: /no/i}).textContent).toBe('No API keys')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })
})