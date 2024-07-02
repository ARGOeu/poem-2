import React, { useState, useEffect } from 'react';
import Cookies from 'universal-cookie';
import {
  Alert,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  ButtonToolbar,
  Col,
  Collapse,
  Container,
  FormGroup,
  FormText,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Nav,
  NavItem,
  NavLink,
  Navbar,
  NavbarBrand,
  NavbarToggler,
  Row,
  Popover,
  PopoverBody,
  Table,
  Pagination,
  PaginationItem,
  PaginationLink,
  Input,
  FormFeedback
} from 'reactstrap';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import ArgoLogo from './argologo_color.svg';
import EULogo from './eu.png';
import EOSCLogo from './eosc.png';
import './UIElements.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faBox,
  faBoxOpen,
  faCrosshairs,
  faCog,
  faCogs,
  faExclamation,
  faFileAlt,
  faGavel,
  faHandshake,
  faHighlighter,
  faIdBadge,
  faKey,
  faLink,
  faSearch,
  faServer,
  faSignOutAlt,
  faSquare,
  faTable,
  faTasks,
  faUser,
  faWrench,
  faNewspaper,
  faTags,
  faPlug
} from '@fortawesome/free-solid-svg-icons';
import { NotificationManager } from 'react-notifications';
import { Backend } from './DataManager';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { CookiePolicy } from './CookiePolicy';
import { useTable, usePagination, useFilters } from 'react-table';
import { Helmet } from 'react-helmet';
import Select, { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Controller, useFormContext } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { HistoryPlaceholder } from './Placeholders';

var list_pages = ['administration', 'probes',
                  'metrics', 'reports', 'servicetypes', 'metricprofiles', 'aggregationprofiles',
                  'thresholdsprofiles', 'operationsprofiles'];
var admin_list_pages = [ 'administration', 'tenants',
                        'yumrepos', 'packages', 'probes',
                        'metrictags', 'metrictemplates'];

var link_title = new Map();

link_title.set('administration', 'Administration');
link_title.set('aggregationprofiles', 'Aggregation profiles');
link_title.set('apikey', 'API key');
link_title.set('groupofreports', 'Groups of reports');
link_title.set('groupofaggregations', 'Groups of aggregations');
link_title.set('groupofmetricprofiles', 'Groups of metric profiles');
link_title.set('groupofmetrics', 'Groups of metrics');
link_title.set('groupofthresholdsprofiles', 'Groups of thresholds profiles');
link_title.set('metricprofiles', 'Metric profiles');
link_title.set('metrics', 'Metrics');
link_title.set("metrictags", "Metric tags")
link_title.set("public_metrictags", "Public metric tags")
link_title.set('metrictemplates', 'Metric templates');
link_title.set('operationsprofiles', 'Operations profiles');
link_title.set('packages', 'Packages');
link_title.set('probes', 'Probes');
link_title.set('public_aggregationprofiles', 'Public aggregation profiles');
link_title.set('public_metricprofiles', 'Public metric profiles');
link_title.set('public_metrics', 'Public metrics');
link_title.set('public_reports', 'Public reports');
link_title.set('public_metrictemplates', 'Public metric templates');
link_title.set('public_operationsprofiles', 'Public operations profiles');
link_title.set('cookiepolicies', 'Cookie policies');
link_title.set('public_probes', 'Public probes');
link_title.set('public_thresholdsprofiles', 'Public thresholds profiles');
link_title.set('reports', 'Reports');
link_title.set('servicetypes', 'Service types');
link_title.set('public_servicetypes', 'Public service types');
link_title.set('tenants', 'Tenants');
link_title.set('thresholdsprofiles', 'Thresholds profiles');
link_title.set('users', 'Users');
link_title.set('yumrepos', 'YUM repos');
link_title.set("metricoverrides", "Metric configuration overrides")
link_title.set("default_ports", "Default ports")
link_title.set("public_default_ports", "Public default ports")
link_title.set("probecandidates", "Probe candidates")


export const Icon = props =>
{
  let link_icon = new Map();
  link_icon.set('administration', faWrench);
  link_icon.set('serviceflavour', faHighlighter);
  link_icon.set('servicetypes', faHighlighter);
  link_icon.set('reports', faFileAlt);
  link_icon.set('probes', faServer);
  link_icon.set('metrics', faCog);
  link_icon.set("metrictags", faTags)
  link_icon.set('metrictemplates', faCog);
  link_icon.set('metricprofiles', faCogs);
  link_icon.set('aggregationprofiles', faTasks);
  link_icon.set('apikey', faKey);
  link_icon.set('yumrepos', faBoxOpen);
  link_icon.set('thresholdsprofiles', faExclamation);
  link_icon.set('users', faUser);
  link_icon.set('packages', faBox);
  link_icon.set('tenants', faIdBadge);
  link_icon.set('operationsprofiles', faTable);
  link_icon.set('policies', faGavel);
  link_icon.set('terms', faHandshake);
  link_icon.set('argodoc', faLink);
  link_icon.set('documentation', faBook);
  link_icon.set('privacy', faNewspaper);
  link_icon.set("default_ports", faPlug)

  if (props.i.startsWith('groupof'))
    return (
      <span className='fa-layers fa-fw'>
        <FontAwesomeIcon icon={faSquare} color='white' fixedWidth/>
        <FontAwesomeIcon icon={link_icon.get(props.i.replace('groupof', ''))} transform={`shrink-${props.i === 'groupofmetricprofiles' ? 9 : 8} up-3`}/>
        <FontAwesomeIcon icon={link_icon.get(props.i.replace('groupof', ''))} transform={`shrink-${props.i === 'groupofmetricprofiles' ? 9 : 8} down-4.2 left-5`}/>
        <FontAwesomeIcon icon={link_icon.get(props.i.replace('groupof', ''))} transform={`shrink-${props.i === 'groupofmetricprofiles' ? 9 : 8} down-4.2 right-5`}/>
      </span>
    )
  else
    return <FontAwesomeIcon icon={link_icon.get(props.i)} size={props.i === 'yumrepos' || props.i === 'metricprofiles' ? 'sm' : '1x'} fixedWidth/>
}


