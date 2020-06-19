import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import{
  LoadingAnim,
  BaseArgoView,
  FancyErrorMessage,
  AutocompleteField,
  NotifyOk,
  Checkbox,
  NotifyError,
  ErrorComponent,
  DropdownFilterComponent,
  NotifyWarn
} from './UIElements';
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


export const PackageChange = PackageComponent();
export const PackageClone = PackageComponent(true);


const PackageSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  present_version: Yup.boolean(),
  version: Yup.string()
    .matches(/^\S*$/, 'Version cannot contain white spaces')
    .when('present_version', {
      is: false,
      then: Yup.string().required('Required')
    }),
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
        search_repo: '',
        error: null,
        isTenantSchema: null
      };
    };

    async componentDidMount() {
      this.setState({loading: true});

      try {
        let pkgs = await this.backend.fetchData('/api/v2/internal/packages');
        let repos = await this.backend.fetchData('/api/v2/internal/yumrepos');
        let isTenantSchema = await this.backend.isTenantSchema();
        let list_repos = [];
        repos.forEach(e => list_repos.push(e.name + ' (' + e.tag + ')'));
        this.setState({
          list_packages: pkgs,
          list_repos: list_repos,
          loading: false,
          isTenantSchema: isTenantSchema
        });
      } catch(err) {
        this.setState({
          error: err,
          loading: false
        });
      };
    };

    render() {
      var { list_packages, isTenantSchema, loading, error } = this.state;
      let packagelink = undefined;

      if (!isTenantSchema)
        packagelink = '/ui/packages/';

      else
        packagelink = '/ui/administration/packages/'

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
            <Link to={packagelink + e.name + '-' + e.version}>{e.name}</Link>,
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
          Header: 'Version',
          id: 'version',
          accessor: 'version',
          minWidth: 12,
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value}
            </div>
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
          row.name.toLowerCase().includes(this.state.search_name.toLowerCase())
        );
      };

      if (this.state.search_repo) {
        list_packages = list_packages.filter(
          row =>
            `${row.repos.join(', ')}`.toLowerCase().includes(this.state.search_repo.toLowerCase())
        );
      };

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

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
              className='-highlight'
              defaultPageSize={50}
              rowsText='packages'
              getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
            />
          </BaseArgoView>
        );
      } else
        return null;
    };
};


