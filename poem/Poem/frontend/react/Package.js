import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import{ LoadingAnim, BaseArgoView, DropdownFilterComponent, FancyErrorMessage, AutocompleteField, NotifyOk } from './UIElements';
import ReactTable from 'react-table';
import {
  FormGroup,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupAddon
} from 'reactstrap';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { NotificationManager } from 'react-notifications';

const PackageSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  version: Yup.string()
    .matches(/^\S*$/, 'Version cannot contain white spaces')
    .required('Required'),
  repo_6: Yup.string(),
  repo_7: Yup.string()
})
.test('undefined', 'You must provide at least one repo!', value =>
!!(value.repo_6 || value.repo_7));


export class PackageList extends Component {
    constructor(props) {
      super(props);

      this.location = props.location;
      this.backend = new Backend();

      this.state = {
        loading: false,
        list_packages: null,
        list_repos: null,
        search_name: '',
        search_repo: ''
      };
    };

    componentDidMount() {
      this.setState({loading: true});

      Promise.all([
        this.backend.fetchData('/api/v2/internal/packages'),
        this.backend.fetchData('/api/v2/internal/yumrepos')
      ])
        .then(([pkgs, repos]) => {
          let list_repos = [];
          repos.forEach(e => list_repos.push(e.name + ' (' + e.tag + ')'));
          this.setState({
            list_packages: pkgs,
            list_repos: list_repos,
            loading: false
          });
        });
    };

    render() {
      var { list_packages, loading } = this.state;

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
          Header: 'Name and version',
          id: 'name',
          minWidth: 80,
          accessor: e =>
            <Link to={'/ui/packages/' + e.name + '-' + e.version}>{e.name + ' (' + e.version + ')'}</Link>,
          filterable: true,
          Filter: (
            <input 
              value={this.state.search_name}
              onChange={e => this.setState({search_name: e.target.value})}
              placeholder='Search by name and version'
              style={{width: '100%'}}
            />
          )
        },
        {
          Header: 'Repo',
          id: 'repo',
          accessor: 'repos',
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value.join(', ')}
            </div>,
          filterable: true,
          Filter: 
            <DropdownFilterComponent
              value={this.state.repo}
              onChange={e => this.setState({search_repo: e.target.value})}
              data={this.state.list_repos}
            />
        }
      ];

      if (this.state.search_name) {
        list_packages = list_packages.filter(row =>
          `${row.name} + ' (' + ${row.version} + ')`.toLowerCase().includes(this.state.search_name.toLowerCase())
        );
      };

      if (this.state.search_repo) {
        list_packages = list_packages.filter(
          row =>
            `${row.repos.join(', ')}`.toLowerCase().includes(this.state.search_repo.toLowerCase())
        );
      };

      if (loading)
        return <LoadingAnim/>;
      
      else if (!loading && list_packages) {
        return (
          <BaseArgoView
            resourcename='package'
            location={this.location}
            listview={true}
          >
            <ReactTable
              data={list_packages}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={50}
            />
          </BaseArgoView>
        );
      } else 
        return null;
    };
};


export class PackageChange extends Component {
  constructor(props) {
    super(props);

    this.nameversion = props.match.params.nameversion;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      pkg: {
        id: '',
        name: '',
        version: '',
      },
      repo_6: '',
      repo_7: '',
      list_repos_6: [],
      list_repos_7: [],
      list_probes: [],
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSelect = this.onSelect.bind(this);
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

  onSelect(field, value) {
    let pkg = this.state.pkg;
    pkg[field] = value;
    this.setState({
      pkg: pkg
    });
  };

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (!this.addview) {
      msg = 'Are you sure you want to change package?';
      title = 'Change package';
    } else {
      msg = 'Are you sure you want to add package?';
      title = 'Add package';
    };

    this.toggleAreYouSureSetModal(
      msg, title, () => this.doChange(values, actions)
    );
  };

