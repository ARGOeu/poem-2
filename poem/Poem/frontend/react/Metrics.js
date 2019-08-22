import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button} from 'reactstrap';


const DefaultFilterComponent = ({filter, onChange, field}) => (
  <input 
    type='text'
    placeholder={'Search by ' + field}
    value={filter ? filter.value : ''}
    onChange={event => onChange(event.target.value)}
    style={{width: '100%'}}
  />
)

const DropdownFilterComponent = ({filter, onChange, data}) => (
  <select
    onChange={event => onChange(event.target.value)}
    style={{width: '100%'}}
    value={filter ? filter.value : 'all'}
  >
    <option key={0} value=''>Show all</option>
    {
      data.map((name, i) => 
        <option key={i + 1} value={name}>{name}</option>
      )
    }
  </select>
)


export class MetricList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_metric: null,
      list_tags: null,
      list_groups:null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    Promise.all([this.backend.fetchAllMetric(),
      this.backend.fetchAllGroups(),
      this.backend.fetchTags()
    ]).then(([metrics, groups, tags]) =>
          this.setState({
            list_metric: metrics,
            list_tags: tags,
            list_groups: groups['metrics'],
            loading: false, 
            search: ''
          }));
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        minWidth: 100,
        accessor: e =>
        <Link to={'/ui/metrics/' + e.name}>
          {e.name}
        </Link>,
        filterable: true,
        Filter: (
          <input 
            value={this.state.search}
            onChange={e => this.setState({search: e.target.value})}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Tag',
        accessor: 'tag',
        minWidth: 30,
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
        <DropdownFilterComponent
          filter={filter}
          onChange={onChange}
          data={this.state.list_tags}
        />
        )
      },
      {
        Header: 'Probe version',
        minWidth: 80,
        accessor: 'probeversion',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
          <DefaultFilterComponent 
            filter={filter}
            onChange={onChange}
            field='probe version'
          />
        )
      },
      {
        Header: 'Group',
        minWidth: 30,
        accessor: 'group',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
          <DropdownFilterComponent 
            filter={filter}
            onChange={onChange}
            data={this.state.list_groups}
          />
        )
      },
    ];

    var { loading, list_metric } = this.state;

    if (this.state.search) {
      list_metric = list_metric.filter(row =>
        row.name.toLowerCase().includes(this.state.search.toLowerCase())
      )
    }

    if (loading)
      return (<LoadingAnim />);

    else if (!loading && list_metric) {
      return (
        <BaseArgoView
          resourcename='metric'
          location={this.location}
          listview={true}>
            <ReactTable
              data={list_metric}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={20}
              defaultFilterMethod={(filter, row) =>
                row[filter.id] !== undefined ? String(row[filter.id]).toLowerCase().includes(filter.value.toLowerCase()) : true
              }
            />
          </BaseArgoView>
      )
    }
    else
      return null
  }
}


export class MetricChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      metric: {},
      tags: [],
      groups: [],
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
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

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([this.backend.fetchMetricByName(this.name),
        this.backend.fetchMetricUserGroups(),
        this.backend.fetchTags(),
        this.backend.fetchAllGroups()
      ]).then(([metrics, usergroups, tags, groups]) =>
        this.setState({
          metric: metrics,
          tags: tags,
          groups: groups['metrics'],
          loading: false,
          write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
        })
      )
    }
  }

  render() {
    const { metric, tags, groups, loading, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>)
    
    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='Metrics'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              name: metric.name,
              probe: metric.probeversion,
              tag: metric.tag,
              type: metric.mtype,
              group: metric.group,
              probeexecutable: metric.probeexecutable,
              parent: metric.parent,
              config: metric.config,
              attributes: metric.attributes,
              dependency: metric.dependancy,
              parameter: metric.parameter,
              flags: metric.flags,
              file_attributes: metric.fileattributes,
              file_parameters: metric.fileparameters
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
                        name='probe'
                        className='form-control'
                        id='probeversion'
                        disabled={true}
                      />
                      <FormText color='muted'>
                        Probe name and version
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <Label to="tag">Tag</Label>
                      <Field 
                        component='select'
                        name='tag'
                        className='form-control'
                        id='tag'
                      >
                        {
                          tags.map((name, i) =>
                          <option key={i} value={name}>{name}</option>)
                        }
                      </Field>
                    </Col>
                  </Row>
                  <Row className='mb-4'>
                    <Col md={2}>
                      <Label to='mtype'>Type</Label>
                      <Field
                        type='text'
                        name='type'
                        className='form-control'
                        id='mtype'
                        disabled={true}
                      />
                      <FormText color='muted'>
                        Metric is of given type
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <Label to='group'>Group</Label>
                      <Field 
                        component='select'
                        name='group'
                        className='form-control'
                        id='group'
                      >
                        {
                          groups.map((name, i) =>
                            <option key={i} value={name}>{name}</option>
                          )
                        }
                      </Field>
                      <FormText color='muted'>
                        Metric is member of selected group
                      </FormText>
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