function PackageComponent(cloneview=false){
  return class extends Component {
    constructor(props) {
      super(props);

      this.nameversion = props.match.params.nameversion;
      this.addview = props.addview;
      this.disabled = props.disabled;
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
        pkg_versions: [],
        present_version: false,
        loading: false,
        areYouSureModal: false,
        modalFunc: undefined,
        modalTitle: undefined,
        modalMsg: undefined,
        error: null,
        disabled_button: true
      };

      this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
      this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
      this.onSelect = this.onSelect.bind(this);
      this.onSubmitHandle = this.onSubmitHandle.bind(this);
      this.doChange = this.doChange.bind(this);
      this.doDelete = this.doDelete.bind(this);
      this.toggleCheckbox = this.toggleCheckbox.bind(this);
      this.onVersionSelect = this.onVersionSelect.bind(this);
      this.onTenantSubmitHandle = this.onTenantSubmitHandle.bind(this);
      this.updateMetrics = this.updateMetrics.bind(this);
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

    onVersionSelect(value) {
      let pkg_versions = this.state.pkg_versions;
      pkg_versions.forEach(pkgv => {
        if (pkgv.version === value) {
          let updated_pkg = {
            id: pkgv.id,
            name: pkgv.name,
            version: pkgv.version,
            use_present_version: pkgv.use_present_version,
            repos: pkgv.repos
          };
          let repo_6 = '';
          let repo_7 = '';

          for (let i = 0; i < pkgv.repos.length; i++) {
            if (pkgv.repos[i].split('(')[1].slice(0, -1) === 'CentOS 6')
              repo_6 = pkgv.repos[i];

            if (pkgv.repos[i].split('(')[1].slice(0, -1) === 'CentOS 7')
              repo_7 = pkgv.repos[i];
          }

          this.setState({
            pkg: updated_pkg,
            repo_6: repo_6,
            repo_7: repo_7,
            disabled_button: false
          });
        };
      });
    };

    onSubmitHandle(values, actions) {
      let msg = undefined;
      let title = undefined;

      if (!this.addview && !cloneview) {
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

    async onTenantSubmitHandle(values, actions) {
      try {
        let response = await fetch(
          `/api/v2/internal/updatemetricsversions/${values.name}-${values.version}`,
        )

        if (response.ok) {
          let json = await response.json();
          let msgs = [];
          if ('updated' in json)
            msgs.push(json['updated']);

          if ('deleted' in json)
            msgs.push(json['deleted']);

          if ('warning' in json)
            msgs.push(json['warning']);

          let title = 'Update metrics';

          msgs.push('ARE YOU SURE you want to update metrics?')

          this.toggleAreYouSureSetModal(
            <div>
              {msgs.map((m, i) => <p key={i}>{m}</p>)}
            </div>,
            title, () => this.updateMetrics(values, actions)
          );
        } else {
          let error_msg = '';
          try {
            let json = await response.json()
            error_msg = `${response.status} ${response.statusText} ${json.detail}`;
          } catch(err1) {
            error_msg = `${response.status} ${response.statusText}`;
          }
          NotifyError({
            title: 'Error',
            msg: error_msg
          });
        };
      } catch(err) {
        NotifyError({
          title: 'Error',
          msg: `Error fetching metrics data: ${err}`
        });
      };
    };

    async updateMetrics(values, actions) {
      let response = await this.backend.changeObject(
        '/api/v2/internal/updatemetricsversions/',
        {
          name: values.name,
          version: values.version
        }
      );
      if (!response.ok) {
        let err_msg = '';
        try {
          let json = await response.json();
          err_msg = json.detail;
        } catch(err) {
          err_msg = 'Error updating metrics';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: err_msg
        });
      } else {
        let json = await response.json();
        if ('updated' in json)
          NotifyOk({
            msg: json.updated,
            title: 'Updated',
            callback: () => this.history.push('/ui/administration/packages')
          });
        if ('warning' in json)
          NotifyWarn({msg: json.warning, title: 'Warning'});

        if ('deleted' in json)
          NotifyWarn({msg: json.deleted, title: 'Deleted'});
      };
    };

    async doChange(values, actions) {
      let repos = [];
      if (values.repo_6)
        repos.push(values.repo_6);

      if (values.repo_7)
        repos.push(values.repo_7);

      if (this.addview || cloneview) {
        let response = await this.backend.addObject(
          '/api/v2/internal/packages/',
          {
            name: values.name,
            version: values.version,
            use_present_version: values.present_version,
            repos: repos
          }
        );
        if (!response.ok) {
          let add_msg = '';
          try {
            let json = await response.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Error adding package';
          }
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: add_msg
          });
        } else {
          NotifyOk({
            msg: 'Package successfully added',
            title: 'Added',
            callback: () => this.history.push('/ui/packages')
          });
        };
      } else {
        let response = await this.backend.changeObject(
          '/api/v2/internal/packages/',
          {
            id: values.id,
            name: values.name,
            version: values.version,
            use_present_version: values.present_version,
            repos: repos
          }
        );
        if (!response.ok) {
          let change_msg = '';
          try {
            let json = await response.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Error changing package';
          }
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: change_msg
          });
        } else {
          NotifyOk({
            msg: 'Package successfully changed',
            title: 'Changed',
            callback: () => this.history.push('/ui/packages')
          });
        };
      };
    };

    async doDelete(nameversion) {
      let response = await this.backend.deleteObject(`/api/v2/internal/packages/${nameversion}`);
      if (!response.ok) {
        let msg = '';
        try {
          let json = await response.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Error deleting package';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: msg
        });
      } else {
        NotifyOk({
          msg: 'Package successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/packages')
        });
      };
    };

    toggleCheckbox(){
      this.setState({present_version: !present_version});
    };

    async componentDidMount() {
      this.setState({loading: true});

      try {
        let repos = await this.backend.fetchData('/api/v2/internal/yumrepos');
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
            loading: false
          });
        } else {
          let pkg = await this.backend.fetchData(`/api/v2/internal/packages/${this.nameversion}`);
          let probes = await this.backend.fetchData('/api/v2/internal/version/probe');
          let pkg_versions = await this.backend.fetchData(`/api/v2/internal/packageversions/${pkg.name}`);
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
            if (e.fields.package === `${pkg.name} (${pkg.version})`)
              list_probes.push(e.fields.name);
          });
          this.setState({
            pkg: pkg,
            list_repos_6: list_repos_6,
            list_repos_7: list_repos_7,
            repo_6: repo_6,
            repo_7: repo_7,
            list_probes: list_probes,
            pkg_versions: pkg_versions,
            loading: false
          });
        };
      } catch(err) {
        this.setState({
          error: err,
          loading: false
        });
      };
    };

    render() {
      const { pkg, repo_6, repo_7, list_repos_6, list_repos_7,
        list_probes, pkg_versions, loading, present_version, error } = this.state;

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && list_repos_6) {
        return (
          <BaseArgoView
            resourcename={this.disabled ? 'Package details' : 'package'}
            infoview={this.disabled}
            location={this.location}
            addview={this.addview}
            cloneview={cloneview}
            clone={true}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
            history={false}
          >
            <Formik
              initialValues = {{
                id: pkg.id,
                name: pkg.name,
                version: pkg.version,
                repo_6: repo_6,
                repo_7: repo_7,
                present_version: present_version
              }}
              onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
              validationSchema={PackageSchema}
              enableReinitialize={true}
              render = {props => (
                <Form>
                  <FormGroup>
                    <Row className='align-items-center'>
                      <Col md={6}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                          <Field
                            type='text'
                            name='name'
                            className={`form-control ${props.errors.name && 'border-danger'}`}
                            id='name'
                            disabled={this.disabled}
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
                        <Row>
                          <Col md={12}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
                          {
                            this.disabled ?
                              <Field
                                component='select'
                                name='version'
                                className='form-control custom-select'
                                id='version'
                                onChange={e => this.onVersionSelect(e.target.value)}
                              >
                                {
                                  pkg_versions.map((version, i) =>
                                    <option key={i} value={version.version}>{version.version}</option>
                                  )
                                }
                              </Field>
                            :
                              <Field
                                type='text'
                                name='version'
                                value={props.values.present_version ? 'present' : props.values.version}
                                disabled={props.values.present_version}
                                className={`form-control ${props.errors.version && 'border-danger'}`}
                                id='version'
                              />
                          }
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
                      </Col>
                      {
                        !this.disabled &&
                          <Col md={3}>
                            <Field
                              component={Checkbox}
                              name='present_version'
                              className='form-control'
                              id='checkbox'
                              label='Use version which is present in repo'
                              onChange={this.toggleCheckbox}
                            />
                          </Col>
                      }
                    </Row>
                  </FormGroup>
                  <FormGroup>
                    <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Yum repo</h4>
                    <Row>
                      <Col md={8}>
                        {
                          this.disabled ?
                            <InputGroup>
                              <InputGroupAddon addonType='prepend'>CentOS 6 repo</InputGroupAddon>
                              <Field
                                type='text'
                                className='form-control'
                                name='repo_6'
                                id='repo_6'
                                disabled={true}
                              />
                            </InputGroup>
                          :
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
                        }
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
                        {
                          this.disabled ?
                            <InputGroup>
                              <InputGroupAddon addonType='prepend'>CentOS 7 repo</InputGroupAddon>
                              <Field
                                type='text'
                                className='form-control'
                                name='repo_7'
                                id='repo_7'
                                disabled={true}
                              />
                            </InputGroup>
                          :
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
                        }
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
                      (!this.addview && !cloneview && list_probes.length > 0) &&
                        <Row className='mt-3'>
                          <Col md={8}>
                            Probes:
                            <div>
                              {
                                list_probes
                                  .map((e, i) => <Link key={i} to={`/ui/probes/${e}/history/${props.values.version}`}>{e}</Link>)
                                  .reduce((prev, curr) => [prev, ', ', curr])
                              }
                            </div>
                          </Col>
                        </Row>
                    }
                  </FormGroup>
                  {
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      {
                        (!this.addview && !cloneview && !this.disabled) ?
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
                      {
                        this.disabled ?
                          <Button
                            color='success'
                            id='import-metrics-button'
                            disabled={this.disabled && this.state.disabled_button}
                            onClick={() => this.onTenantSubmitHandle(props.values)}
                          >
                            Update metrics
                          </Button>
                        :
                          <Button
                            color="success"
                            id="submit-button"
                            type="submit"
                          >
                            Save
                          </Button>
                      }
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
};