export const CustomDropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <svg
        height='10'
        width='10'
        viewBox='0 0 4 5'
        aria-hidden="true"
        focusable="false"
        style={{
          display: 'inline-block',
          fill: 'currentColor',
          lineHeight: 1,
          stroke: 'currentColor',
          strokeWidth: 0,
        }}
      >
        <path fill='#343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/>
      </svg>
    </components.DropdownIndicator>
  )
}


export const CustomReactSelect = ({ forwardedRef=undefined, ...props}) => {
  const customStyles = {
    control: (provided,  state) => ({
      ...provided,
      margin: props.inputgroup ? '-1px' : 0,
      backgroundColor: props.isDisabled ? '#e9ecef' : '#fff',
      overflow: 'visible',
      borderRadius: props.inputgroup ? '0 .25rem .25rem 0' : '.25rem',
      fontWeight: 400,
      backgroundClip: 'padding-box',
      textShadow: 'none',
      textAlign: 'start',
      textIndent: 0,
      borderColor: props.error ? '#dc3545' : props.isnew ? '#198754' : props.ismissing ? '#0d6efd' : state.selectProps.menuIsOpen ? '#66afe9' : '#ced4da',
      transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out',
      boxShadow: state.selectProps.menuIsOpen ? '0 0 0 .2rem rgba(0, 123, 255, .25)' : 'none',
      ':focus': {
        outline: 0,
      }
    }),
    option: (provided) => ({
      ...provided,
      padding: '.25rem 1.5rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      clear: 'both',
      color: '#16181b',
      backgroundColor: 'transparent',
      ':hover:not(:active)': {
        color: '#fff',
        backgroundColor: '#4a90d9'
      },
      ':active': {
        color: '#fff',
        backgroundColor: '#5a6268'
      },
      ':focus': {
        outline: '5px auto -webkit-focus-ring-color',
      },
    }),
    multiValue: (provided) => props.isDisabled ? { ...provided, backgroundColor: '#c4ccd4' } : provided,
    multiValueRemove: (provided) => props.isDisabled ? { ...provided, display: 'none' } : provided
  }
  const DropdownIndicator = ({ ...props }) => {
    if (props.isDisabled)
      return null

    else return (
      <CustomDropdownIndicator {...props} />
    )
  }

  if (props.label)
    return (
      <>
        <label id='aria-label' htmlFor='select'>{`${props.label}`}</label>
        <Select
          {...props}
          inputId='select'
          ref={ forwardedRef ? forwardedRef : null }
          components={{IndicatorSeparator: null, DropdownIndicator}}
          styles={customStyles}
        />
      </>
    )

  return (
    <Select
      {...props}
      ref={ forwardedRef ? forwardedRef : null }
      components={{IndicatorSeparator: null, DropdownIndicator}}
      styles={customStyles}
    />
  )
}


export const CustomReactCreatable = ({ forwardedRef=undefined, ...props}) => {
  const customStyles = {
    control: (provided,  state) => ({
      ...provided,
      margin: 0,
      backgroundColor: '#fff',
      overflow: 'visible',
      borderRadius: '.25rem',
      fontWeight: 400,
      backgroundClip: 'padding-box',
      textShadow: 'none',
      textAlign: 'start',
      textIndent: 0,
      borderColor: props.error ? '#dc3545' : "#ced4da",
      transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out',
      boxShadow: state.selectProps.menuIsOpen ? '0 0 0 .2rem rgba(0, 123, 255, .25)' : 'none',
      ':focus': {
        outline: 0,
      }
    }),
    option: (provided) => ({
      ...provided,
      padding: '.25rem 1.5rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      clear: 'both',
      color: '#16181b',
      backgroundColor: 'transparent',
      ':hover:not(:active)': {
        color: '#fff',
        backgroundColor: '#4a90d9'
      },
      ':active': {
        color: '#fff',
        backgroundColor: '#5a6268'
      },
      ':focus': {
        outline: '5px auto -webkit-focus-ring-color',
      },
    }),
    multiValue: (base, state) => {
      return (props.invalidValues && props.invalidValues.includes(state.data.value)) ? {...base, backgroundColor: '#f8d7da'} : base;
    },
    multiValueRemove: (provided) => provided
  }
  const DropdownIndicator = ({ ...props }) => {
    if (props.isDisabled)
      return null

    else return (
      <CustomDropdownIndicator {...props} />
    )
  }

  return (
    <CreatableSelect
      {...props}
      ref={ forwardedRef ? forwardedRef : null }
      components={{ IndicatorSeparator: null, DropdownIndicator }}
      styles={customStyles}
    />
  )
}

export const DropdownWithFormText = ({ forwardedRef=undefined, ...props }) => {
  return (
    <div className='react-select form-control p-0'>
      <CustomReactSelect
        name={ props.name }
        forwardedRef={ forwardedRef ? forwardedRef : null }
        inputId={ props.inputId ? props.inputId : null }
        id={ props.id ? props.id : props.name }
        isClearable={ props.isClearable }
        inputgroup={ true }
        error={ props.error }
        onChange={ props.onChange }
        options={ props.options.map(option => new Object({ label: option, value: option })) }
        value={ props.value ? { label: props.value, value: props.value } : undefined }
      />
    </div>
  )
}


