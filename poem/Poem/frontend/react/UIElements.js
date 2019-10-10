import React from 'react';
import Cookies from 'universal-cookie';
import {
  Alert,
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
import {
  faSignOutAlt, 
  faSearch, 
  faWrench, 
  faFileAlt, 
  faSitemap, 
  faCog, 
  faServer,
  faCogs,
  faHighlighter,
  faTasks,
  faKey} from '@fortawesome/free-solid-svg-icons';
import { NotificationManager } from 'react-notifications';
import { Field } from 'formik';


var list_pages = ['administration','services', 'reports', 'probes',
                  'metrics', 'metricprofiles', 'aggregationprofiles'];
var admin_list_pages = ['administration', 'probes', 'metrictemplates'];

var link_title = new Map();
link_title.set('administration', 'Administration');
link_title.set('services', 'Services');
link_title.set('reports', 'Reports');
link_title.set('probes', 'Probes');
link_title.set('metrics', 'Metrics');
link_title.set('metricprofiles', 'Metric profiles');
link_title.set('aggregationprofiles', 'Aggregation profiles');
link_title.set('groupofaggregations', 'Groups of aggregations');
link_title.set('groupofmetrics', 'Groups of metrics');
link_title.set('groupofmetricprofiles', 'Groups of metric profiles');
link_title.set('users', 'Users');
link_title.set('apikey', 'API key');
link_title.set('metrictemplates', 'Metric templates');

export const Icon = props =>
{
  let link_icon = new Map();
  link_icon.set('administration', faWrench);
  link_icon.set('services', faSitemap);
  link_icon.set('serviceflavour', faHighlighter);
  link_icon.set('reports', faFileAlt);
  link_icon.set('probes', faServer);
  link_icon.set('metrics', faCog);
  link_icon.set('metrictemplates', faCog);
  link_icon.set('metricprofiles', faCogs);
  link_icon.set('aggregationprofiles', faTasks);
  link_icon.set('apikey', faKey)

  return <FontAwesomeIcon icon={link_icon.get(props.i)} fixedWidth/>
}

export const DropDown = ({field, data=[], prefix="", class_name=""}) => 
  <Field component="select"
    name={prefix ? `${prefix}.${field.name}` : field.name}
    required={true}
    className={`form-control ${class_name}`}
  >
    {
      data.map((name, i) => 
        i === 0 ?
        <option key={i} hidden>{name}</option> :
        <option key={i} value={name}>{name}</option>
      )
    }
  </Field>


export const SearchField = ({form, field, ...rest}) => 
  <div className="input-group">
    <input type="text" placeholder="Search" {...field} {...rest}/>
    <div className="input-group-append">
      <span className="input-group-text" id="basic-addon">
        <FontAwesomeIcon icon={faSearch}/>
      </span>
    </div>
  </div>


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


export const CustomBreadcrumb = ({location, history}) => 
{
  let spliturl = location.pathname.split('/');
  let breadcrumb_elements = new Array();

  breadcrumb_elements.push({'url': '/ui/home', 'title': 'Home'});
  let two_level = new Object({'url': '/ui/' + spliturl[2]});
  two_level['title'] = link_title.get(spliturl[2]);
  breadcrumb_elements.push(two_level);

  if (spliturl.length > 3) {
    var three_level = new Object({'url': two_level['url'] + '/' + spliturl[3]});
    three_level['title'] = two_level['title'] === 'Administration' ? link_title.get(spliturl[3]) : spliturl[3];
    breadcrumb_elements.push(three_level)
  }

  if (spliturl.length > 4) {
    var four_level = new Object({'url': three_level['url'] + '/history'});
    four_level['title'] = spliturl[4];
    breadcrumb_elements.push(four_level)
  }

  if (spliturl.length > 5) {
    var five_level = new Object({'url': four_level['url'] + spliturl[5]});
    five_level['title'] = spliturl[5];
    breadcrumb_elements.push(five_level);
  }

  return (
    <Breadcrumb id='argo-breadcrumb' className="border-top rounded">
      {
        breadcrumb_elements.map((item, i) =>
          i !== breadcrumb_elements.length - 1 
          ?
            <BreadcrumbItem key={i}>
              <Link to={item['url']}>{item['title']}</Link>
            </BreadcrumbItem>
          :
            <BreadcrumbItem key={i} active>
              {item['title']}
            </BreadcrumbItem>
        )
      }
    </Breadcrumb>
  );
}


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


export const NavigationLinks = ({location, poemver}) => {
  var data = undefined;
  poemver === 'superadmin' ? data = admin_list_pages : data = list_pages

  return (
    <Nav vertical pills id="argo-navlinks" className="border-left border-right border-top rounded-top sticky-top">
        {
          data.map((item, i) =>  
            item === 'administration'
              ?
                localStorage.getItem('authIsSuperuser') === 'true'
                  ?
                    <NavItem key={i}>
                      <NavLink
                        tag={Link}
                        active={location.pathname.includes(item) ? true : false} 
                        className={location.pathname.includes(item) ? "text-white bg-info" : "text-dark"}
                        to={'/ui/' + item}><Icon i={item}/> {link_title.get(item)}
                      </NavLink>
                    </NavItem>
                  :
                    null
              :
                <NavItem key={i}>
                  <NavLink 
                    tag={Link}
                    active={location.pathname.split('/')[2] === item ? true : false} 
                    className={location.pathname.split('/')[2] === item ? "text-white bg-info" : "text-dark"}
                    to={'/ui/' + item}><Icon i={item}/> {link_title.get(item)}
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
(
  <Card className="text-center">
    <CardHeader className="bg-light">
      <h4 className="text-dark">Loading data...</h4>
    </CardHeader>
    <CardBody>
      <img src={ArgoLogoAnim} alt="ARGO logo anim" className="img-responsive" height="300px"/>
    </CardBody>
  </Card>
)


export const NotifyOk = ({msg='', title='', callback=undefined}) => {
  NotificationManager.success(msg,
    title,
    2000);
  setTimeout(callback, 2000);
} 


export const BaseArgoView = ({resourcename='', location=undefined, 
    infoview=false, addview=false, listview=false, modal=false, 
    state=undefined, toggle=undefined, submitperm=true, history=true, 
    addnew=true, children}) => 
(
  <React.Fragment>
    {
      modal && 
      <ModalAreYouSure 
        isOpen={state.areYouSureModal}
        toggle={toggle}
        title={state.modalTitle}
        msg={state.modalMsg}
        onYes={state.modalFunc} />
    }
    <div className="d-flex align-items-center justify-content-between">
      {
        infoview ?
          <h2 className="ml-3 mt-1 mb-4">{resourcename}</h2>
        :
          addview ? 
            <h2 className="ml-3 mt-1 mb-4">{`Add ${resourcename}`}</h2>
          :
            listview ?
              <React.Fragment>
                <h2 className="ml-3 mt-1 mb-4">{`Select ${resourcename} to change`}</h2>
                {
                  addnew &&
                    <Link className="btn btn-secondary" to={location.pathname + "/add"} role="button">Add</Link>
                }
              </React.Fragment>
            :
              <React.Fragment>
                <h2 className="ml-3 mt-1 mb-4">{`Change ${resourcename}`}</h2>
                {
                  history &&
                    <Link className="btn btn-secondary" to={location.pathname + "/history"} role="button">History</Link>
                }
              </React.Fragment>
      }
    </div>
    <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
      {
        !submitperm && !infoview && !listview &&
          <Alert color='danger'>
            <center>
              This is a read-only instance, please request the corresponding
              permissions to perform any changes in this form. 
            </center>
          </Alert>
      }
      {children}
    </div>
  </React.Fragment>
)

export const Checkbox = ({
  field: { name, value, onChange, onBlur },
  form: { errors, touched },
  id,
  label,
  ...props
}) => {
  return (
    <div>
      <input
        name={name}
        id={id}
        type='checkbox'
        value={value}
        checked={value}
        onChange={onChange}
        onBlur={onBlur}
      />
      <label htmlFor={id}>{label}</label>
      {touched[name] && errors[name] && <div className="error">{errors[name]}</div>}
    </div>
  );
};


export const FancyErrorMessage = (msg) => (
  <div style={{color: '#FF0000', fontSize: 'small'}}>{msg}</div>
)