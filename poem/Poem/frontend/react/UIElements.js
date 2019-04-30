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
import ArgoLogo from './argologo_color.svg';
import EULogo from './eu.png';
import EOSCLogo from './eosc.png';
import './UIElements.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';



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


const doLogout = (history, onLogout) =>
{
  let cookies = new Cookies();

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
(
  <Navbar expand="md" id="argo-nav" className="border rounded">
    <NavbarBrand className="text-light">
      <img src={ArgoLogo} alt="ARGO logo" className="img-responsive"/>
      <span className="pl-3">
        <strong>ARGO</strong> POEM
      </span>
    </NavbarBrand>
    <NavbarToggler/>
    <Collapse navbar className='justify-content-end'>
      <Nav navbar >
        <NavItem className='m-2 text-light'>
          Welcome, {localStorage.getItem('authUsername')}
        </NavItem>
        <NavItem className='m-2'>
          <Button 
            id="argo-navbar-logout"
            size="sm"
            onClick={() => doLogout(history, onLogout)}>
            <FontAwesomeIcon icon={faSignOutAlt} />
          </Button>
        </NavItem>
      </Nav>
    </Collapse>
  </Navbar>
)


export const NavigationLinks = ({location}) =>
{
  var list_pages = ['administration','services', 'reports', 'metricprofiles',
    'aggregationprofiles'];
  var link_title = new Map();

  link_title.set('administration', 'Administration');
  link_title.set('services', 'Services');
  link_title.set('reports', 'Reports');
  link_title.set('metricprofiles', 'Metric profiles');
  link_title.set('aggregationprofiles', 'Aggregation profiles');

  return (
    <Nav vertical id="argo-navlinks" className="border rounded">
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


const InnerFooter = ({border=false}) =>
(
  <React.Fragment>
    {
      border && <div className="pt-3"/>
    }
    <div className="text-center pt-1">
      <img src={EULogo} id="eulogo" alt="EU logo"/>
      <img src={EOSCLogo} id="eosclogo" alt="EOSC logo" className="pl-1"/>
    </div>
    <p className="text-center">
      <small>
        <strong>ARGO POEM</strong> is a service jointly developed and maintained by &nbsp; 
        <a href="http://www.cnrs.fr/" title="Centre national de la recherche scientifique">CNRS</a>, &nbsp; 
        <a href="https://grnet.gr/" title="Greek Research and Technology Network">GRNET</a> and &nbsp;
        <a href="http://www.srce.unizg.hr/" title="University computing centre">SRCE</a>&nbsp;
        co-funded by <a href="https://www.eosc-hub.eu" title="EOSC-Hub">EOSC-Hub</a> and &nbsp;
        <a href="http://www.egi.eu/" title="EGI.eu">EGI.eu</a>
        <br/>
        <a href="http://argo.egi.eu/lavoisier/TermsofUse" title="Terms of use">Terms of use</a>
        ,&nbsp; 
        <a href="http://www.apache.org/licenses/LICENSE-2.0" title="License">License</a>
      </small>
    </p>
  </React.Fragment>
)


export const Footer = ({addBorder=false}) =>
{
  if (addBorder) {
    return (
      <div id="argo-footer" className="border rounded">
        <InnerFooter border={addBorder}/>
      </div>
    )
  }
  else {
    return (
      <div id="argo-footer">
        <InnerFooter />
      </div>
    )
  }
}
