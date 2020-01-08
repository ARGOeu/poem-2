import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend, WebApi } from './DataManager';
import {
    LoadingAnim,
    BaseArgoView,
    AutocompleteField,
    NotifyOk
} from './UIElements';
import ReactTable from 'react-table';
import { 
  Formik, 
  Form, 
  Field,
  FieldArray
} from 'formik';
import {
  FormGroup,
  FormText,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Popover,
  PopoverBody,
  PopoverHeader
} from 'reactstrap';
import * as Yup from 'yup';
import { FancyErrorMessage } from './UIElements';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { NotificationManager } from 'react-notifications';


const ThresholdsSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  groupname: Yup.string().required('Required'),
  rules: Yup.array()
    .of(Yup.object().shape({
      metric: Yup.string().required('Required'),
      thresholds: Yup.array()
        .of(Yup.object().shape({
          label: Yup.string()
            .matches(/^[a-zA-Z][A-Za-z0-9]*$/, 'Label can contain alphanumeric characters, but must always begin with a letter.')
            .required('Required'),
          value: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          warn1: Yup.string()
            .matches(/^[@]?(~|[-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          warn2: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than', 
            'Should be greater than lower warning limit', 
            function(value) {
              const lowerLimit = this.parent.warn1.charAt(0) === '@' ? 
                this.parent.warn1.substr(1) : 
                this.parent.warn1;
              if (!lowerLimit || !value) {
                return true;
              } else {
                if (lowerLimit === '~')
                  return true;
                else
                  if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                    return Number(lowerLimit) <= Number(value);
                  else
                    return true;
              }
            }),
          crit1: Yup.string()
            .matches(/^[@]?(~|[-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          crit2: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than', 
            'Should be greater than lower critical limit', 
            function(value) {
              const lowerLimit = this.parent.crit1.charAt(0) === '@' ? 
                this.parent.crit1.substr(1) : 
                this.parent.crit1;
              if (!lowerLimit || !value) {
                return true;
              } else {
                if (lowerLimit === '~')
                  return true;
                else
                  if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                    return Number(lowerLimit) <= Number(value);
                  else
                    return true;
              }
            }),
          min: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.'),
          max: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than-min',
            'Should be greater than min value.',
            function(value) {
              const lowerLimit = this.parent.min;
              if (!lowerLimit) {
                return true;
              } else {
                if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                  return Number(lowerLimit) < Number(value);
                else
                  return true;
              };
            }
            )
        }))
    }))
});


export class ThresholdsProfilesList extends Component {
  constructor(props) {
    super(props);
    this.location = props.location;
    this.backend = new Backend();

    this.state = {
      loading: false,
      list_thresholdsprofiles: null
    };
  };

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchData('/api/v2/internal/thresholdsprofiles')
      .then(profiles => 
        this.setState({
          list_thresholdsprofiles: profiles,
          loading: false
        })
      );
  };

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={'/ui/thresholdsprofiles/' + e.name}>
            {e.name}
          </Link>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ];
    const { loading, list_thresholdsprofiles } = this.state;

    if (loading)
      return <LoadingAnim/>

    else if (!loading && list_thresholdsprofiles) {
      return (
        <BaseArgoView
          resourcename='thresholds profile'
          location={this.location}
          listview={true}
        >
          <ReactTable
            data={list_thresholdsprofiles}
            columns={columns}
            className='-striped -highlight'
            defaultPageSize={20}
          />
        </BaseArgoView>
      );
    } else
      return null;
  };
};


