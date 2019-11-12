import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
    LoadingAnim,
    BaseArgoView,
    AutocompleteField
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
  Button,
  Popover,
  PopoverBody,
  PopoverHeader
} from 'reactstrap';
import * as Yup from 'yup';
import { FancyErrorMessage } from './UIElements';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';


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
            .matches(/^\d*(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          warn1: Yup.string()
            .matches(/^[@]?(~|\d*(\.\d+)?)$/, 'Must be a number or ~')
            .required('Required'),
          warn2: Yup.string()
            .matches(/^\d*(\.\d+)?$/, 'Must be a number.'),
          crit1: Yup.string()
            .matches(/^[@]?(~|\d*(\.\d+)?)$/, 'Must be a number or ~')
            .required('Required'),
          crit2: Yup.string()
            .matches(/^\d*(\.\d+)?$/, 'Must be a number.'),
          min: Yup.string()
            .matches(/^\d*(\.\d+)?$/, 'Must be a number.'),
          max: Yup.string()
            .matches(/^\d*(\.\d+)?$/, 'Must be a number.')
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

    this.backend.fetchThresholdsProfiles()
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

    this.backend = new Backend();

    this.state = {
      thresholds_profile: {
        'id': '',
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

  componentDidMount() {
    this.setState({loading: true});

    if (this.addview) {
      Promise.all([
        this.backend.fetchAllGroups(),
        this.backend.fetchMetricsAll()
      ])
        .then(([groups, metricsall]) => {
          this.setState({
            loading: false,
            groups_list: groups['thresholdsprofiles'],
            metrics_list: metricsall,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true'
          });
        });
    };
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
                          className={props.errors.name ? 'form-control border-danger' : 'form-control'}
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
                  <Col md={9}>
                    <FieldArray
                      name='rules'
                      render={arrayHelpers => (
                        <div>
                          {props.values.rules && props.values.rules.length > 0 ? (
                            props.values.rules.map((rule, index) => 
                              <React.Fragment key={`fragment.rules.${index}`}>
                                <Card className={index === 0 ? 'mt-1' : 'mt-4'}>
                                  <CardHeader className='p-1 font-weight-bold text-light text-uppercase' style={{backgroundColor: '#416090'}}>
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
                                            props.errors.rules[index].metric
                                          }
                                          lists={metrics_list}
                                          icon='metrics'
                                          field={`rules[${index}].metric`}
                                          onselect_handler={this.onSelect}
                                          label='Metric'
                                        />
                                        {
                                          (
                                            props.errors.rules && 
                                            props.errors.rules.length > index && 
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
                                    <Row className='mt-2'>
                                      <Col md={12}>
                                        <h6 className="mt-2 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Thresholds</h6>
                                        <FieldArray
                                          name={`rules.${index}.thresholds`}
                                          render={thresholdHelpers => (
                                            <div>
                                              <table className='table table-bordered table-sm'>
                                                <thead className='table-active'>
                                                  <tr className='align-middle text-center'>
                                                    <th style={{width: '4%'}}>#</th>
                                                    <th style={{width: '12%'}}>Label</th>
                                                    <th colSpan={2} style={{width: '12%'}}>Value</th>
                                                    <th colSpan={3} style={{width: '12%'}}>
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
                                                    <th colSpan={3} style={{width: '12%'}}>
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
                                                    <th style={{width: '12%'}}>Action</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {
                                                    (props.values.rules[index].thresholds && props.values.rules[index].thresholds.length > 0) ?
                                                      props.values.rules[index].thresholds.map((t, i) =>
                                                      <tr key={`rule-${index}-threshold-${i}`}>
                                                        <td className='align-middle text-center'>
                                                          {i + 1}
                                                        </td>
                                                        <td>
                                                          <Field
                                                            type='text'
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].label
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].value
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].warn1
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].warn2
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].crit1
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].crit2
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].min
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                            className={
                                                              (
                                                                props.errors.rules &&
                                                                props.errors.rules.length > index &&
                                                                props.errors.rules[index] &&
                                                                props.errors.rules[index].thresholds &&
                                                                props.errors.rules[index].thresholds.length > i &&
                                                                props.errors.rules[index].thresholds[i] &&
                                                                props.errors.rules[index].thresholds[i].max
                                                              ) ?
                                                               'form-control border-danger'
                                                              : 
                                                                'form-control'
                                                            }
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
                                                        <td className='align-middle pl-3'>
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
                                  </CardBody>
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
              </Form>
            )}
          />
        </BaseArgoView>
      );
    } else 
      return null;
  };
};
