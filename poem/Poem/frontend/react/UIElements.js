import React from 'react';
import Cookies from 'universal-cookie';
import {
  Button, 
  Nav,
  NavLink,
  NavItem,
  NavbarBrand,
  Navbar,
  NavbarToggler,
  Collapse} from 'reactstrap';
import {Link} from 'react-router-dom';


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


const doLogout = (history, onLogout) =>
{
  let cookies = new Cookies();

  removeAuthData();
  onLogout();

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
    }}).then((response) => history.push('/ui/login'));
}


export const NavigationBar = ({history, onLogout}) =>
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
            onClick={() => doLogout(history, onLogout)}>
            Logout
          </Button>
        </NavItem>
      </Nav>
    </Collapse>
  </Navbar>


export const NavigationLinks = ({location}) =>
  {
    var list_pages = ['administration', 'reports', 'metricprofiles',
      'aggregationprofiles'];
    var link_title = new Map();

    link_title.set('administration', 'Administration');
    link_title.set('reports', 'Reports');
    link_title.set('metricprofiles', 'Metric profiles');
    link_title.set('aggregationprofiles', 'Aggregation profiles');

    return (
      <Nav vertical pills>
        {
          list_pages.map((item, i) =>  
            item === 'administration' && localStorage.getItem('authIsSuperuser') 
              ?
                <NavItem key={i}>
                  <NavLink
                    tag={Link}
                    active={location.pathname.includes(item) ? true : false} 
                    to={'/ui/' + item}>{link_title.get(item)}
                  </NavLink>
                </NavItem>
              :
                <NavItem key={i}>
                  <NavLink 
                    tag={Link}
                    active={location.pathname.includes(item) ? true : false} 
                    to={'/ui/' + item}>{link_title.get(item)}
                  </NavLink>
                </NavItem>
          )
        }
      </Nav>
    )
  }
