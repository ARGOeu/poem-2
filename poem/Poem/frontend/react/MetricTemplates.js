import React, { Component } from 'react';
import { ListOfMetrics, InlineFields, ProbeVersionLink } from './Metrics';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, NotifyOk, FancyErrorMessage, Icon } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
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
import * as Yup from 'yup';
import { NotificationManager } from 'react-notifications';
import { HistoryComponent, DiffElement } from './Probes';
import ReactDiffViewer from 'react-diff-viewer';
import { AutocompleteField } from './UIElements';

export const MetricTemplateList = ListOfMetrics('metrictemplate');
export const TenantMetricTemplateList = ListOfMetrics('metrictemplate', true)

export const MetricTemplateChange = MetricTemplateComponent()
export const MetricTemplateClone = MetricTemplateComponent(true)

export const MetricTemplateHistory = HistoryComponent('metrictemplate');


export const InlineDiffElement = ({title, item1, item2}) => {
  let n = Math.max(item1.length, item2.length);

  let elem1 = [];
  for (let i = 0; i < item1.length; i++) {
    elem1.push('key: ' + item1[i]['key'] + ', value: ' + item1[i]['value'])
  }

  let elem2 = [];
  for (let i = 0; i < item2.length; i++) {
    elem2.push('key: ' + item2[i]['key'] + ', value: ' + item2[i]['value'])
  }

  if (item1.length > item2.length) {
    for (let i = item2.length; i < item1.length; i++) {
      elem2.push(' ');
    }
  } else if (item2.length > item1.length) {
    for (let i = item1.length; i < item2.length; i++) {
      elem1.push(' ');
    }
  }

  const elements = [];
  for (let i = 0; i < n; i++) {
    elements.push(
      <ReactDiffViewer
        oldValue={elem2[i]}
        newValue={elem1[i]}
        showDiffOnly={true}
        splitView={false}
        hideLineNumbers={true}
        disableWordDiff={true}
        key={'diff-' + i}
      />
    )
  }

  return (
    <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      {elements}
    </div>
    )

}


export function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i]['key'] !== arr2[i]['key'] || arr1[i]['value'] !== arr2[i]['value'])
            return false;
    }

    return true;
}


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
  })
});


