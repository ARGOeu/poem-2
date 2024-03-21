import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import { Backend } from '../DataManager';
import Login from '../Login';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockOnLogin = jest.fn();


beforeEach(() => {
  jest.clearAllMocks();
})

const mockConfigOptions = {
  result: {
    saml_login_string: 'Log in using EGI CheckIn',
    webapimetric: 'https://metric.profile.com',
    webapiaggregation: 'https://aggregations.com',
    webapithresholds: 'https://thresholds.com',
    webapioperations: 'https://operations.com',
    version: '2.3.0',
    webapireports: 'https://reports.com',
    tenant_name: 'MOCK_TENANT',
    terms_privacy_links: {
      'terms': 'https://ui.argo.grnet.gr/egi/termsofUse',
      'privacy': 'https://argo.egi.eu/egi/policies'
    }
  }
};


function renderView() {
  const route = '/ui/';

  return {
    ...render(
      <MemoryRouter initialEntries={ [ route ] }>
        <Login
          onLogin={ mockOnLogin }
        />
      </MemoryRouter>
    )
  }
}


describe('Test for login page on SuperAdmin POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isTenantSchema: () => Promise.resolve(false),
        fetchConfigOptions: () => Promise.resolve(mockConfigOptions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/argo poem/i)).toBeInTheDocument();
    })

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /login using username and password/i })).toBeInTheDocument();

    expect(screen.getByText(/cnrs/i).closest('a')).toHaveAttribute('href', 'http://www.cnrs.fr/');
    expect(screen.getByText(/grnet/i).closest('a')).toHaveAttribute('href', 'https://grnet.gr/');
    expect(screen.getByText(/srce/i).closest('a')).toHaveAttribute('href', 'http://www.srce.unizg.hr/');
    expect(screen.getByText(/eosc-hub/i).closest('a')).toHaveAttribute('href', 'https://www.eosc-hub.eu');
    expect(screen.getByText(/egi.eu/i).closest('a')).toHaveAttribute('href', 'http://www.egi.eu/');
    expect(screen.getByText(/terms/i).closest('a')).toHaveAttribute('href', 'https://ui.argo.grnet.gr/egi/termsofUse');
    expect(screen.getByText(/cookie/i).closest('a')).toHaveAttribute('href', '#')
    expect(screen.getByText(/privacy/i).closest('a')).toHaveAttribute('href', 'https://argo.egi.eu/egi/policies');
  })
})


describe('Test for login page on tenant POEM', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isTenantSchema: () => Promise.resolve(true),
        fetchConfigOptions: () => Promise.resolve(mockConfigOptions)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/argo poem/i)).toBeInTheDocument();
    })

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /login using username and password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /egi checkin/i}).textContent).toBe('Log in using EGI CheckIn');

    expect(screen.getByText(/cnrs/i).closest('a')).toHaveAttribute('href', 'http://www.cnrs.fr/');
    expect(screen.getByText(/grnet/i).closest('a')).toHaveAttribute('href', 'https://grnet.gr/');
    expect(screen.getByText(/srce/i).closest('a')).toHaveAttribute('href', 'http://www.srce.unizg.hr/');
    expect(screen.getByText(/eosc-hub/i).closest('a')).toHaveAttribute('href', 'https://www.eosc-hub.eu');
    expect(screen.getByText(/egi.eu/i).closest('a')).toHaveAttribute('href', 'http://www.egi.eu/');
    expect(screen.getByText(/terms/i).closest('a')).toHaveAttribute('href', 'https://ui.argo.grnet.gr/egi/termsofUse');
    expect(screen.getByText(/cookie/i).closest('a')).toHaveAttribute('href', '#')
  })
})
