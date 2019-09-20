import React, { Component } from 'react';
import { ListOfMetrics, InlineFields, ProbeVersionLink } from './Metrics';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Popover,
  PopoverBody,
  PopoverHeader} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Autocomplete from 'react-autocomplete';

export const MetricTemplateList = ListOfMetrics('metrictemplate');


function matchItem(item, value) {
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
      <div children={items}/>  
    }
  />


export class MetricTemplateChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
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

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([
        this.backend.fetchMetricTemplateByName(this.name),
        this.backend.fetchMetricTemplateTypes(),
        this.backend.fetchProbeVersions(),
        this.backend.fetchMetricTemplates()
      ]).then(([metrictemplate, types, probeversions, metrictemplatelist]) => {
          metrictemplate.probekey ?
            this.backend.fetchVersions('probe', metrictemplate.probeversion.split(' ')[0])
              .then(probe => {
                let fields = {};
                probe.forEach((e) => {
                  if (e.id === metrictemplate.probekey) {
                    fields = e.fields;
                  }
                });
                let mlist = [];
                metrictemplatelist.forEach((e) => {
                  mlist.push(e.name)
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
    }
  }

  render() {
    const { metrictemplate, types, probeversions, metrictemplatelist, loading, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>)
    
    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='Metric templates'
          location={this.location}
          addview={this.addview}
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
            render = {props => (
              <Form>
                <FormGroup>
                  <Row className='mb-3'>
                    <Col md={4}>
                      <Label to='name'>Name</Label>
                      <Field
                        type='text'
                        name='name'
                        required={true}
                        className='form-control'
                        id='name'
                      />
                      <FormText color='muted'>
                        Metric name
                      </FormText>
                    </Col>
                    <Col md={4}>
                      <Label to='probeversion'>Probe</Label>
                      <AutocompleteField
                        {...props}
                        lists={probeversions}
                        field='probeversion'
                        onselect_handler={this.onSelect}
                      />
                      <FormText color='muted'>
                        Probe name and version <FontAwesomeIcon id='probe-popover' hidden={this.state.metrictemplate.mtype === 'Passive'} icon={faInfoCircle} style={{color: '#416090'}}/>
                        <Popover placement='bottom' isOpen={this.state.popoverOpen} target='probe-popover' toggle={this.togglePopOver} trigger='hover'>
                          <PopoverHeader><ProbeVersionLink probeversion={this.state.metrictemplate.probeversion}/></PopoverHeader>
                          <PopoverBody>{this.state.probe.description}</PopoverBody>
                        </Popover>
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <Label to='mtype'>Type</Label>
                      <Field
                        component='select'
                        name='type'
                        className='form-control'
                        id='mtype'
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
                      className='form-control'
                      hidden={props.values.type === 'Passive'}
                    />
                  </Col>
                </Row>
                <InlineFields {...props} field='config' addnew={true}/>
                <InlineFields {...props} field='attributes' addnew={true}/>
                <InlineFields {...props} field='dependency' addnew={true}/>
                <InlineFields {...props} field='parameter' addnew={true}/>
                <InlineFields {...props} field='flags' addnew={true}/>
                <InlineFields {...props} field='file_attributes' addnew={true}/>
                <InlineFields {...props} field='file_parameters' addnew={true}/>
                <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
                <Row>
                  <Col md={5}>
                    <AutocompleteField
                      {...props}
                      lists={metrictemplatelist}
                      field='parent'
                      onselect_handler={this.onSelect}
                    />
                  </Col>
                </Row>
                </FormGroup>
              </Form>
            )}
          />        
        </BaseArgoView>
      )
    }
  }
}
