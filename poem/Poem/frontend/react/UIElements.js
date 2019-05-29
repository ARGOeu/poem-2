import React from 'react';
import Cookies from 'universal-cookie';
import {
  Button, 
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardHeader,
  CardBody,
  Nav,
  NavLink,
  NavItem,
  NavbarBrand,
  Navbar,
  NavbarToggler,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Collapse} from 'reactstrap';
import {Link} from 'react-router-dom';
import ArgoLogo from './argologo_color.svg';
import ArgoLogoAnim from './argologo_anim.svg';
import EULogo from './eu.png';
import EOSCLogo from './eosc.png';
import './UIElements.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';


var list_pages = ['administration','services', 'reports', 'probes',
                  'metrics', 'metricprofiles', 'aggregationprofiles'];
var link_title = new Map();

link_title.set('administration', 'Administration');
link_title.set('services', 'Services');
link_title.set('reports', 'Reports');
link_title.set('probes', 'Probes');
link_title.set('metrics', 'Metrics');
link_title.set('metricprofiles', 'Metric profiles');
link_title.set('aggregationprofiles', 'Aggregation profiles');


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


export const ModalAreYouSure = ({isOpen, toggle, title, msg, onYes}) => 
(
  <Modal isOpen={isOpen} toggle={toggle}>
    <ModalHeader toggle={toggle}>{title}</ModalHeader>
    <ModalBody>
      {msg}
    </ModalBody>
    <ModalFooter>
      <Button color="primary" onClick={() => {
        onYes();
        toggle();
      }}>Yes</Button>{' '}
      <Button color="secondary" onClick={toggle}>No</Button>
    </ModalFooter>
  </Modal>
)


export const CustomBreadcrumb = (props) => {
  return (
    <Breadcrumb>
      <BreadcrumbItem active>
        <Link to="/ui/home">Home</Link>
      </BreadcrumbItem>
    </Breadcrumb>
  );
};


export const NavigationBar = ({history, onLogout, isOpenModal, toggle, titleModal, msgModal}) =>
(
  <React.Fragment>
    <ModalAreYouSure 
      isOpen={isOpenModal}
      toggle={toggle}
      title={titleModal}
      msg={msgModal}
      onYes={() => doLogout(history, onLogout)} />
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
              onClick={() => toggle()}>
              <FontAwesomeIcon icon={faSignOutAlt} />
            </Button>
          </NavItem>
        </Nav>
      </Collapse>
    </Navbar>
  </React.Fragment>
)


export const NavigationLinks = ({location}) =>
{

  return (
    <Nav vertical pills id="argo-navlinks" className="border-left border-right border-top rounded-top sticky-top">
      {
        list_pages.map((item, i) =>  
          item === 'administration' && localStorage.getItem('authIsSuperuser') 
            ?
              <NavItem key={i}>
                <NavLink
                  tag={Link}
                  active={location.pathname.includes(item) ? true : false} 
                  className={location.pathname.includes(item) ? "text-white bg-info" : "text-dark"}
                  to={'/ui/' + item}>{link_title.get(item)}
                </NavLink>
              </NavItem>
            :
              <NavItem key={i}>
                <NavLink 
                  tag={Link}
                  active={location.pathname.includes(item) ? true : false} 
                  className={location.pathname.includes(item) ? "text-white bg-info" : "text-dark"}
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


export const LoadingAnim = () =>
  <Card className="text-center">
    <CardHeader className="bg-light">
      <h4 className="text-dark">Loading data...</h4>
    </CardHeader>
    <CardBody>
      <img src={ArgoLogoAnim} alt="ARGO logo anim" className="img-responsive" height="300px"/>
    </CardBody>
  </Card>