function MetricTemplateComponent(cloneview=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.name = props.match.params.name;
      this.location = props.location;
      this.addview = props.addview;
      this.infoview = props.infoview;
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
      });
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

      if (this.addview || cloneview) {
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
      if (this.addview || cloneview) {
        let cloned_from = undefined;
        if (cloneview) {
          cloned_from = values.id;
        } else {
          cloned_from = '';
        }
        this.backend.addMetricTemplate({
          cloned_from: cloned_from,
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
          .then(response => {
            if (!response.ok) {
              response.json()
                .then(json => {
                  NotificationManager.error(json.detail, 'Error');
                });
            } else {
              NotifyOk({
                msg: 'Metric template successfully added',
                title: 'Added',
                callback: () => this.history.push('/ui/metrictemplates')
              })
            }
          })
          .catch(err => alert('Something went wrong: ' + err))
      } else {
        this.backend.changeMetricTemplate({
          id: values.id,
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
          .then(response => {
            if (!response.ok) {
              response.json()
                .then(json => {
                  NotificationManager.error(json.detail, 'Error');
                });
            } else {
              NotifyOk({
                msg: 'Metric template successfully changed',
                title: 'Changed',
                callback: () => this.history.push('/ui/metrictemplates')
              })
            }
          })
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
  
            metrictemplate.probeversion ?
              this.backend.fetchVersions('probe', metrictemplate.probeversion.split(' ')[0])
                .then(probe => {
                  let fields = {};
                  probe.forEach((e) => {
                    if (e.object_repr === metrictemplate.probeversion) {
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
              id: '',
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
            resourcename='metric template'
            location={this.location}
            addview={this.addview}
            infoview={this.infoview}
            cloneview={cloneview}
            clone={true}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
            submitperm={write_perm}
          >
            <Formik 
              initialValues = {{
                id: metrictemplate.id,
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
                          className={`form-control ${props.errors.name && 'border-danger'}`}
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
                              icon='probes'
                              field='probeversion'
                              val={props.values.probeversion}
                              onselect_handler={this.onSelect}
                              req={props.errors.probeversion}
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
                            Probe name and version <FontAwesomeIcon id='probe-popover' hidden={this.state.metrictemplate.mtype === 'Passive' || this.addview} icon={faInfoCircle} style={{color: '#416090'}}/>
                            {
                              this.state.metrictemplate.probeversion &&
                                <Popover placement='bottom' isOpen={this.state.popoverOpen} target='probe-popover' toggle={this.togglePopOver} trigger='hover'>
                                  <PopoverHeader><ProbeVersionLink probeversion={this.state.metrictemplate.probeversion}/></PopoverHeader>
                                  <PopoverBody>{this.state.probe.description}</PopoverBody>
                                </Popover>
                            }
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
                        className={`form-control ${props.errors.probeexecutable && 'border-danger'}`}
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
                                val={props.values.parent}
                                icon='metrics'
                                className={`form-control ${props.errors.parent && 'border-danger'}`}
                                onselect_handler={this.onSelect}
                                req={props.errors.parent}
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
                        {
                          (!this.addview && !cloneview) ?
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
                          :
                            <div></div>
                        }
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
}


export class MetricTemplateVersionCompare extends Component {
  constructor(props) {
    super(props);

    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.name = props.match.params.name;

    this.state = {
      loading: false,
      name1: '',
      probeversion1: '',
      type1: '',
      probeexecutable1: '',
      parent1: '',
      config1: '',
      attribute1: '',
      dependency1: '',
      parameter1: '',
      flags1: '',
      files1: '',
      fileparameter1: '',
      name2: '',
      probeversion2: '',
      type2: '',
      probeexecutable2: '',
      parent2: '',
      config2: '',
      attribute2: '',
      dependency2: '',
      parameter2: '',
      flags2: '',
      files2: '',
      fileparameter2: ''
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchVersions('metrictemplate', this.name)
      .then (json => {
        let name1 = '';
        let probeversion1 = '';
        let type1 = '';
        let probeexecutable1 = '';
        let parent1 = '';
        let config1 = '';
        let attribute1 = '';
        let dependency1 = '';
        let flags1 = '';
        let files1 = '';
        let parameter1 = '';
        let fileparameter1 = '';
        let name2 = '';
        let probeversion2 = '';
        let type2 = '';
        let probeexecutable2 = '';
        let parent2 = '';
        let config2 = '';
        let attribute2 = '';
        let dependency2 = '';
        let flags2 = '';
        let files2 = '';
        let parameter2 = '';
        let fileparameter2 = '';

        json.forEach((e) => {
          if (e.version == this.version1) {
            name1 = e.fields.name;
            probeversion1 = e.fields.probeversion;
            type1 = e.fields.mtype;
            probeexecutable1 = e.fields.probeexecutable; 
            parent1 = e.fields.parent; 
            config1 = e.fields.config; 
            attribute1 = e.fields.attribute; 
            dependency1 = e.fields.dependency; 
            parameter1 = e.fields.parameter; 
            flags1 = e.fields.flags; files1 = e.fields.files; 
            fileparameter1 = e.fields.fileparameter; 
          } else if (e.version == this.version2) {
              name2 = e.fields.name;
              probeversion2 = e.fields.probeversion;
              type2 = e.fields.mtype;
              probeexecutable2 = e.fields.probeexecutable;
              parent2 = e.fields.parent;
              config2 = e.fields.config;
              attribute2 = e.fields.attribute;
              dependency2 = e.fields.dependency;
              flags2 = e.fields.flags;
              files2 = e.fields.files;
              parameter2 = e.fields.parameter;
              fileparameter2 = e.fields.fileparameter;
          }
        });

        this.setState({
          name1: name1,
          probeversion1: probeversion1,
          type1: type1,
          probeexecutable1: probeexecutable1,
          parent1: parent1,
          config1: config1,
          attribute1: attribute1,
          dependency1: dependency1,
          parameter1: parameter1,
          flags1: flags1,
          files1: files1,
          fileparameter1: fileparameter1,
          name2: name2,
          probeversion2: probeversion2,
          type2: type2,
          probeexecutable2: probeexecutable2,
          parent2: parent2,
          config2: config2,
          attribute2: attribute2,
          dependency2: dependency2,
          parameter2: parameter2,
          flags2: flags2,
          files2: files2,
          fileparameter2: fileparameter2,
          loading: false
        });
      });
  }

  render() {
    var { name1, name2, probeversion1, probeversion2, type1, type2, 
    probeexecutable1, probeexecutable2, parent1, parent2, config1, 
    config2, attribute1, attribute2, dependency1, dependency2,
    parameter1, parameter2, flags1, flags2, files1, files2, 
    fileparameter1, fileparameter2, loading } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name1 && name2) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <h2 className='ml-3 mt-1 mb-4'>{'Compare ' + this.name}</h2>
          </div>
          {
            (name1 !== name2) &&
              <DiffElement title='name' item1={name1} item2={name2}/>
          }
          {
            (probeversion1 !== probeversion2) &&
              <DiffElement title='probe version' item1={probeversion1} item2={probeversion2}/>
          }
          {
            (type1 !== type2) &&
              <DiffElement title='type' item1={type1} item2={type2}/>
          }
          {
            (probeexecutable1 !== probeexecutable2) &&
              <DiffElement title='probe executable' item1={probeexecutable1} item2={probeexecutable2}/>
          }
          {
            (parent1 !== parent2) &&
              <DiffElement title='parent' item1={parent1} item2={parent2}/>
          }
          {
            (!arraysEqual(config1, config2)) &&
              <InlineDiffElement title='config' item1={config1} item2={config2}/>
          }
          {
            (!arraysEqual(attribute1, attribute2)) &&
              <InlineDiffElement title='attribute' item1={attribute1} item2={attribute2}/>
          }
          {
            (!arraysEqual(dependency1, dependency2)) &&
              <InlineDiffElement title='dependency' item1={dependency1} item2={dependency2}/>
          }
          {
            (!arraysEqual(parameter1, parameter2)) &&
              <InlineDiffElement title='parameter' item1={parameter1} item2={parameter2}/>
          }
          {
            (!arraysEqual(flags1, flags2)) &&
              <InlineDiffElement title='flags' item1={flags1} item2={flags2}/>
          }
          {
            (!arraysEqual(files1, files2)) &&
              <InlineDiffElement title='file attributes' item1={files1} item2={files2}/>
          }
          {
            (!arraysEqual(fileparameter1, fileparameter2)) &&
              <InlineDiffElement title='file parameters' item1={fileparameter1} item2={fileparameter2}/>
          }
        </React.Fragment>
      )
    } else
      return null
  }
  
}


export class MetricTemplateVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      probeversion: '',
      mtype: '',
      probeexecutable: '',
      parent: '',
      config: [],
      attribute: [],
      dependency: [],
      parameter: [],
      flags: [],
      files: [],
      fileparameter: [],
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchVersions('metrictemplate', this.name)
      .then((json) => {
        json.forEach((e) => {
          if (e.version == this.version)
            this.setState({
              name: e.fields.name,
              probeversion: e.fields.probeversion,
              type: e.fields.mtype,
              probeexecutable: e.fields.probeexecutable,
              parent: e.fields.parent,
              config: e.fields.config,
              attribute: e.fields.attribute,
              dependency: e.fields.dependency,
              parameter: e.fields.parameter,
              flags: e.fields.flags,
              files: e.fields.files,
              fileparameter: e.fields.fileparameter,
              date_created: e.date_created,
              loading: false
            });
        });
      })
  }

  render() {
    const { name, probeversion, type, probeexecutable, parent, config, 
      attribute, dependency, parameter, flags, files, fileparameter, date_created,
      loading } = this.state;
    
    if (loading)
    return (<LoadingAnim/>);

    else if (!loading && name) {
      return (
        <React.Fragment>
          <div className='d-flex align-items-center justify-content-between'>
            <React.Fragment>
              <h2 className='ml-3 mt-1 mb-4'>{name + ' (' + date_created + ')'}</h2>
            </React.Fragment>
          </div>
          <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
            <Formik
              initialValues = {{
                name: name,
                probeversion: probeversion,
                mtype: type,
                probeexecutable: probeexecutable,
                parent: parent,
                config: config,
                attributes: attribute,
                dependency: dependency,
                parameter: parameter,
                flags: flags,
                files: files,
                fileparameter: fileparameter
              }}
              render = {props => (
                <Form>
                  <FormGroup>
                    <Row className='mb-3'>
                      <Col md={4}>
                        <Label to='name'>Name</Label>
                        <Field
                          type='text'
                          name='name'
                          className='form-control'
                          id='name'
                          disabled={true}
                        />
                        <FormText color='muted'>
                          Metric name
                        </FormText>
                      </Col>
                      <Col md={4}>
                        <Label to='probeversion'>Probe</Label>
                        <Field 
                          type='text'
                          name='probeversion'
                          className='form-control'
                          id='probeversion'
                          disabled={true}
                        />
                      </Col>
                      <Col md={2}>
                        <Label to='mtype'>Type</Label>
                        <Field
                          type='text'
                          name='mtype'
                          className='form-control'
                          id='mtype'
                          disabled={true}
                        />
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
                        className='form-control'
                        hidden={props.values.type === 'Passive'}
                        disabled={true}
                      />
                    </Col>
                  </Row>
                  <InlineFields {...props} field='config' readonly={true}/>
                  <InlineFields {...props} field='attributes'/>
                  <InlineFields {...props} field='dependency'/>
                  <InlineFields {...props} field='parameter'/>
                  <InlineFields {...props} field='flags'/>
                  <InlineFields {...props} field='files'/>
                  <InlineFields {...props} field='fileparameter'/>
                  <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
                  <Row>
                    <Col md={5}>
                      <Field
                        type='text'
                        name='parent'
                        id='parent'
                        className='form-control'
                        disabled={true}
                      />
                    </Col>
                  </Row>
                  </FormGroup>
                </Form>
              )}
              />
          </div>
        </React.Fragment>
      )
    }
    else
      return null
  }
}