import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  FancyErrorMessage,
  NotifyOk,
  DropdownFilterComponent
} from './UIElements';
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
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  content: Yup.string().required('Required'),
  description: Yup.string().required('Required')
});


export class YumRepoList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      loading: false,
      list_repos: null,
      list_tags: null,
      isTenantSchema: null,
      search_name: '',
      search_description: '',
      search_tag: ''
    };

    this.backend = new Backend();
  };

  componentDidMount() {
    this.setState({loading: true});

    Promise.all([
      this.backend.fetchData('/api/v2/internal/yumrepos'),
      this.backend.fetchData('/api/v2/internal/ostags'),
      this.backend.isTenantSchema()
    ])
      .then(([repos, tags, isTenantSchema]) => {
        this.setState({
          list_repos: repos,
          list_tags: tags,
          isTenantSchema: isTenantSchema,
          loading: false
        });
      });
  };

  render() {
    var { list_repos, isTenantSchema, loading } = this.state;
    let repolink = undefined;

    if (!isTenantSchema)
      repolink = '/ui/yumrepos/';
    else
      repolink = '/ui/administration/yumrepos/'

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
          <Link to={repolink + e.name + '-' + e.tag.replace(/\s/g, '').toLowerCase()}>{`${e.name} (${e.tag})`}</Link>,
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
      },
      {
        Header: 'Tag',
        accessor: 'tag',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: (
          <DropdownFilterComponent
            value={this.state.tag}
            onChange={e => this.setState({search_tag: e.target.value})}
            data={this.state.list_tags}
          />
        )
      }
    ];


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

    if (this.state.search_tag) {
      list_repos = list_repos.filter(row =>
        row.tag.toLowerCase().includes(this.state.search_tag.toLowerCase())
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
          addnew={!isTenantSchema}
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
    if (props.match.params.name) {
      this.tag = props.match.params.name.split('-')[props.match.params.name.split('-').length - 1];
      this.name = props.match.params.name.replace('-' + this.tag, '');
    }
    this.addview = props.addview;
    this.disabled = props.disabled;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      repo: {
        id: '',
        name: '',
        tag: 'CentOS 6',
        content: '',
        description: ''
      },
      tagslist: [],
      loading: false,
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
      this.backend.changeObject(
        '/api/v2/internal/yumrepos/',
        {
          id: values.id,
          name: values.name,
          tag: values.tag,
          content: values.content,
          description: values.description
        }
      ).then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'YUM repo successfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/yumrepos')
            });
          }
        })
    } else {
      this.backend.addObject(
        '/api/v2/internal/yumrepos/',
        {
          name: values.name,
          tag: values.tag,
          content: values.content,
          description: values.description
        }
      ).then(response => {
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

  doDelete(name, tag) {
    this.backend.deleteObject(`/api/v2/internal/yumrepos/${name}/${tag}`)
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
  };

  componentDidMount() {
    this.setState({loading: true});
    this.backend.fetchData('/api/v2/internal/ostags')
      .then(tags => {
        if (!this.addview) {
          this.backend.fetchData(`/api/v2/internal/yumrepos/${this.name}/${this.tag}`)
            .then(json => {
              this.setState({
                repo: json,
                tagslist: tags,
                loading: false
              });
            });
        } else {
          this.setState({
            tagslist: tags,
            loading: false
          });
        };
      });
  };

  render() {
    const { repo, tagslist, loading } = this.state;

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
          history={false}
        >
          <Formik
            initialValues = {{
              id: repo.id,
              name: repo.name,
              tag: repo.tag,
              content: repo.content,
              description: repo.description
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            validationSchema={RepoSchema}
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
                          disabled={this.disabled}
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
                    <Col md={2}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Tag</InputGroupAddon>
                        {
                          this.disabled ?
                            <Field
                              type='text'
                              name='tag'
                              className='form-control'
                              id='tag'
                              disabled={true}
                            />
                          :
                            <Field
                              component='select'
                              name='tag'
                              className='form-control'
                              id='tag'
                            >
                              {
                                tagslist.map((name, i) =>
                                  <option key={i} value={name}>{name}</option>
                                )
                              }
                            </Field>
                        }
                      </InputGroup>
                      <FormText color='muted'>
                        OS tag.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <Row>
                    <Col md={8}>
                      <Label for='content'>File content</Label>
                      <Field
                        component='textarea'
                        name='content'
                        rows='20'
                        className={`form-control ${props.errors.content && 'border-danger'}`}
                        id='content'
                        disabled={this.disabled}
                      />
                      {
                        props.errors.content &&
                          FancyErrorMessage(props.errors.content)
                      }
                      <FormText color='muted'>
                        Content of the repo file.
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
                        rows='5'
                        className={`form-control ${props.errors.description && 'border-danger'}`}
                        id='description'
                        disabled={this.disabled}
                      />
                      {
                        props.errors.description &&
                          FancyErrorMessage(props.errors.description)
                      }
                      <FormText color='muted'>
                        Short free text description.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                {
                  (!this.disabled) &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                    {
                      !this.addview ?
                        <Button
                          color='danger'
                          onClick={() => {
                            this.toggleAreYouSureSetModal(
                              'Are you sure you want to delete YUM repo?',
                              'Delete YUM repo',
                              () => this.doDelete(this.name, this.tag)
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
};
