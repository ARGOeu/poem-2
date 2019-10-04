import React, { Component } from 'react';
import { ListOfMetrics, InlineFields, ProbeVersionLink } from './Metrics';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, NotifyOk, FancyErrorMessage } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
  Alert,
  FormGroup,
  Row,
  Button,
  Col,
  Label,
  FormText,
  Popover,
  PopoverBody,
  PopoverHeader} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Autocomplete from 'react-autocomplete';
import * as Yup from 'yup';
import './MetricTemplates.css';

export const MetricTemplateList = ListOfMetrics('metrictemplate');
export const TenantMetricTemplateList = ListOfMetrics('metrictemplate', true)


function matchItem(item, value) {
  if (value)
    return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


const AutocompleteField = ({lists, onselect_handler, field, setFieldValue, values}) =>
  <Autocomplete
    inputProps={{className: 'form-control'}}
    getItemValue={(item) => item}
    items={lists}
    value={eval(`values.${field}`)}
    renderItem={(item, isHighlighted) =>
      <div 
        key={lists.indexOf(item)}
        style={{ background: isHighlighted ? '#4A90D9' : 'white'}}
      >
        {item}
      </div>
    }
    onChange={(e) => {setFieldValue(field, e.target.value)}}
    onSelect={(val) =>  {
      setFieldValue(field, val)
      onselect_handler(val);
    }}
    wrapperStyle={{}}
    shouldItemRender={matchItem}
    renderMenu={(items) =>
      <div className='metrictemplates-autocomplete-menu' children={items}/>  
    }
  />


const MetricTemplateSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  type: Yup.string(),
  probeversion: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  }),
  probeexecutable: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  }),
  parent: Yup.string().when('type', {
    is: (val) => val === 'Passive',
    then: Yup.string().required('Required')
  })
});


