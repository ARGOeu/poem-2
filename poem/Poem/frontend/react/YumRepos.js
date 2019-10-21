import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView, FancyErrorMessage, NotifyOk } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Label,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupAddon
} from 'reactstrap';
import * as Yup from 'yup';
import { NotificationManager } from 'react-notifications';


const RepoSchema = Yup.object().shape({
  name: Yup.string()
    .required('Required'),
  description: Yup.string().required('Required')
});


export class YumRepoList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      loading: false,
      list_repos: null,
      search_name: '',
      search_description: ''
    };

    this.backend = new Backend();
  };

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchYumRepos()
      .then(json => {
        this.setState({
          list_repos: json,
          loading: false
        });
      });
  };

  render() {
    const columns = [
      {
        Header: '#',
        id: 'row',
        minWidth: 12,
        Cell: (row) =>
          <div style={{textAlign: 'center'}}>
            {row.index + 1}
          </div>
      },
      {
        Header: 'Name',
        id: 'name',
        minWidth: 80,
        accessor: e =>
          <Link to={'/ui/yumrepos/' + e.name}>{e.name}</Link>,
        filterable: true,
        Filter: (
          <input
            value={this.state.search_name}
            onChange={e => this.setState({search_name: e.target.value})}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Description',
        accessor: 'description',
        filterable: true,
        Filter: (
          <input
            type='text'
            placeholder='Search by description'
            value={this.state.search_description}
            onChange={e => this.setState({search_description: e.target.value})}
            style={{width: '100%'}}
          />
        )
      }
    ];

    var { list_repos, loading } = this.state;

    if (this.state.search_name) {
      list_repos = list_repos.filter(row =>
          row.name.toLowerCase().includes(this.state.search_name.toLowerCase())
        )
    };

    if (this.state.search_description) {
      list_repos = list_repos.filter(row =>
          row.description.toLowerCase().includes(this.state.search_description.toLowerCase())
        )
    };

    if (loading)
      return (<LoadingAnim/>)

    else if (!loading && list_repos) {
      return (
        <BaseArgoView
          resourcename='YUM repo'
          location={this.location}
          listview={true}
        >
          <ReactTable
            data={list_repos}
            columns={columns}
            className='-striped -highlight'
            defaultPageSize={20}
          />
        </BaseArgoView>
      )
    }
    else 
      return null;
  }
}


export class YumRepoChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      repo: {
        id: '',
        name: '',
        description: ''
      },
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
  };

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  };

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  };

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (!this.addview) {
      msg = 'Are you sure you want to change YUM repo?';
      title = 'Change YUM repo';
    } else {
      msg = 'Are you sure you want to add YUM repo?';
      title = 'Add YUM repo';
    };

    this.toggleAreYouSureSetModal(
      msg, title, () => this.doChange(values, actions)
    )
  };

  doChange(values, actions) {
    if (!this.addview) {
      this.backend.changeYumRepo({
        id: values.id,
        name: values.name,
        description: values.description
      })
        .then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'YUM repo successfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/yumrepos/')
            });
          }
        })
    } else {
      this.backend.addYumRepo({
        name: values.name,
        description: values.description
      })
        .then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'YUM repo successfully added',
              title: 'Added',
              callback: () => this.history.push('/ui/yumrepos')
            });
          };
        });
    };
  };

  doDelete(name) {
    this.backend.deleteYumRepo(name)
      .then(response => {
        if (!response.ok) {
          response.json()
            .then(json => {
              NotificationManager.error(json.detail, 'Error');
            });
        } else {
          NotifyOk({
            msg: 'YUM repo successfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/yumrepos')
          });
        };
      });
  }

  componentDidMount() {
    if (!this.addview) {
      this.setState({loading: true});
      this.backend.fetchYumRepoByName(this.name)
        .then(json => {
          this.setState({
            repo: json,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true',
            loading: false
          });
        });
    } else {
      this.setState({
        write_perm: localStorage.getItem('authIsSuperuser') === 'true',
        loading: false
      });
    };
  };

  render() {
    const { repo, loading, write_perm } = this.state;

    if (loading)
      return <LoadingAnim/>

    else if (!loading && repo) {
      return (
        <BaseArgoView
          resourcename='YUM repo'
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
              id: repo.id,
              name: repo.name,
              description: repo.description
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            validationSchema={RepoSchema}
            render = {props => (
              <Form>
                <FormGroup>
                  <Row>
                    <Col md={8}>
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
                        Name of YUM repo file.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <Row>
                    <Col md={8}>
                      <Label for='description'>Description</Label>
                      <Field
                        component='textarea'
                        name='description'
                        rows='20'
                        className={props.errors.description ? 'form-control border-danger' : 'form-control'}
                        id='description'
                      />
                      {
                        props.errors.description &&
                          FancyErrorMessage(props.errors.description)
                      }
                      <FormText color='muted'>
                        Free text description.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                {
                  write_perm &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                    {
                      !this.addview ?
                        <Button 
                          color='danger'
                          onClick={() => {
                            this.toggleAreYouSureSetModal(
                              'Are you sure you want to delete YUM repo?',
                              'Delete YUM repo',
                              () => this.doDelete(props.values.name)
                            )
                          }}
                        >
                          Delete
                        </Button>
                      :
                      <div></div>
                    }
                  <Button color='success' id='submit-button' type='submit'>
                    Save
                  </Button>
                </div> 
                }
              </Form>
            )}
          />
        </BaseArgoView>
      )
    } else
      return null;
  };
}