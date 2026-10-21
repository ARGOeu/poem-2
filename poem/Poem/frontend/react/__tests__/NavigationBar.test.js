import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { NavigationBar } from '../UIElements';

jest.mock('../DataManager', () => ({
  Backend: jest.fn(() => ({}))
}));

const renderNavbar = (isTenantSchema) =>
  render(
    <MemoryRouter>
      <NavigationBar
        onLogout={ () => {} }
        isOpenModal={ false }
        toggle={ () => {} }
        titleModal='Log out'
        msgModal='Are you sure you want to log out?'
        userDetails={ { username: 'testuser', first_name: '' } }
        isTenantSchema={ isTenantSchema }
        publicView={ false }
      />
    </MemoryRouter>
  );


describe('Tests for the navigation bar brand', () => {
  test('Test that tenant POEM brand marks Tenant in italics', () => {
    const { container } = renderNavbar(true);

    expect(screen.getByText('ARGO').closest('span')).toHaveTextContent(
      'ARGO TenantPOEM'
    );
    expect(container.querySelector('em')).toHaveTextContent('Tenant');
  })

  test('Test that SuperPOEM brand marks Super in italics', () => {
    const { container } = renderNavbar(false);

    expect(screen.getByText('ARGO').closest('span')).toHaveTextContent(
      'ARGO SuperPOEM'
    );
    expect(container.querySelector('em')).toHaveTextContent('Super');
  })
})