export class MetricTemplateChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.infoview = props.infoview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      metrictemplate: {},
      probe: {},
      types: [],
      probeversions: [],
      metrictemplatelist: [],
      loading: false,
      popoverOpen: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.togglePopOver = this.togglePopOver.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
  }

  togglePopOver() {
    this.setState({
      popoverOpen: !this.state.popoverOpen
    })
  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  }

  onSelect(field, value) {
    let metrictemplate = this.state.metrictemplate;
    metrictemplate[field] = value;
    this.setState({
      metrictemplate: metrictemplate      
    });
  }

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add Metric template?';
      title = 'Add metric template';
    } else {
      msg = 'Are you sure you want to change Metric template?';
      title = 'Change metric template';
    }

    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, actions))
  }

  doChange(values, actions){
    if (this.addview) {
      this.backend.addMetricTemplate({
        name: values.name,
        probeversion: values.probeversion,
        mtype: values.type,
        probeexecutable: values.probeexecutable,
        parent: values.parent,
        config: values.config,
        attribute: values.attributes,
        dependency: values.dependency,
        parameter: values.parameter,
        flags: values.flags,
        files: values.file_attributes,
        fileparameter: values.file_parameters
      })
        .then(() => NotifyOk({
          msg: 'Metric template successfully added',
          title: 'Added',
          callback: () => this.history.push('/ui/metrictemplates')
        }))
        .catch(err => alert('Something went wrong: ' + err))
    } else {
      this.backend.changeMetricTemplate({
        name: values.name,
        probeversion: values.probeversion,
        mtype: values.type,
        probeexecutable: values.probeexecutable,
        parent: values.parent,
        config: values.config,
        attribute: values.attributes,
        dependency: values.dependency,
        parameter: values.parameter,
        flags: values.flags,
        files: values.file_attributes,
        fileparameter: values.file_parameters
      })
        .then(() => NotifyOk({
          msg: 'Metric template successfully changed',
          title: 'Changed',
          callback: () => this.history.push('/ui/metrictemplates')
        }))
        .catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(name) {
    this.backend.deleteMetricTemplate(name)
      .then(() => NotifyOk({
        msg: 'Metric template successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/metrictemplates')
      }))
      .catch(err => alert('Something went wrong: ' + err))
  }

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([
        this.backend.fetchMetricTemplateByName(this.name),
        this.backend.fetchMetricTemplateTypes(),
        this.backend.fetchProbeVersions(),
        this.backend.fetchMetricTemplates()
      ]).then(([metrictemplate, types, probeversions, metrictemplatelist]) => {
          if (metrictemplate.attribute.length === 0) {
            metrictemplate.attribute = [{'key': '', 'value': ''}];
          }
          if (metrictemplate.dependency.length === 0) {
            metrictemplate.dependency = [{'key': '', 'value': ''}];
          }
          if (metrictemplate.parameter.length === 0) {
            metrictemplate.parameter = [{'key': '', 'value': ''}];
          }
          if (metrictemplate.flags.length === 0) {
            metrictemplate.flags = [{'key': '', 'value': ''}];
          }
          if (metrictemplate.files.length === 0) {
            metrictemplate.files = [{'key': '', 'value': ''}];
          }
          if (metrictemplate.fileparameter.length === 0) {
            metrictemplate.fileparameter = [{'key': '', 'value': ''}];
          }

          let mlist = [];
          metrictemplatelist.forEach((e) => {
            mlist.push(e.name);
          });

          metrictemplate.probekey ?
            this.backend.fetchVersions('probe', metrictemplate.probeversion.split(' ')[0])
              .then(probe => {
                let fields = {};
                probe.forEach((e) => {
                  if (e.id === metrictemplate.probekey) {
                    fields = e.fields;
                  }
                });
                this.setState({
                  metrictemplate: metrictemplate,
                  probe: fields,
                  probeversions: probeversions,
                  metrictemplatelist: mlist,
                  types: types,
                  loading: false,
                  write_perm: localStorage.getItem('authIsSuperuser') === 'true'
                })
              })
            :
            this.setState({
              metrictemplate: metrictemplate,
              metrictemplatelist: mlist,
              types: types,
              loading: false,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true'
            })
        })
    } else {
      Promise.all([
        this.backend.fetchMetricTemplateTypes(),
        this.backend.fetchProbeVersions(),
        this.backend.fetchMetricTemplates()
      ]).then(([types, probeversions, mtlist]) => {
        let mlist = [];
        mtlist.forEach((e) => {
          mlist.push(e.name);
        });
        this.setState({
          metrictemplate: {
            name: '',
            probeversion: '',
            mtype: 'Active',
            probeexecutable: '',
            parent: '',
            config: [
              {'key': 'maxCheckAttempts', 'value': ''},
              {'key': 'timeout', 'value': ''},
              {'key': 'path', 'value': ''},
              {'key': 'interval', 'value': ''},
              {'key': 'retryInterval', 'value': ''}
            ],
            attribute: [{'key': '', 'value': ''}],
            dependency: [{'key': '', 'value': ''}],
            parameter: [{'key': '', 'value': ''}],
            flags: [{'key': '', 'value': ''}],
            files: [{'key': '', 'value': ''}],
            fileparameter: [{'key': '', 'value': ''}]
          },
          metrictemplatelist: mlist,
          probeversions: probeversions,
          types: types,
          loading: false,
          write_perm: localStorage.getItem('authIsSuperuser') === 'true'
        })
      })
    }
  }

  render() {
    const { metrictemplate, types, probeversions, metrictemplatelist, loading, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>)
    
    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='Metric template'
          location={this.location}
          addview={this.addview}
          infoview={this.infoview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}
        >
          <Formik 
            initialValues = {{
              name: metrictemplate.name,
              probeversion: metrictemplate.probeversion,
              type: metrictemplate.mtype,
              probeexecutable: metrictemplate.probeexecutable,
              parent: metrictemplate.parent,
              config: metrictemplate.config,
              attributes: metrictemplate.attribute,
              dependency: metrictemplate.dependency,
              parameter: metrictemplate.parameter,
              flags: metrictemplate.flags,
              file_attributes: metrictemplate.files,
              file_parameters: metrictemplate.fileparameter
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            validationSchema={MetricTemplateSchema}
            render = {props => (
              <Form>
                <FormGroup>
                  <Row className='mb-3'>
                    <Col md={4}>
                      <Label to='name'>Name</Label>
                      <Field
                        type='text'
                        name='name'
                        className={props.errors.name ? 'form-control border-danger' : 'form-control'}
                        id='name'
                        disabled={this.infoview}
                      />
                      {
                        props.errors.name ?
                          FancyErrorMessage(props.errors.name)
                        :
                          null
                      }
                      <FormText color='muted'>
                        Metric name
                      </FormText>
                    </Col>
                    <Col md={4}>
                      <Label to='probeversion'>Probe</Label>
                      {
                        props.values.type === 'Passive' ?
                          <input type='text' className='form-control' disabled={true} id='passive-probeversion'/>
                        :
                          this.infoview ?
                            <Field 
                              type='text'
                              name='probeversion'
                              className='form-control'
                              id='probeversion'
                              disabled={true}
                            />
                          :
                          <AutocompleteField
                            {...props}
                            lists={probeversions}
                            field='probeversion'
                            onselect_handler={this.onSelect}
                          />
                      }
                      {
                        props.errors.probeversion ?
                          FancyErrorMessage(props.errors.probeversion)
                        :
                          null
                      }
                      {
                        props.values.type === 'Active' &&
                        <FormText color='muted'>
                          Probe name and version <FontAwesomeIcon id='probe-popover' hidden={this.state.metrictemplate.mtype === 'Passive'} icon={faInfoCircle} style={{color: '#416090'}}/>
                          <Popover placement='bottom' isOpen={this.state.popoverOpen} target='probe-popover' toggle={this.togglePopOver} trigger='hover'>
                            <PopoverHeader><ProbeVersionLink probeversion={this.state.metrictemplate.probeversion}/></PopoverHeader>
                            <PopoverBody>{this.state.probe.description}</PopoverBody>
                          </Popover>
                        </FormText>
                      }
                    </Col>
                    <Col md={2}>
                      <Label to='mtype'>Type</Label>
                      <Field
                        component='select'
                        name='type'
                        className='form-control'
                        id='mtype'
                        disabled={this.infoview}
                        onChange={e => {
                          props.handleChange(e);
                          if (e.target.value === 'Passive' && this.addview) {
                            let ind = props.values.flags.length;
                            if (ind === 1 && props.values.flags[0].key === '') {
                              props.setFieldValue('flags[0].key', 'PASSIVE');
                              props.setFieldValue('flags[0].value', '1');
                            } else {
                              props.setFieldValue(`flags[${ind}].key`, 'PASSIVE')
                              props.setFieldValue(`flags[${ind}].value`, '1')
                            }
                          } else if (e.target.value === 'Active' && this.addview) {
                            let ind = undefined;
                            props.values.flags.forEach((e, index) => {
                              if (e.key === 'PASSIVE') {
                                ind = index;
                              }
                            });
                            if (props.values.flags.length === 1)
                              props.values.flags.splice(ind, 1, {'key': '', 'value': ''})
                            else
                              props.values.flags.splice(ind, 1)
                          }
                        }}
                      >
                        {
                          types.map((name, i) =>
                            <option key={i} value={name}>{name}</option>
                          )
                        }
                      </Field>
                      <FormText color='muted'>
                        Metric is of given type
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Metric configuration</h4>
                <h6 className='mt-4 font-weight-bold text-uppercase' hidden={props.values.type === 'Passive'}>probe executable</h6>
                <Row>
                  <Col md={5}>
                    <Field
                      type='text'
                      name='probeexecutable'
                      id='probeexecutable'
                      className={props.errors.probeexecutable ? 'form-control border-danger' : 'form-control'}
                      hidden={props.values.type === 'Passive'}
                      disabled={this.infoview}
                    />
                    {
                      props.errors.probeexecutable ?
                        FancyErrorMessage(props.errors.probeexecutable)
                      :
                        null
                    }
                  </Col>
                </Row>
                <InlineFields {...props} field='config' addnew={!this.infoview} readonly={this.infoview}/>
                <InlineFields {...props} field='attributes' addnew={!this.infoview}/>
                <InlineFields {...props} field='dependency' addnew={!this.infoview}/>
                <InlineFields {...props} field='parameter' addnew={!this.infoview}/>
                <InlineFields {...props} field='flags' addnew={!this.infoview}/>
                <InlineFields {...props} field='file_attributes' addnew={!this.infoview}/>
                <InlineFields {...props} field='file_parameters' addnew={!this.infoview}/>
                <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
                <Row>
                  <Col md={5}>
                    {
                      this.infoview ?
                        <Field
                          type='text'
                          name='parent'
                          id='parent'
                          className='form-control'
                          disabled={true}
                        />
                        :
                          <>
                            <AutocompleteField
                              {...props}
                              lists={metrictemplatelist}
                              field='parent'
                              className={props.errors.parent ? 'form-control border-danger' : 'form-control'}
                              onselect_handler={this.onSelect}
                            />
                            {
                              props.errors.parent ?
                                FancyErrorMessage(props.errors.parent)
                              :
                                null
                            }
                          </>
                    }
                  </Col>
                </Row>
                </FormGroup>
                {
                  (write_perm && !this.infoview) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <Button
                        color="danger"
                        onClick={() => {
                          this.toggleAreYouSureSetModal('Are you sure you want to delete Metric template?',
                          'Delete metric template',
                          () => this.doDelete(props.values.name))
                        }}
                      >
                        Delete
                      </Button>
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
            )}
          />        
        </BaseArgoView>
      )
    }
  }
}
