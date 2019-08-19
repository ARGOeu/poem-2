import React, { Component } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText} from 'reactstrap';
import FilteredMultiSelect from 'react-filtered-multiselect';


export class GroupOfMetricsList extends Component
{
  constructor(props) {
      super(props);

      this.state = {
          loading: false,
          list_groups: null
      }

      this.location = props.location;
      this.backend = new Backend();
  }

  componentDidMount() {
      this.setState({loading: true});
      this.backend.fetchAllGroups()
        .then(json => 
          this.setState({
            list_groups: json['metrics'],
            loading: false
          }))
  }

  render() {
    const columns = [
      {
        Header: 'Group of metrics',
        id: 'groupofmetrics',
        accessor: e =>
        <Link to={'/ui/administration/groupofmetrics/' + e}>
          {e}
        </Link>
      }
    ];

    const { loading, list_groups } = this.state;

    if (loading)
      return (<LoadingAnim />);
    
    else if (!loading && list_groups) {
      return (
        <BaseArgoView
          resourcename='group of metrics'
          location={this.location}
          listview={true}>
            <ReactTable 
              data={list_groups}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={12}
            />
          </BaseArgoView>
      );
    }
    else
      return null;
  }
}


export class GroupOfMetricsChange extends Component {
  constructor(props) {
    super(props);

    this.group = props.match.params.group;
    this.addview = props.addview;
    this.location = props.location;

    this.state = {
      name: '',
      metrics: [],
      nogroupmetrics: [],
      write_perm: false,
      loading: false
    }

    this.backend = new Backend();

    this.handleDeselect = this.handleDeselect.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleDeselect(deSelectedMetrics) {
    var metrics = this.state.metrics.slice();
    var nogroupmetrics = this.state.nogroupmetrics.slice();
    deSelectedMetrics.forEach(option => {
      metrics.splice(metrics.indexOf(option), 1);
    });
    deSelectedMetrics.forEach(option => {
      if (nogroupmetrics.indexOf(option) === -1) {
        nogroupmetrics.push(option)
      }
    });
    this.setState({metrics, nogroupmetrics});
  }

  handleSelect(metrics) {
    metrics.sort((a, b) => a.id - b.id)
    this.setState({metrics})
  }

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([this.backend.fetchMetricInGroup(this.group),
        this.backend.fetchMetricNoGroup()
      ]).then(([metrics, nogroupmetrics]) => {
          this.setState({
            name: this.group,
            metrics: metrics,
            nogroupmetrics: nogroupmetrics,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true',
            loading: false
          });
        });
    }
  }

  render() {
    const { name, metrics, write_perm, loading } = this.state;
    var nogroupmetrics = this.state.nogroupmetrics;
    const BOOTSTRAP_CLASSES = {
      filter: 'form-control',
      select: 'form-control',
      button: 'btn btn btn-block btn-default',
      buttonActive: 'btn btn btn-block btn-primary'
    }

    if (loading)
      return(<LoadingAnim/>)

    else if (!loading) {
      return(
        <BaseArgoView
          resourcename='group of metrics'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          submitperm={write_perm}>
            <Formik
              initialValues={{
                name: name,
                metrics: metrics
              }}
              render = {props => (
                <Form>
                  <FormGroup>
                    <Row>
                      <Col md={6}>
                        <Label for='groupname'>Name</Label>
                        <Field
                          type='text'
                          name='name'
                          required={true}
                          className='form-control'
                          id='groupname'
                        />
                      </Col>
                    </Row>
                  </FormGroup>
                  <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Metrics</h4>
                    <Row>
                      <Col md={5}>
                        <FilteredMultiSelect
                          buttonText='Add'
                          classNames={BOOTSTRAP_CLASSES}
                          onChange={this.handleSelect}
                          options={nogroupmetrics}
                          selectedOptions={metrics}
                          size={15}
                          textProp='name'
                          valueProp='id'
                        />
                      </Col>
                      <Col md={5}>
                        <FilteredMultiSelect
                          buttonText='Remove'
                          classNames={{
                            filter: 'form-control',
                            select: 'form-control',
                            button: 'btn btn btn-block btn-default',
                            buttonActive: 'btn btn btn-block btn-danger'
                          }}
                          onChange={this.handleDeselect}
                          options={metrics}
                          size={15}
                          textProp='name'
                          valueProp='id'
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