export const SearchField = ({field, forwardedRef=undefined, ...rest}) =>
  <div className="input-group">
    <input type="text" placeholder="Search" ref={forwardedRef ? forwardedRef : null} {...field} {...rest}/>
    <span className="input-group-text" id="basic-addon">
      <FontAwesomeIcon icon={faSearch}/>
    </span>
  </div>


const doLogout = async (navigate, onLogout) => {
  let cookies = new Cookies();

  onLogout();

  let response = await fetch('/dj-rest-auth/logout/', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': cookies.get('csrftoken'),
      'Referer': 'same-origin'
    }});
    if (response.ok)
      navigate('/ui/login');
}


export const ModalAreYouSure = ({isOpen, toggle, title, msg, onYes, callbackOnYesArg=undefined}) =>
(
  <Modal isOpen={isOpen} toggle={toggle}>
    <ModalHeader toggle={toggle}>{title}</ModalHeader>
    <ModalBody>
      {msg}
    </ModalBody>
    <ModalFooter>
      <Button color="primary" onClick={() => {
        callbackOnYesArg ? onYes(callbackOnYesArg) : onYes(callbackOnYesArg);
        toggle();
      }}>Yes</Button>{' '}
      <Button color="secondary" onClick={toggle}>No</Button>
    </ModalFooter>
  </Modal>
)