export class ThresholdsProfilesChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.history = props.history;
    this.location = props.location;
    this.tenant_name = props.tenantname;
    this.webapithresholds = props.webapithresholds;
    this.token = props.webapitoken;

    this.backend = new Backend();
    this.webapi = new WebApi({
      token: this.token,
      thresholdsProfiles: this.webapithresholds
    })

    this.state = {
      thresholds_profile: {
        'apiid': '',
        'name': '',
        'groupname': ''
      },
      thresholds_rules : [],
      groups_list: [],
      metrics_list: [],
      write_perm: false,
      areYouSureModal: false,
      loading: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
      popoverWarningOpen: false,
      popoverCriticalOpen: false
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.toggleWarningPopOver = this.toggleWarningPopOver.bind(this);
    this.toggleCriticalPopOver = this.toggleCriticalPopOver.bind(this);
    this.thresholdsToString = this.thresholdsToString.bind(this);
    this.thresholdsToValues = this.thresholdsToValues.bind(this);
    this.getUOM = this.getUOM.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
  };

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  };

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  };

  toggleWarningPopOver() {
    this.setState({
      popoverWarningOpen: !this.state.popoverWarningOpen
    });
  }

  toggleCriticalPopOver() {
    this.setState({
      popoverCriticalOpen: !this.state.popoverCriticalOpen
    });
  }

  onSelect(field, value) {
    let thresholds_rules = this.state.thresholds_rules;
    let index = field.split('[')[1].split(']')[0]
    if (thresholds_rules.length == index) {
      thresholds_rules.push({'metric': '', thresholds: [], 'host': '', 'endpoint_group': ''})
    } 
    thresholds_rules[index].metric = value;
    this.setState({
      thresholds_rules: thresholds_rules
    });
  };

  thresholdsToString(rules) {
    rules.forEach((r => {
      let thresholds = [];
      if (!r.host)
        delete r.host;
      if (!r.endpoint_group)
        delete r.endpoint_group;
      r.thresholds.forEach((t => {
        let thresholds_string = undefined;
        thresholds_string = t.label + '=' + t.value + t.uom + ';' + t.warn1 + ':' + t.warn2 + ';' + t.crit1 + ':' + t.crit2;
        if (t.min && t.max)
          thresholds_string = thresholds_string + ';' + t.min + ';' + t.max;
        thresholds.push(thresholds_string)
      }));
      let th = thresholds.join(' ');
      r.thresholds = th;
    }));
    return rules;
  };

  getUOM(value) {
    if (!isNaN(value.charAt(value.length - 1))) {
      return '';
    }

    if (value.endsWith('us'))
      return 'us';

    if (value.endsWith('ms'))
      return 'ms';

    if (value.endsWith('s'))
      return 's';
    
    if (value.endsWith('%'))
      return '%';
    
    if (value.endsWith('KB'))
      return 'KB';

    if (value.endsWith('MB'))
      return 'MB';
    
    if (value.endsWith('TB'))
      return ('TB');

    if (value.endsWith('B'))
      return 'B';

    if (value.endsWith('c'))
      return 'c';
  };

  thresholdsToValues(rules) {
    rules.forEach((r => {
      let thresholds_strings = r.thresholds.split(' ');
      let thresholds = [];
      thresholds_strings.forEach((s => {
        let label = '';
        let value = '';
        let uom = ''; 
        let warn1 = '';
        let warn2 = ''; 
        let crit1 = ''; 
        let crit2 = '';
        let min = '';
        let max = ''; 
        let tokens = s.split('=')
        if (tokens.length === 2) {
          label = tokens[0];
          let subtokens = tokens[1].split(';');
          if (subtokens.length > 0) {
            uom = this.getUOM(subtokens[0]);
            value = subtokens[0].replace(uom, '');
            if (subtokens.length > 1) {
              for (let i = 1; i < subtokens.length; i++) {
                if (i === 1) {
                  let warn = subtokens[i].split(':');
                  if (warn.length > 1) {
                    warn1 = warn[0];
                    warn2 = warn[1];
                  } else {
                    warn1 = '0';
                    warn2 = subtokens[i];
                  };
                } else if (i === 2) {
                  let crit = subtokens[i].split(':');
                  if (crit.length > 1) {
                    crit1 = crit[0];
                    crit2 = crit[1];
                  } else {
                    crit1 = '0';
                    crit2 = subtokens[i];
                  };
                } else if (i === 3) {
                  min = subtokens[i];
                } else if (i === 4) {
                  max = subtokens[i];
                };
              };
            };
          };
        };
        thresholds.push({
          label: label,
          value: value,
          uom: uom,
          warn1: warn1,
          warn2: warn2,
          crit1: crit1,
          crit2: crit2,
          min: min,
          max: max
        });
      }));
      r.thresholds = thresholds;
    }));
    return rules;
  };

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;
    
    if (this.addview) {
      msg = 'Are you sure you want to add thresholds profile?';
      title = 'Add thresholds profile';
    } else {
      msg = 'Are you sure you want to change thresholds profile?';
      title = 'Change thresholds profile';
    };

    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, actions));
  };

  doChange(values, actions) {
    let values_send = JSON.parse(JSON.stringify(values));
    if (this.addview) {
      this.webapi.addThresholdsProfile({
        name: values_send.name,
        rules: this.thresholdsToString(values_send.rules)
      })
      .then(response => {
        if (!response.ok) {
          NotificationManager.error(
            `Error: ${response.status} ${response.statusText}`,
            'Error adding thresholds profile'
          );
        } else {
          response.json()
            .then(r => {
              this.backend.addThresholdsProfile({
                apiid: r.data.id,
                name: values_send.name,
                groupname: values.groupname,
              })
                .then(() => NotifyOk({
                  msg: 'Thresholds profile successfully added',
                  title: 'Added',
                  callback: () => this.history.push('/ui/thresholdsprofiles')
                }))
            });
        };
      });
    } else {
      this.webapi.changeThresholdsProfile({
        id: values_send.id,
        name: values_send.name,
        rules: this.thresholdsToString(values_send.rules)
      })
        .then(response => {
          if (!response.ok) {
            NotificationManager.error(
              `Error: ${response.status} ${response.statusText}`,
              'Error changing thresholds profile'
            );
          } else {
            response.json()
              .then(r => {
                this.backend.changeThresholdsProfile({
                  apiid: values_send.id,
                  name: values_send.name,
                  groupname: values.groupname
                })
                  .then(() => NotifyOk({
                    msg: 'Thresholds profile successfully changed',
                    title: 'Changed',
                    callback: () => this.history.push('/ui/thresholdsprofiles')
                  }));
              });
          };
        });
    };
  };

  doDelete(profileId) {
    this.webapi.deleteThresholdsProfile(profileId)
      .then(response => {
        if (!response.ok) {
          NotificationManager.error(
            `Error: ${response.status} ${response.statusText}`,
            'Error deleting thresholds profile'
          );
        } else {
          response.json()
            .then(this.backend.deleteThresholdsProfile(profileId))
            .then(() => NotifyOk({
              msg: 'Thresholds profile successfully deleted',
              title: 'Deleted',
              callback: () => this.history.push('/ui/thresholdsprofiles')
            }));
        };
      });
  };

  componentDidMount() {
    this.setState({loading: true});

    Promise.all([
      this.backend.fetchData('/api/v2/internal/groups/thresholdsprofiles'),
      this.backend.fetchListOfNames('/api/v2/internal/metricsall')
    ])
      .then(([usergroups, metricsall]) => {
        if (this.addview) {
            this.setState({
              loading: false,
              groups_list: usergroups,
              metrics_list: metricsall,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true' || groups.length > 0
            });
        } else {
          this.backend.fetchData(`/api/v2/internal/thresholdsprofiles/${this.name}`)
            .then(json => 
              Promise.all([
                this.webapi.fetchThresholdsProfile(json.apiid),
                this.backend.fetchResult('/api/v2/internal/usergroups')
              ])
                .then(([thresholdsprofile, groups]) => this.setState({
                  thresholds_profile: {
                    'apiid': thresholdsprofile.id,
                    'name': thresholdsprofile.name,
                    'groupname': json['groupname']
                  },
                  thresholds_rules: this.thresholdsToValues(thresholdsprofile.rules),
                  groups_list: groups['thresholdsprofiles'],
                  metrics_list: metricsall,
                  write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(group) >= 0,
                  loading: false
                }))
            );
        };
      });
  };

  render() {
    const { thresholds_profile, thresholds_rules, metrics_list, groups_list, loading, write_perm } = this.state;

    if (loading) 
      return <LoadingAnim/>;
    
    else if (!loading && thresholds_profile) {
      return (
        <BaseArgoView
          resourcename='thresholds profile'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}
          history={false}
        >
          <Formik 
            initialValues = {{
              id: thresholds_profile.apiid,
              name: thresholds_profile.name,
              groupname: thresholds_profile.groupname,
              rules: thresholds_rules
            }}
            validationSchema={ThresholdsSchema}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <FormGroup>
                  <Row>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                        <Field
                          type='text'
                          name='name'
                          className={`form-control ${props.errors.name && 'border-danger'}`}
                          id='name'
                        />
                      </InputGroup>
                      {
                        props.errors.name &&
                          FancyErrorMessage(props.errors.name)
                      }
                      <FormText color='muted'>
                        Name of this thresholds profile.
                      </FormText>
                    </Col>
                    <Col md={3}>
                      <InputGroup>
                      <InputGroupAddon addonType='prepend'>Group</InputGroupAddon>
                        <Field
                          component='select'
                          name='groupname'
                          className={props.errors.groupname ? 'form-control border-danger' : 'form-control'}
                          id='groupname'
                        >
                          <option key={0} value={''}>Select group</option>
                          {
                            groups_list.map((name, i) =>
                              <option key={i + 1} value={name}>{name}</option>
                            )
                          }
                        </Field>
                      </InputGroup>
                      {
                        props.errors.groupname &&
                          FancyErrorMessage(props.errors.groupname)
                      }
                      <FormText color='muted'>
                        Thresholds profile is a member of the selected group.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Thresholds rules</h4>
                <Row>
                  <Col md={12}>
                    <FieldArray
                      name='rules'
                      render={arrayHelpers => (
                        <div>
                          {props.values.rules && props.values.rules.length > 0 ? (
                            props.values.rules.map((rule, index) => 
                              <React.Fragment key={`fragment.rules.${index}`}>
                                <Card className={index === 0 ? 'mt-1' : 'mt-4'}>
                                  <CardHeader className='p-1 font-weight-bold text-uppercase'>
                                    <div className='d-flex align-items-center justify-content-between no-gutters'>
                                      Rule {index + 1}
                                      <Button
                                        size='sm'
                                        color='danger'
                                        type='button'
                                        onClick={
                                          () => (write_perm) && arrayHelpers.remove(index)
                                        }
                                      >
                                        <FontAwesomeIcon icon={faTimes}/>
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardBody className='p-1'>
                                    <Row className='d-flex align-items-center no-gutters'>
                                      <Col md={12}>
                                        <AutocompleteField
                                          {...props}
                                          req={
                                            props.errors.rules && 
                                            props.errors.rules.length > index && 
                                            props.errors.rules[index] &&
                                            props.errors.rules[index].metric
                                          }
                                          lists={metrics_list}
                                          icon='metrics'
                                          field={`rules[${index}].metric`}
                                          val={props.values.rules[index].metric}
                                          onselect_handler={this.onSelect}
                                          label='Metric'
                                        />
                                        {
                                          (
                                            props.errors.rules && 
                                            props.errors.rules.length > index && 
                                            props.errors.rules[index] &&
                                            props.errors.rules[index].metric
                                            ) &&
                                            FancyErrorMessage(props.errors.rules[index].metric)
                                        }
                                      </Col>
                                    </Row>
                                    <Row className='mt-2'>
                                      <Col md={12}>
                                        <InputGroup>
                                          <InputGroupAddon addonType='prepend'>Host</InputGroupAddon>
                                          <Field
                                            name={`rules.${index}.host`}
                                            id={`rules.${index}.host`}
                                            className='form-control'
                                          />
                                        </InputGroup>
                                      </Col>
                                    </Row>
                                    <Row className='mt-2'>
                                      <Col md={12}>
                                        <InputGroup>
                                          <InputGroupAddon addonType='prepend'>Endpoint group</InputGroupAddon>
                                          <Field
                                            name={`rules.${index}.endpoint_group`}
                                            id={`rules.${index}.endpoint_group`}
                                            className='form-control'
                                          />
                                        </InputGroup>
                                      </Col>
                                    </Row>
                                    </CardBody>
                                    <CardFooter>
                                    <Row className='mt-2'>
                                      <Col md={12}>
                                        <h6 className="text-uppercase rounded">Thresholds</h6>
                                        <FieldArray
                                          name={`rules.${index}.thresholds`}
                                          render={thresholdHelpers => (
                                            <div>
                                              <table className='table table-bordered table-sm'>
                                                <thead className='table-active'>
                                                  <tr className='align-middle text-center'>
                                                    <th style={{width: '4%'}}>#</th>
                                                    <th style={{width: '13%'}}>Label</th>
                                                    <th colSpan={2} style={{width: '13%'}}>Value</th>
                                                    <th colSpan={3} style={{width: '13%'}}>
                                                      Warning <FontAwesomeIcon id='warning-popover' icon={faInfoCircle} style={{color: '#416090'}}/>
                                                      <Popover placement='bottom' isOpen={this.state.popoverWarningOpen} target='warning-popover' toggle={this.toggleWarningPopOver} trigger='hover'>
                                                        <PopoverHeader>Warning range</PopoverHeader>
                                                        <PopoverBody>
                                                          <p>Defined in format: <code>@&#123;floor&#125;:&#123;ceil&#125;</code></p>
                                                          <p><code>@</code> - optional - negates the range (value should belong outside limits)</p>
                                                          <p><code>&#123;floor&#125;</code>: integer/float or <code>~</code> that defines negative infinity</p>
                                                          <p><code>&#123;ceil&#125;</code>: integer/float or empty (defines positive infinity)</p>
                                                        </PopoverBody>
                                                      </Popover>
                                                    </th>
                                                    <th colSpan={3} style={{width: '13%'}}>
                                                      Critical <FontAwesomeIcon id='critical-popover' icon={faInfoCircle} style={{color: '#416090'}}/>
                                                      <Popover placement='bottom' isOpen={this.state.popoverCriticalOpen} target='critical-popover' toggle={this.toggleCriticalPopOver} trigger='hover'>
                                                        <PopoverHeader>Critical range</PopoverHeader>
                                                        <PopoverBody>
                                                          <p>Defined in format: <code>@&#123;floor&#125;:&#123;ceil&#125;</code></p>
                                                          <p><code>@</code> - optional - negates the range (value should belong outside limits)</p>
                                                          <p><code>&#123;floor&#125;</code>: integer/float or <code>~</code> that defines negative infinity</p>
                                                          <p><code>&#123;ceil&#125;</code>: integer/float or empty (defines positive infinity)</p>
                                                        </PopoverBody>
                                                      </Popover>
                                                    </th>
                                                    <th style={{width: '12%'}}>min</th>
                                                    <th style={{width: '12%'}}>max</th>
                                                    <th style={{width: '8%'}}>Action</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {
                                                    (
                                                      props.values.rules &&
                                                      props.values.rules.length > index &&
                                                      props.values.rules[index] &&
                                                      props.values.rules[index].thresholds && 
                                                      props.values.rules[index].thresholds.length > 0
                                                      ) ?
                                                      props.values.rules[index].thresholds.map((t, i) =>
                                                      <tr key={`rule-${index}-threshold-${i}`}>
                                                        <td className='align-middle text-center'>
                                                          {i + 1}
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].label
                                                              ) &&
                                                                'border-danger'
                                                              }`
                                                            }
                                                            name={`rules[${index}].thresholds[${i}].label`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.label`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].label
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].label)
                                                          }
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].value
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.value`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.value`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].value
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].value)
                                                          }
                                                        </td>
                                                        <td style={{width: '6%'}}>
                                                          <Field
                                                            component='select'
                                                            className='form-control'
                                                            name={`rules.${index}.thresholds.${i}.uom`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.uom`}
                                                          >
                                                            <option key='option-0' value=''></option>
                                                            <option key='option-1' value='s'>s</option>
                                                            <option key='option-2' value='us'>us</option>
                                                            <option key='option-3' value='ms'>ms</option>
                                                            <option key='option-4' value='B'>B</option>
                                                            <option key='option-5' value='KB'>KB</option>
                                                            <option key='option-6' value='MB'>MB</option>
                                                            <option key='option-7' value='TB'>TB</option>
                                                            <option key='option-8' value='%'>%</option>
                                                            <option key='option-9' value='c'>c</option>
                                                          </Field>
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].warn1
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.warn1`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.warn1`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].warn1
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].warn1)
                                                          }
                                                        </td>
                                                        <td>
                                                          :
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].warn2
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.warn2`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.warn2`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].warn2
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].warn2)
                                                          }
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].crit1
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.crit1`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.crit1`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].crit1
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].crit1)
                                                          }
                                                        </td>
                                                        <td>
                                                          :
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].crit2
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.crit2`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.crit2`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].crit2
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].crit2)
                                                          }
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].min
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.min`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.min`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].min
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].min)
                                                          }
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={`form-control ${
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].max
                                                              ) &&
                                                                'border-danger'
                                                            }`}
                                                            name={`rules.${index}.thresholds.${i}.max`}
                                                            id={`props.values.rules.${index}.thresholds.${i}.max`}
                                                          />
                                                          {
                                                            (
                                                              props.errors.rules &&
                                                              props.errors.rules.length > index &&
                                                              props.errors.rules[index] &&
                                                              props.errors.rules[index].thresholds &&
                                                              props.errors.rules[index].thresholds.length > i &&
                                                              props.errors.rules[index].thresholds[i] &&
                                                              props.errors.rules[index].thresholds[i].max
                                                            ) &&
                                                              FancyErrorMessage(props.errors.rules[index].thresholds[i].max)
                                                          }
                                                        </td>
                                                        <td className='align-middle d-flex justify-content-center align-items-center'>
                                                          <Button
                                                            size='sm'
                                                            color='light'
                                                            type='button'
                                                            onClick={() => {
                                                              thresholdHelpers.remove(i);
                                                              if (props.values.rules[index].thresholds.length === 1) {
                                                                thresholdHelpers.push({
                                                                  label: '',
                                                                  value: '',
                                                                  uom: '',
                                                                  warn1: '',
                                                                  warn2: '',
                                                                  crit1: '',
                                                                  crit2: '',
                                                                  min: '',
                                                                  max: ''
                                                                });
                                                              };
                                                            }}
                                                          >
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                          </Button>
                                                          <Button
                                                            size='sm'
                                                            color='light'
                                                            type='button'
                                                            onClick={() => thresholdHelpers.push({
                                                              label: '',
                                                              value: '',
                                                              uom: '',
                                                              warn1: '',
                                                              warn2: '',
                                                              crit1: '',
                                                              crit2: '',
                                                              min: '',
                                                              max: ''
                                                            })}
                                                          >
                                                            <FontAwesomeIcon icon={faPlus}/>
                                                          </Button>
                                                        </td>
                                                      </tr>
                                                    )
                                                    :
                                                    null
                                                  }
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        />
                                      </Col>
                                    </Row>
                                  </CardFooter>
                                </Card>
                                {
                                  ((index + 1) === props.values.rules.length) &&
                                    <Button
                                      color='success'
                                      className='mt-4'
                                      onClick={() => arrayHelpers.push({
                                        metric: '', 
                                        thresholds: [
                                          {
                                            label: '', 
                                            value: '', 
                                            uom: '', 
                                            warn1: '', 
                                            warn2: '', 
                                            crit1: '', 
                                            crit2: '', 
                                            min: '', 
                                            max: ''
                                          }
                                        ], 
                                        host: '', 
                                        endpoint_group: ''
                                      })}
                                    >
                                      Add new rule
                                    </Button>
                                }
                              </React.Fragment>
                            )
                          )
                          :
                            <Button
                              color='success'
                              onClick={() => arrayHelpers.push({
                                metric: '', 
                                thresholds: [
                                  {
                                    label: '', 
                                    value: '', 
                                    uom: '', 
                                    warn1: '', 
                                    warn2: '', 
                                    crit1: '', 
                                    crit2: '', 
                                    min: '', 
                                    max: ''
                                  }
                                ], 
                                host: '', 
                                endpoint_group: ''
                              })}
                            >
                              Add a rule
                            </Button>                          
                          }
                        </div>
                      )}
                    />
                  </Col>
                </Row>
                </FormGroup>
                {
                  write_perm &&
                    <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                      {
                        !this.addview ?
                          <Button
                            color='danger'
                            onClick={() => {
                              this.toggleAreYouSureSetModal(
                                'Are you sure you want to delete thresholds profile?',
                                'Delete thresholds profile',
                                () => this.doDelete(props.values.id)
                              )
                            }}
                          >
                            Delete
                          </Button>
                        :
                          <div></div>
                      }
                      <Button
                        color='success'
                        id='submit-button'
                        type='submit'
                      >
                        Save
                      </Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      );
    } else 
      return null;
  };
};