  doChange(values, actions) {
    let repos = [];
    if (values.repo_6)
      repos.push(values.repo_6);

    if (values.repo_7)
      repos.push(values.repo_7);
   
    if (this.addview) {
      this.backend.addObject(
        '/api/v2/internal/packages/',
        {
          name: values.name,
          version: values.version,
          repos: repos
        }
      ).then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'Package successfully added',
              title: 'Added',
              callback: () => this.history.push('/ui/packages')
            });
          };
        });
    } else {
      this.backend.changeObject(
        '/api/v2/internal/packages/',
        {
          id: values.id,
          name: values.name,
          version: values.version,
          repos: repos
        }
      ).then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Erro');
              });
          } else {
            NotifyOk({
              msg: 'Package successfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/packages')
            });
          };
        });
    };
  };

  doDelete(nameversion) {
    this.backend.deletePackage(nameversion)
      .then(response => {
        if (!response.ok) {
          response.json()
            .then(json => {
              NotificationManager.error(json.detail, 'Error');
            });
        } else {
          NotifyOk({
            msg: 'Package successfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/packages')
          });
        };
      });
  };

  componentDidMount() {
    this.setState({loading: true});
    this.backend.fetchData('/api/v2/internal/yumrepos')
      .then(repos => {
          let list_repos_6 = [];
          let list_repos_7 = [];
          repos.forEach(e => {
            if (e.tag === 'CentOS 6')
              list_repos_6.push(e.name + ' (' + e.tag + ')');
            else if (e.tag === 'CentOS 7')
              list_repos_7.push(e.name + ' (' + e.tag + ')');
          });

          if (this.addview) {
            this.setState({
              list_repos_6: list_repos_6,
              list_repos_7: list_repos_7,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true',
              loading: false
            });
          } else {
            Promise.all([
              this.backend.fetchData(`/api/v2/internal/packages/${this.nameversion}`),
              this.backend.fetchData('/api/v2/internal/probes')
            ])
              .then(([pkg, probes]) => {
                let list_probes = [];
                let repo_6 = '';
                let repo_7 = '';

                for (let i = 0; i < pkg.repos.length; i++) {
                  if (pkg.repos[i].split('(')[1].slice(0, -1) === 'CentOS 6')
                    repo_6 = pkg.repos[i];
                  
                  if (pkg.repos[i].split('(')[1].slice(0, -1) === 'CentOS 7')
                    repo_7 = pkg.repos[i];
                }

                probes.forEach(e => {
                  if (e.package === `${pkg.name} (${pkg.version})`)
                    list_probes.push(e.name);
                });
                this.setState({
                  pkg: pkg,
                  list_repos_6: list_repos_6,
                  list_repos_7: list_repos_7,
                  repo_6: repo_6,
                  repo_7: repo_7,
                  list_probes: list_probes,
                  write_perm: localStorage.getItem('authIsSuperuser') === 'true',
                  loading: false
                });
              });
          };
      });
  };

  render() {
    const { pkg, repo_6, repo_7, list_repos_6, list_repos_7, list_probes, write_perm, loading } = this.state;

    if (loading)
      return <LoadingAnim/>;

    else if (!loading && list_repos_6) {
      return (
        <BaseArgoView
          resourcename='package'
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
              id: pkg.id,
              name: pkg.name,
              version: pkg.version,
              repo_6: repo_6,
              repo_7: repo_7, 
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            validationSchema={PackageSchema}
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
                        Package name.
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
                        <Field
                          type='text'
                          name='version'
                          className={`form-control ${props.errors.version && 'border-danger'}`}
                          id='version'
                        />
                      </InputGroup>
                      {
                        props.errors.version &&
                          FancyErrorMessage(props.errors.version)
                      }
                      <FormText color='muted'>
                        Package version.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Yum repo</h4>
                  <Row>
                    <Col md={8}>
                      <AutocompleteField
                        {...props}
                        lists={list_repos_6}
                        icon='yumrepos'
                        field='repo_6'
                        val={props.values.repo_6}
                        onselect_handler={this.onSelect}
                        req={props.errors.undefined}
                        label='CentOS 6 repo'
                      />
                      {
                        props.errors.undefined &&
                          FancyErrorMessage(props.errors.undefined)
                      }
                      <FormText color='muted'>
                        Package is part of selected CentOS 6 repo.
                      </FormText>
                    </Col>
                  </Row>
                  <Row className='mt-4'>
                    <Col md={8}>
                      <AutocompleteField
                        {...props}
                        lists={list_repos_7}
                        icon='yumrepos'
                        field='repo_7'
                        val={props.values.repo_7}
                        onselect_handler={this.onSelect}
                        req={props.errors.undefined}
                        label='CentOS 7 repo'
                      />
                      {
                        props.errors.undefined &&
                          FancyErrorMessage(props.errors.undefined)
                      }
                      <FormText color='muted'>
                        Package is part of selected CentOS 7 repo.
                      </FormText>
                    </Col>
                  </Row>
                  {
                    !this.addview &&
                      <Row className='mt-3'>
                        <Col md={8}>
                          Probes:
                          {
                            list_probes.length > 0 &&
                              <div>
                                {
                                  list_probes
                                    .map((e, i) => <Link key={i} to={'/ui/probes/' + e}>{e}</Link>)
                                    .reduce((prev, curr) => [prev, ', ', curr])
                                }
                              </div>
                          }
                        </Col>
                      </Row>
                  }
                </FormGroup>
                {
                  write_perm &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                  {
                    !this.addview ?
                      <Button
                        color="danger"
                        onClick={() => {
                          this.toggleAreYouSureSetModal(
                            'Are you sure you want to delete package?',
                            'Delete package',
                            () => this.doDelete(this.nameversion)
                          )
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
    } else
      return null;
  };
};