export const CustomBreadcrumb = ({publicView=false}) =>
{
  const location = useLocation();
  let spliturl = new Array()
  let breadcrumb_elements = new Array()
  let two_level = new Object()

  breadcrumb_elements.push({'url': `/ui/${publicView ? 'public_' : ''}home`, 'title': 'Home'});
  if (!publicView)
    spliturl = location.pathname.split('/');

  else
    spliturl = window.location.pathname.split('/');

  two_level['url'] = '/ui/' + spliturl[2];
  two_level['title'] = link_title.get(spliturl[2]);
  breadcrumb_elements.push(two_level);

  if (spliturl.length > 3) {
    var three_level = new Object({'url': two_level['url'] + '/' + spliturl[3]});
    three_level['title'] = two_level['title'] === 'Administration' ? link_title.get(spliturl[3]) : spliturl[3];
    breadcrumb_elements.push(three_level)
  }

  if (spliturl.length > 4) {
    var four_level = new Object({'url': three_level['url'] + '/' + spliturl[4]});
    four_level['title'] = spliturl[4];
    breadcrumb_elements.push(four_level)
  }

  if (spliturl.length > 5) {
    var five_level = new Object({'url': four_level['url'] + '/' + spliturl[5]});
    five_level['title'] = spliturl[5];
    breadcrumb_elements.push(five_level);
  }

  if (spliturl.length > 6 && five_level['title'] === 'history') {
    var six_level = new Object({'url': five_level['url'] + '/' + spliturl[6]});
    six_level['title'] = spliturl[6];
    breadcrumb_elements.push(six_level);
  }

  return (
    <Breadcrumb id='argo-breadcrumb' className="rounded">
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


const UserDetailsToolTip = ({userDetails, isTenantSchema, publicView}) =>
{
  const NoPermBadge = ({only=false}) =>
    only ?
      <div className="text-center">
        <Badge color="dark" className="mb-1 mt-1" style={{fontSize: '100%'}}>
          No permissions
        </Badge>
      </div>
    :
      <Badge color="dark" className="mb-1 mt-1">
        No permissions
      </Badge>

  const GroupBadge = ({name}) =>
    <span>
      <Badge color="primary" className="mb-1 mt-1">
        {name}
      </Badge>{' '}
    </span>

  const WhiteRuler = () =>
    <div>
      <hr style={{'borderTop': '1px solid black'}}/>
    </div>

  const HaveAnyPerm = (groups) => {
    let havePerm = false

    for (var group in groups) {
      if (groups[group].length > 0) {
        havePerm = true
        break
      }
    }
    return havePerm
  }


  return (
    publicView ?
      <div>
        <div>
          <Badge color="warning" style={{fontSize: "100%"}} pill>
            Anonymous User
          </Badge>
        </div>
        <WhiteRuler/>
        <NoPermBadge only={true}/>
      </div>
    :
      <div>
        <div className="text-center">
          {
            userDetails.is_superuser ?
              <Badge color="danger" className="mt-2 mb-2" style={{fontSize: "100%"}} pill>
                {
                  isTenantSchema
                    ? 'Tenant Admin'
                    : 'Super Admin'
                }
              </Badge>
              :
              <Badge color="success" className="mt-2 mb-2" style={{fontSize: "100%"}} pill>
                Tenant User
              </Badge>
          }
        </div>
        {
          userDetails.first_name &&
          <div className="text-center">
            <b>{userDetails.first_name}{' '}{userDetails.last_name}</b>
          </div>
        }
        {
          <div className="text-center text-primary">
            {
              !userDetails.first_name ?
                <br/>
              :
                null
            }
            {userDetails.email}
          </div>
        }
        {
          userDetails.is_superuser ?
            null
          :
            HaveAnyPerm(userDetails.groups) ?
              <div>
                <WhiteRuler/>
                <div className="text-left">
                  Reports:
                  <br/>
                  {
                    userDetails.groups.reports.length > 0
                      ?
                        userDetails.groups.reports.map((group, index) => (
                          <GroupBadge name={group} key={index}/>
                        ))
                      :
                        <NoPermBadge/>
                  }
                </div>
                <div className="text-left">
                  Aggregation profiles:
                  <br/>
                  {
                    userDetails.groups.aggregations.length > 0
                      ?
                        userDetails.groups.aggregations.map((group, index) => (
                          <GroupBadge name={group} key={index}/>
                        ))
                      :
                        <NoPermBadge/>
                  }
                </div>
                <div className="text-left">
                  Metrics:
                  <br/>
                  {
                    userDetails.groups.metrics.length > 0
                      ?
                        userDetails.groups.metrics.map((group, index) => (
                          <GroupBadge name={group} key={index}/>
                        ))
                      :
                        <NoPermBadge/>
                  }
                </div>
                <div className="text-left">
                  Metric profiles:
                  <br/>
                  {
                    userDetails.groups.metricprofiles.length > 0
                      ?
                        userDetails.groups.metricprofiles.map((group, index) => (
                          <GroupBadge name={group} key={index}/>
                        ))
                      :
                        <NoPermBadge/>
                  }
                </div>
                <div className="text-left">
                  Thresholds profiles:
                  <br/>
                  {
                    userDetails.groups.thresholdsprofiles.length > 0
                      ?
                        userDetails.groups.thresholdsprofiles.map((group, index) => (
                          <GroupBadge name={group} key={index}/>
                        ))
                      :
                        <NoPermBadge/>
                  }
                </div>
              </div>
            :
              <div>
                <WhiteRuler/>
                <NoPermBadge only={true}/>
              </div>
        }
      </div>
  )
}


export const NavigationBar = ({onLogout, isOpenModal, toggle,
  titleModal, msgModal, userDetails, isTenantSchema, publicView}) =>
{
  const [tooltipOpen, setTooltipOpen] = useState(false);
  let navigate = useNavigate();

  return (
    <React.Fragment>
      <ModalAreYouSure
        isOpen={isOpenModal}
        toggle={toggle}
        title={titleModal}
        msg={msgModal}
        onYes={() => doLogout(navigate, onLogout)} />
      <Navbar expand="md" id="argo-nav" className="border rounded">
        <NavbarBrand className="text-light">
          <img src={ArgoLogo} alt="ARGO logo" className="img-responsive"/>
          <span className="ps-3">
            <strong>ARGO</strong> POEM
          </span>
        </NavbarBrand>
        <NavbarToggler/>
        <Collapse navbar className='justify-content-end'>
          <Nav navbar >
            <NavItem className='m-2 ms-5 text-light'>
              Welcome,&nbsp;
              <span onClick={() => setTooltipOpen(!tooltipOpen)}
                className='font-weight-bold' href="#" id="userToolTip">
                <Badge href="#" color="dark" style={{fontSize: '100%'}}>
                  {userDetails.first_name ? userDetails.first_name : userDetails.username}
                </Badge>
              </span>
              <Popover style={{opacity: 0.9}} placement="bottom" isOpen={tooltipOpen}
                target="userToolTip" toggle={() => setTooltipOpen(!tooltipOpen)}>
                <PopoverBody>
                  <UserDetailsToolTip userDetails={userDetails} isTenantSchema={isTenantSchema} publicView={publicView}/>
                </PopoverBody>
              </Popover>
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
}


export const NavigationLinks = ({isTenantSchema, userDetails}) => {
  var data = undefined;
  const location = useLocation();

  !isTenantSchema ? data = admin_list_pages : data = list_pages
  if (!userDetails.is_superuser)
    data = data.filter(e => e !== 'administration')

  return (
    <Nav vertical pills id="argo-navlinks" className="border-left border-right border-top rounded-top sticky-top">
      {
        data.map((item, i) =>
          <NavLink
            key={i}
            tag={Link}
            active={location.pathname.split('/')[2] === item ? true : false}
            className={location.pathname.split('/')[2] === item ? "text-white bg-secondary" : "text-dark"}
            to={'/ui/' + item}><Icon i={item}/> {link_title.get(item)}
          </NavLink>
        )
      }
    </Nav>
    )
}


export const NavigationAbout = ({ poemVersion, termsLink, privacyLink }) => {
  const location = useLocation();

  return (
    <React.Fragment>
      <div className="bg-white border-left border-right ps-3 mt-0 pt-5 text-uppercase">
        <h5>Info</h5>
      </div>
      <Nav vertical pills id="argo-navlinks" className="border-left border-right sticky-top rounded-bottom border-bottom pb-2 mb-0">
        <NavLink
          tag="a"
          href='http://argoeu.github.io/poem/v1/'
          className="text-dark"
          target="_blank" rel="noopener noreferrer"
        >
          <Icon i="documentation"/>{' '}
          Documentation
        </NavLink>
        <NavLink
          tag="a"
          href='http://argoeu.github.io/overview'
          className="text-dark"
          target="_blank" rel="noopener noreferrer"
        >
          <Icon i="argodoc"/>{' '}
          About ARGO
        </NavLink>
        <NavLink
          tag="a"
          href={termsLink}
          className="text-dark"
          target="_blank" rel="noopener noreferrer"
        >
          <Icon i="terms"/>{' '}
          Terms
        </NavLink>
        <NavLink
          tag={Link}
          active={location.pathname.split('/')[2] === 'policies' ? true : false}
          className={location.pathname.split('/')[2] === 'policies' ? "text-white bg-info" : "text-dark"}
          to="/ui/cookiepolicies"
        >
          <Icon i="policies"/>{' '}
          Cookie Policies
        </NavLink>
        <NavLink
          tag="a"
          href={privacyLink}
          className='text-dark'
          target='_blank' rel='noopener noreferrer'
        >
          <Icon i='privacy'/> {' '}
          Privacy policy
        </NavLink>
        <NavLink
          tag="a"
          href='#'
          className="text-dark fst-italic font-monospace"
        >
          <FontAwesomeIcon icon={faCrosshairs} size="1x" color="green" fixedWidth/>{' '}
          <small> { poemVersion } </small>
        </NavLink>
      </Nav>
    </React.Fragment>
  )
}


const InnerFooter = ({ termsLink, privacyLink, border=false, publicPage=false}) =>
{
  const [modal, setModal] = useState(false);
  const toggle = () => setModal(!modal);

  return (
    <React.Fragment>
      {
        border && <div className="pt-1"/>
      }
      <div className="text-center pt-0 pb-2">
        <img src={EULogo} id="eulogo" alt="EU logo"/>
        <img src={EOSCLogo} id="eosclogo" alt="EOSC logo" className="ps-1"/>
      </div>
      <p className={`text-center ${publicPage ? 'mb-0' : 'mb-0 pb-1'}`}>
        <small>
          <strong>ARGO POEM</strong> is a service jointly developed and maintained by &nbsp;
          <a href="http://www.cnrs.fr/" title="Centre national de la recherche scientifique">CNRS</a>, &nbsp;
          <a href="https://grnet.gr/" title="Greek Research and Technology Network">GRNET</a> and &nbsp;
          <a href="http://www.srce.unizg.hr/" title="University computing centre">SRCE</a>&nbsp;
          co-funded by <a href="https://www.eosc-hub.eu" title="EOSC-Hub">EOSC-Hub</a> and &nbsp;
          <a href="http://www.egi.eu/" title="EGI.eu">EGI.eu</a>
        </small>
      </p>
      {
        publicPage &&
        <div className="text-center mb-0 pt-0">
          <small>
            <a href={termsLink} target="_blank" rel="noopener noreferrer" title="Terms">Terms</a>, &nbsp;
            <a href='#' title="Cookie Policies" onClick={toggle}>Cookie Policies</a>, &nbsp;
            <a title='Privacy Policy' href={privacyLink} target='_blank' rel='noopener noreferrer'>Privacy Policy</a>
          </small>
          <Modal isOpen={modal} toggle={toggle} size="lg">
            <ModalBody className="p-0">
              <CookiePolicy fromModal={true}/>
            </ModalBody>
          </Modal>
        </div>
      }
    </React.Fragment>
  )
}


export const Footer = ({ termsLink, privacyLink, loginPage=false, publicPage=false}) =>
{
  if (!loginPage) {
    return (
      <div id="argo-footer" className="border rounded">
        <InnerFooter border={true} publicPage={publicPage} termsLink={termsLink} privacyLink={privacyLink}/>
      </div>
    )
  }
  else {
    return (
      <div id="argo-loginfooter">
        <InnerFooter publicPage={true} termsLink={termsLink} privacyLink={privacyLink}/>
      </div>
    )
  }
}


export const NotifyOk = ({msg='', title='', callback=undefined}) => {
  NotificationManager.success(msg,
    title,
    2000);
  setTimeout(callback, 2000);
}


export const NotifyError = ({msg='', title=''}) => {
  msg = <div>
    <p>{msg}</p>
    <p>Click to dismiss.</p>
  </div>
  NotificationManager.error(msg, title, 0, () => true);
};


export const NotifyWarn = ({msg='', title=''}) => {
  let msg_list = msg.split("\n")
  if (msg_list.length === 1)
    msg = <div>
      <p>{msg}</p>
      <p>Click to dismiss.</p>
    </div>
  
  else
    msg = <div>
      <p>{ msg_list[0] }</p>
      <p>{ msg_list[1] }</p>
      <p>Click to dismiss.</p>
    </div>

  NotificationManager.warning(msg, title, 0, () => true);
};


export const NotifyInfo = ({msg='', title=''}) => {
  msg = <div>
    <p>{msg}</p>
    <p>Click to dismiss.</p>
  </div>
  NotificationManager.info(msg, title, 0, () => true);
};


export const PublicPage = ({privacyLink, termsLink, children}) => {
  let userDetails = {
    username: 'Anonymous'
  }

  return (
    <Container fluid>
      <DocumentTitle publicView={true}/>
      <Row>
        <Col>
          <NavigationBar
            history={undefined}
            onLogout={undefined}
            isOpenModal={undefined}
            toggle={() => {}}
            titleModal='Log out'
            msgModal='Are you sure you want to log out?'
            userDetails={userDetails}
            publicView={true}
          />
        </Col>
      </Row>
      <Row className="g-0">
        <Col>
          <CustomBreadcrumb publicView={true}/>
          {children}
        </Col>
      </Row>
      <Row>
        <Col>
          {
            <Footer privacyLink={privacyLink} termsLink={termsLink} loginPage={false} publicPage={true}/>
          }
        </Col>
      </Row>
    </Container>
  )
}


export const BaseArgoView = ({resourcename='', location=undefined,
  infoview=false, addview=false, listview=false, modal=false, state=undefined,
  toggle=undefined, submitperm=true, history=true, addnew=true, clone=false,
  cloneview=false, tenantview=false, publicview=false, addperm=true,
  extra_button=undefined, title=undefined,
  children}) =>
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
          <h2 className="ms-3 mt-1 mb-4">{resourcename}</h2>
        :
          addview ?
            <React.Fragment>
              <h2 className="ms-3 mt-1 mb-4">{`Add ${resourcename}`}</h2>
              { extra_button }
            </React.Fragment>
          :
            listview ?
              <React.Fragment>
                {
                  addnew ?
                    <h2 className="ms-3 mt-1 mb-4">{ title ? title : `Select ${resourcename} to change`}</h2>
                  :
                    <h2 className='ms-3 mt-1 mb-4'>{title ? title : `Select ${resourcename} for details`}</h2>
                }
                {
                  (addnew && addperm) &&
                    <>
                      { extra_button }
                      <Link className="btn btn-secondary" to={location.pathname + "/add"} role="button">Add</Link>
                    </>
                }
                {
                  (addnew && !addperm) &&
                    <Button
                      className='btn btn-secondary'
                      onClick={() => NotifyError({
                        title: 'Not allowed',
                        msg: `You do not have permission to add ${resourcename}.`
                      })}
                    >
                      Add
                    </Button>
                }
              </React.Fragment>
            :
              cloneview ?
                <React.Fragment>
                  <h2 className="ms-3 mt-1 mb-4">{`Clone ${resourcename}`}</h2>
                </React.Fragment>
              :
                (tenantview || publicview) ?
                  <React.Fragment>
                    <h2 className="ms-3 mt-1 mb-4">{resourcename}</h2>
                    {
                      history &&
                        <Link className="btn btn-secondary" to={location.pathname + "/history"} role="button">History</Link>
                    }
                  </React.Fragment>
                :
                  <React.Fragment>
                    <h2 className="ms-3 mt-1 mb-4">{`Change ${resourcename}`}</h2>
                    <ButtonToolbar>
                      <div className='p-1'>
                        { extra_button }
                      </div>
                      {
                          clone && !publicview &&
                            <div className='p-1'>
                              <Link className="btn btn-secondary me-2" to={location.pathname + "/clone"} role="button">Clone</Link>
                            </div>
                      }
                      {
                          history && !publicview &&
                            <div className='p-1'>
                              <Link className="btn btn-secondary" to={location.pathname + "/history"} role="button">History</Link>
                            </div>
                      }
                    </ButtonToolbar>
                  </React.Fragment>
      }
    </div>
    <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
      {
        !submitperm && !infoview && !listview && !publicview &&
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


export const CustomError = (props) => (
  <div data-testid='error-msg' className="end-0" style={{color: '#dc3545', fontSize: 'small'}}>{props.error}</div>
)


export const DropdownFilterComponent = ({value, onChange, data}) => (
  <select
    onChange={onChange}
    style={{width: '100%'}}
    value={value}
  >
    <option key={0} value=''>Show all</option>
    {
      data.map((name, i) =>
        <option key={i + 1} value={name}>{name}</option>
      )
    }
  </select>
)


export const HistoryComponent = (props) => {
  let { name } = useParams();  
  const navigate = useNavigate();
  const publicView = props.publicView
  const tenantView = props.tenantView;
  const obj = props.object;

  const [loading, setLoading] = useState(false);
  const [listVersions, setListVersions] = useState(null);
  const [compare1, setCompare1] = useState('');
  const [compare2, setCompare2] = useState('');
  const [error, setError] = useState(null);

  var apiUrl = undefined;
  if (['metric', 'metricprofile', 'aggregationprofile', 'thresholdsprofile'].includes(obj))
    apiUrl = `/api/v2/internal/${publicView ? 'public_' : ''}tenantversion`;
  else
    apiUrl = `/api/v2/internal/${publicView ? 'public_' : ''}version`;

  const compareUrl = `/ui/${tenantView ? 'administration/' : ''}${publicView ? 'public_' : ''}${obj}s/${name}/history`;

  useEffect(() => {
    const backend = new Backend();
    setLoading(true);

    async function fetchData() {
      try {
        let json = await backend.fetchData(`${apiUrl}/${obj}/${name}`);
        setListVersions(json);

        if (json.length > 1) {
          setCompare1(json[0].version);
          setCompare2(json[1].version);
        }
      } catch(err) {
        setError(err);
      }
      setLoading(false);
    }

    fetchData();
  }, [obj, name, apiUrl]);

  if (loading) {
    return (
      <HistoryPlaceholder />
    )
  }

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listVersions) {
    return (
      <BaseArgoView
        resourcename='Version history'
        infoview={true}>
        <table className='table table-sm'>
          <thead className='table-active'>
            <tr>
              { listVersions.length === 1 ?
                <th scope='col'>Compare</th>
                :
                <th scope='col'>
                  <Button
                      color='info'
                      onClick={() =>
                        navigate(
                          `${compareUrl}/compare/${compare1}/${compare2}`,
                      )
                      }
                    >
                    Compare
                  </Button>
                </th>
                }
              <th scope='col'>Version</th>
              <th scope='col'>Date/time</th>
              <th scope='col'>User</th>
              <th scope='col'>Comment</th>
            </tr>
          </thead>
          <tbody>
            {
                listVersions.map((e, i) =>
                  <tr key={i}>
                    {
                      listVersions.length === 1 ?
                        <td>-</td>
                      :
                        i === 0 ?
                          <td>
                            <input
                            type='radio'
                            name='radio-1'
                            value={e.version}
                            defaultChecked={true}
                            onChange={e => setCompare1(e.target.value)}
                          />
                          </td>
                        :
                          <td>
                            <input
                            type='radio'
                            name='radio-1'
                            value={e.version}
                            onChange={e => setCompare1(e.target.value)}
                          />
                            {' '}
                            <input
                            type='radio'
                            name='radio-2'
                            value={e.version}
                            defaultChecked={i===1}
                            onChange={e => setCompare2(e.target.value)}
                          />
                          </td>
                    }
                    {
                      <td>
                        {e.version ? <Link to={`${compareUrl}/${e.version}`}>{e.version}</Link> : ''}
                      </td>
                    }
                    <td>
                      {e.date_created ? e.date_created : ''}
                    </td>
                    <td>
                      {e.user ? e.user : ''}
                    </td>
                    <td className='col-md-6'>
                      {e.comment ? e.comment : ''}
                    </td>
                  </tr>
                )
              }
          </tbody>
        </table>
      </BaseArgoView>
    );
  } else
    return null;
};


export const DiffElement = ({title, item1, item2}) => {
  if (!Array.isArray(item1) && !Array.isArray(item2)) {
    item1 = item1.split('\r\n');
    item2 = item2.split('\r\n');
  }

  let n = Math.max(item1.length, item2.length);

  if (item1.length > item2.length) {
    for (let i=item2.length; i < item1.length; i++) {
      item2.push(' ');
    }
  } else if (item2.length > item1.length) {
    for (let i=item1.length; i < item2.length; i++) {
      item1.push(' ');
    }
  }

  const elements = [];
  for (let i = 0; i < n; i++) {
    elements.push(
      <ReactDiffViewer
      oldValue={item2[i]}
      newValue={item1[i]}
      showDiffOnly={true}
      splitView={false}
      hideLineNumbers={true}
      disableWordDiff={true}
      key={'diff-' + i}
    />
    );
  }

  return (
    <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      {elements}
    </div>
  );
};


export const ProfileMain = ({
  grouplist=undefined,
  description=undefined,
  fieldsdisable=false,
  profiletype=undefined,
  addview=false
}) => {
  const { control, setValue, clearErrors, formState: { errors } } = useFormContext()

  return (
    <FormGroup>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupText>Name</InputGroupText>
            <Controller
              name="name"
              control={ control }
              render={ ({ field }) =>
                <Input
                  { ...field }
                  data-testid="name"
                  className={ `form-control form-control-lg ${errors?.name && "is-invalid"}` }
                  disabled={ !addview }
                />
              }
            />
            <ErrorMessage
              errors={ errors }
              name="name"
              render={ ({ message }) =>
                <FormFeedback invalid="true" className="end-0">
                  { message }
                </FormFeedback>
              }
            />
          </InputGroup>
          <FormText color='text-muted'>
            { `Name of ${profiletype} profile` }
          </FormText>
        </Col>
      </Row>
      {
        description &&
          <Row className='mt-3'>
            <Col md={10}>
              <Label for="profileDescription">Description:</Label>
              <Controller
                name={ description }
                control={ control }
                render={ ({ field }) =>
                  <textarea
                    { ...field }
                    id="profileDescription"
                    className="form-control"
                    rows={ 4 }
                    disabled={ fieldsdisable }
                  />
                }
              />
              <FormText color="muted">
                Free text description outlining the purpose of this profile.
              </FormText>
            </Col>
          </Row>
      }
      <Row className='mt-4'>
        <Col md={3}>
          <InputGroup>
            <InputGroupText>Group</InputGroupText>
            <Controller
              name="groupname"
              control={ control }
              render={ ({ field }) =>
                fieldsdisable ?
                  <Input
                    { ...field }
                    data-testid="groupname"
                    className="form-control"
                    disabled={ true }
                  />
                :
                  <DropdownWithFormText
                    forwardedRef={ field.ref }
                    error={ errors?.groupname }
                    options={ grouplist }
                    value={ field.value }
                    onChange={ e => {
                      setValue("groupname", e.value)
                      clearErrors("groupname")
                    }}
                  />
              }
            />
          </InputGroup>
          <CustomError error={ errors.groupname?.message } />
          <FormText color="muted">
            { `${profiletype.charAt(0).toUpperCase() + profiletype.slice(1)} profile is member of given group.` }
          </FormText>
        </Col>
      </Row>
    </FormGroup>
  )
}


export const ErrorComponent = ({error}) => {
  let errors = [];
  error.toString().split('; ').forEach((e, i) => {
    if (i === 0)
      errors.push(<h3 key={i}>{e}</h3>)
    else
      errors.push(<p key={i}>{e}</p>)

  })

  return (
    <React.Fragment>
      <h1>Something went wrong</h1>
      {errors}
    </React.Fragment>
  )
}


export const ParagraphTitle = ({title}) => (
  <h4 className="mt-2 p-1 ps-3 text-uppercase rounded" style={{"backgroundColor": "#c4ccd4"}}>{title}</h4>
)


export const DefaultColumnFilter = ({column: { filterValue, setFilter }}) => {
  return (
    <div className="input-group">
      <input className="form-control"
        type="text"
        placeholder="Search"
        value={filterValue || ''}
        onChange={e => {setFilter(e.target.value || undefined)}}
      />
      <span className="input-group-text" id="basic-addon">
        <FontAwesomeIcon icon={faSearch}/>
      </span>
    </div>
  )
};


export const SelectColumnFilter = ({column: { filterValue, setFilter, filterList }}) => {
  const options = React.useMemo(() => filterList);

  return (
    <select
      className='form-control form-select'
      style={{width: '100%'}}
      value={filterValue}
      onChange={e => setFilter(e.target.value || undefined)}
    >
      <option value=''>Show all</option>
      {
        options.map((option, i) => (
          <option key={i} value={option}>{option}</option>
        ))
      }
    </select>
  )
};


export function BaseArgoTable({ columns, data, resourcename, page_size, filter=false, selectable=false }) {
  const defaultColumn = React.useMemo(
    () => ({
      centering: false
    }),
    []
  )
  const {
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: page_size },
      defaultColumn
    },
    useFilters,
    usePagination
  );

  var n_elem = 0;

  if (page.length % pageSize > 0)
    n_elem = pageSize - (page.length % pageSize);

  let table_body = undefined;

  if (page.length === 0) {
    let n1 = Math.ceil(pageSize / 2);
    table_body = <tbody>
      {
        [...Array(pageSize)].map((e, i) => {
          return (
            <tr key={i}>
              {
                i === n1 - 1 ?
                  <td colSpan={columns.length} style={{height: '49px'}} className='align-middle text-center text-muted'>{`No ${resourcename}`}</td>
                :
                  [...Array(columns.length)].map((e, j) =>
                    <td style={{height: '49px'}} key={j} className='align-middle'>{''}</td>
                  )
              }
            </tr>
          )
        })
      }
    </tbody>
  } else {
    table_body = <tbody>
      {
        page.map((row, row_index) => {
          prepareRow(row);
          return (
            <tr key={row_index} style={{height: '49px'}}>
              {
                row.cells.map((cell, cell_index) => {
                  if (cell_index === 0 && !selectable)
                    return <td key={cell_index} className='align-middle text-center'>{(row_index + 1) + (pageIndex * pageSize)}</td>
                  else
                    return <td key={cell_index} style={{overflowWrap: 'anywhere'}} className='align-middle'>{cell.render('Cell')}</td>
                })
              }
            </tr>
          )
        })
      }
      {
        [...Array(n_elem)].map((e, i) => {
          return (
            <tr key={page.length + i} style={{height: '49px'}}>
              {
                [...Array(columns.length)].map((e, j) => {
                  return <td key={j} className='align-middle'>{''}</td>
                })
              }
            </tr>
          )
        })
      }
    </tbody>
  }

  return (
    <>
      <Table className='table table-bordered table-hover'>
        <thead className='table-active align-middle text-center'>
          {
            headerGroups.map((headerGroup, thi) => (
              <React.Fragment key={thi}>
                <tr>
                  {
                    headerGroup.headers.map((column, tri) => {
                      return (
                        <th style={{width: column.column_width}} className='p-1 m-1' key={tri}>
                          {column.render('Header')}
                        </th>
                      )
                    })
                  }
                </tr>
                {
                  filter &&
                    <tr className='p-0 m-0'>
                      {headerGroup.headers.map((column, tri) => {
                        if (tri === 0) {
                          if (selectable)
                            return (
                              <th className="p-1 m-1 align-middle" key={tri + 11}>
                                {column.render('Filter')}
                              </th>
                            )
                          else
                            return(
                              <th className="p-1 m-1 align-middle" key={tri + 11}>
                                <FontAwesomeIcon icon={faSearch}/>
                              </th>
                            )
                        } else {
                          return (
                            <th className="p-1 m-1" key={tri + 11}>
                              {column.canFilter ? column.render('Filter') : null}
                            </th>
                          )
                        }
                      })}
                    </tr>
                }
              </React.Fragment>
            ))
          }
        </thead>
        {table_body}
      </Table>
      <Row>
        <Col className='d-flex justify-content-center'>
          <Pagination>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink first onClick={() => gotoPage(0)}/>
            </PaginationItem>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink previous onClick={() => previousPage()}/>
            </PaginationItem>
            {
              [...Array(pageCount)].map((e, i) =>
                <PaginationItem key={i} active={pageIndex === i ? true : false}>
                  <PaginationLink onClick={() => gotoPage(i)}>
                    { i + 1 }
                  </PaginationLink>
                </PaginationItem>
              )
            }
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink next onClick={() => nextPage()}/>
            </PaginationItem>
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink last onClick={() => gotoPage(pageCount - 1)}/>
            </PaginationItem>
            <PaginationItem className='ps-2'>
              <select
                style={{width: '180px'}}
                className='form-select text-primary'
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                {[5, 10, 15, 20, 30, 50, 100].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} {`${resourcename}`}
                  </option>
                ))}
              </select>
            </PaginationItem>
          </Pagination>
        </Col>
      </Row>
    </>
  );
}


export const ProfilesListTable = ({ columns, data, type }) => {
  return (
    <BaseArgoTable
      columns={columns}
      data={data}
      resourcename={`${type} profiles`}
      page_size={10}
    />
  );
};


export const DocumentTitle = ({ publicView=false }) => {
  let url = new Array();
  const location = useLocation();

  if (!publicView)
    url = location.pathname.split('/');

  else
    url = window.location.pathname.split('/');

  const ui_index = url.indexOf('ui');
  url = url.slice(ui_index + 1, url.length);

  if (publicView && url[0] === 'public_home')
    url[0] = 'Public home';

  else
    url[0] = link_title.get(url[0]);

  if (url.length > 1 && url[0] === 'Administration')
    url[1] = link_title.get(url[1]);

  let title = '';
  if (url.length === 1)
    title = url[0];
  else if (url.length === 2)
    title = url.join(' / ');
  else
    title = url.slice(Math.max(url.length - 2, 0), url.length).join(' / ');

  title = `${title} | ARGO POEM`

  return (
    <Helmet>
      <title>{ title }</title>
    </Helmet>
  )
}
