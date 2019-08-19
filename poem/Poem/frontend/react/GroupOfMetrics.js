import React, { Component } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, NotifyOk } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  Button} from 'reactstrap';
import FilteredMultiSelect from 'react-filtered-multiselect';
import { GroupList } from './GroupElements';

export const GroupOfMetricsList = GroupList(
  'metrics', 'Group of metrics', 'groupofmetrics', 'group of metrics'
)


export class GroupOfMetricsChange extends Component {
  constructor(props) {
    super(props);

    this.group = props.match.params.group;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;

    this.state = {
      name: '',
      metrics: [],
      nogroupmetrics: [],
      write_perm: false,
      loading: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    }

    this.backend = new Backend();

    this.handleDeselect = this.handleDeselect.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
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

  onSubmitHandle(values, action) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add group of metrics?';
      title = 'Add group of metrics';
    } else {
      msg = 'Are you sure you want to change group of metrics?';
      title = 'Change group of metrics';
    }
    this.toggleAreYouSureSetModal(msg, title, 
      () => this.doChange(values, action))
  }

  doChange(values, action) {
    let metrics = [];
    this.state.metrics.forEach((m) => metrics.push(m.name));

    if (!this.addview) {
      this.backend.changeGroupOfMetrics({
        name: values.name,
        metrics: metrics
      })
      .then(() => NotifyOk({
        msg: 'Group of metrics successfully changed',
        title: 'Changed',
        callback: () => this.history.push('/ui/administration/groupofmetrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
    } else {
      this.backend.addGroupOfMetrics({
        name: values.name,
        metrics: metrics
      })
      .then(() => NotifyOk({
        msg: 'Group of metrics successfully added',
        title: 'Added',
        callback: () => this.history.push('/ui/administration/groupofmetrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(name) {
    this.backend.deleteGroupOfMetrics(name)
      .then(() => NotifyOk({
        msg: 'Group of metrics successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/administration/groupofmetrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
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
    } else {
      this.backend.fetchMetricNoGroup().then(metrics =>
        this.setState(
          {
            name: '',
            metrics: [],
            nogroupmetrics: metrics,
            write_perm: true,
            loading: false
          }
        ))
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
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
            <Formik
              initialValues={{
                name: name,
                metrics: metrics
              }}
              onSubmit = {(values, action) => this.onSubmitHandle(values, action)}
              render = {props => (
                <Form>
                  <FormGroup>
                    <Row>
                      <Col md={6}>
                        <Label for='groupname'>Name</Label>
                        <Field
                          type='readonly'
                          name='name'
                          required={true}
                          className='form-control'
                          id='groupname'
                          disabled={!this.addview}
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
                  {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <Button 
                        color="danger"
                        onClick={() => {
                          this.toggleAreYouSureSetModal('Are you sure you want to delete group of metrics?',
                          'Delete group of metrics',
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