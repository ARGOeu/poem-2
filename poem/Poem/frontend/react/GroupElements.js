import React, { Component } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, NotifyOk } from './UIElements';
import ReactTable from 'react-table';
import { Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  Button} from 'reactstrap';
import FilteredMultiSelect from 'react-filtered-multiselect';

export const GroupOfMetricsList = GroupList('metrics', 'groupofmetrics', 'group of metrics');
export const GroupOfMetricsChange = GroupChange('metrics', 'groupofmetrics', 'metrics');

export const GroupOfAggregationsList = GroupList('aggregations', 'groupofaggregations', 'group of aggregations');
export const GroupOfAggregationsChange = GroupChange('aggregations', 'groupofaggregations', 'aggregations');

export const GroupOfMetricProfilesList = GroupList('metricprofiles', 'groupofmetricprofiles', 'group of metric profiles');
export const GroupOfMetricProfilesChange = GroupChange('metricprofiles', 'groupofmetricprofiles', 'metric profiles');


function GroupList(group, id, name) {
  return class extends Component {
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
            list_groups: json[group],
            loading: false
          }))
  }

  render() {
    const columns = [
      {
        Header: name.charAt(0).toUpperCase() + name.slice(1),
        id: id,
        accessor: e =>
          <Link to={'/ui/administration/' + id + '/' + e}>
            {e}
          </Link>
      }
    ];

    const { loading, list_groups } = this.state;

    if (loading)
      return(<LoadingAnim/>);
    
    else if (!loading && list_groups) {
      return (
        <BaseArgoView
          resourcename={name}
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
}


function GroupChange(gr, id, ttl) {
  return class extends Component {
    constructor(props) {
      super(props);
  
      this.group = props.match.params.group;
      this.addview = props.addview;
      this.location = props.location;
      this.history = props.history;
  
      this.state = {
        name: '',
        items: [],
        nogroupitems: [],
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
  
    handleDeselect(deSelectedItems) {
      var items = this.state.items.slice();
      var nogroupitems = this.state.nogroupitems.slice();
      deSelectedItems.forEach(option => {
        items.splice(items.indexOf(option), 1);
      });
      deSelectedItems.forEach(option => {
        if (nogroupitems.indexOf(option) === -1) {
          nogroupitems.push(option)
        }
      });
      this.setState({items, nogroupitems});
    }
  
    handleSelect(items) {
      items.sort((a, b) => a.id - b.id)
      this.setState({items})
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
        msg = 'Are you sure you want to add group of ' + ttl + '?';
        title = 'Add group of ' + ttl;
      } else {
        msg = 'Are you sure you want to change group of ' + ttl + '?';
        title = 'Change group of ' + ttl;
      }
      this.toggleAreYouSureSetModal(msg, title, 
        () => this.doChange(values, action))
    }
  
    doChange(values, action) {
      let items = [];
      this.state.items.forEach((i) => items.push(i.name));
  
      if (!this.addview) {
        this.backend.changeGroup(gr,
          {
            name: values.name,
            items: items
          }
        )
        .then(() => NotifyOk({
          msg: 'Group of ' + ttl + ' successfully changed',
          title: 'Changed',
          callback: () => this.history.push('/ui/administration/' + id)
        }))
        .catch(err => alert('Something went wrong: ' + err))
      } else {
        this.backend.addGroup(gr, 
          {
            name: values.name,
            items: items
          }
        )
        .then(() => NotifyOk({
          msg:  'Group of ' + ttl + ' successfully added',
          title: 'Added',
          callback: () => this.history.push('/ui/administration/' + id)
        }))
        .catch(err => alert('Something went wrong: ' + err))
      }
    }
  
    doDelete(name) {
      this.backend.deleteGroup(gr, name)
        .then(() => NotifyOk({
          msg:  'Group of ' + ttl + ' successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/administration/' + id)
        }))
        .catch(err => alert('Something went wrong: ' + err))
    }
  
    componentDidMount() {
      this.setState({loading: true});
  
      if (!this.addview) {
        Promise.all([this.backend.fetchItemsInGroup(gr, this.group),
          this.backend.fetchItemsNoGroup(gr)
        ]).then(([items, nogroupitems]) => {
            this.setState({
              name: this.group,
              items: items,
              nogroupitems: nogroupitems,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true',
              loading: false
            });
          });
      } else {
        this.backend.fetchItemsNoGroup(gr).then(items =>
          this.setState(
            {
              name: '',
              items: [],
              nogroupitems: items,
              write_perm: true,
              loading: false
            }
          ))
      }
    }
  
    render() {
      const { name, items, write_perm, loading } = this.state;
      var nogroupitems = this.state.nogroupitems;
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
            resourcename={'group of ' + ttl}
            location={this.location}
            addview={this.addview}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
            submitperm={write_perm}>
              <Formik
                initialValues={{
                  name: name,
                  items: items
                }}
                onSubmit = {(values, action) => this.onSubmitHandle(values, action)}
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
                            disabled={!this.addview}
                          />
                        </Col>
                      </Row>
                    </FormGroup>
                    <FormGroup>
                    <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>{ttl}</h4>
                      <Row>
                        <Col md={5}>
                          <FilteredMultiSelect
                            buttonText='Add'
                            classNames={BOOTSTRAP_CLASSES}
                            onChange={this.handleSelect}
                            options={nogroupitems}
                            selectedOptions={items}
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
                            options={items}
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
                            this.toggleAreYouSureSetModal('Are you sure you want to delete group of ' + gr + '?',
                            'Delete group of ' + gr,
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
}