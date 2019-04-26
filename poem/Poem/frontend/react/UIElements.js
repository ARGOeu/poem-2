import React, { Component } from 'react';
import Cookies from 'universal-cookie';
import {
  Alert,
  Container,
  Button, 
  Row, 
  Col, 
  Nav,
  NavItem,
  NavLink,
  NavbarBrand,
  Navbar,
  NavbarToggler,
  Collapse} from 'reactstrap';


export function setAuthData(json) {
  localStorage.setItem('authUsername', json['username']);
  localStorage.setItem('authIsLogged', true);
  localStorage.setItem('authFirstName', json['first_name']);
  localStorage.setItem('authLastName', json['last_name']);
  localStorage.setItem('authIsSuperuser', json['is_superuser']);
}


function fetchUserDetails(username) {
  return fetch('/api/v2/internal/users/' + username, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
}


export function doLogin(username, password)
{
  return fetch('/rest-auth/login/', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Referer': 'same-origin'
    },
    body: JSON.stringify({
      'username': username, 
      'password': password
    })
  }).then(response => fetchUserDetails(username));
}


function removeAuthData()
{
  localStorage.removeItem('authUsername');
  localStorage.removeItem('authIsLogged');
  localStorage.removeItem('authFirstName');
  localStorage.removeItem('authLastName');
  localStorage.removeItem('authIsSuperuser');
}


const doLogout = ({history}) =>
{
  let cookies = new Cookies();

  removeAuthData();

  return fetch('/rest-auth/logout/', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': cookies.get('csrftoken'),
      'Referer': 'same-origin'
    }}).then(response => history.push('/ui/login'));
}


export const NavigationBar = ({props}) =>
  <Navbar color="light" dark expand="lg">
    <NavbarBrand>ARGO POEM</NavbarBrand>
    <NavbarToggler/>
    <Collapse navbar className='justify-content-end'>
      <Nav navbar >
        <NavItem className='m-2'>
          Welcome, {localStorage.getItem('authUsername')}
        </NavItem>
        <NavItem className='m-2'>
          <Button 
            color="secondary" 
            size="sm"
            outline
            onClick={() => doLogout(props)}>
            Logout
          </Button>
        </NavItem>
      </Nav>
    </Collapse>
  </Navbar>

export const NavigationLinks = ({active}) =>
  {
    var list_pages = ['administration', 'reports', 'metricprofiles',
      'aggregationprofiles'];
    var page_title = new Map();

    page_title.set('administration', 'Administration');
    page_title.set('reports', 'Reports');
    page_title.set('metricprofiles', 'Metric profiles');
    page_title.set('aggregationprofiles', 'Aggregation profiles');

    return (
      <Nav vertical pills>
        {
          list_pages.map((item, i) =>  
            item === 'administration' && localStorage.getItem('authIsSuperuser') 
              ?
                <NavItem key={i}>
                  <NavLink 
                    active={active === item ? true : false} 
                    href={'/ui/' + item}>{page_title.get(item)}
                  </NavLink>
                </NavItem>
              :
                <NavItem key={i}>
                  <NavLink 
                    active={active === item ? true : false} 
                    href={'/ui/' + item}>{page_title.get(item)}
                  </NavLink>
                </NavItem>
          )
        }
      </Nav>
    )
  }
