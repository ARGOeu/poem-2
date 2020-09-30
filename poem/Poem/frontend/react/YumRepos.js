import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  FancyErrorMessage,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable
} from './UIElements';
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
import { useQuery } from 'react-query';


export const YumRepoChange = YumRepoComponent();
export const YumRepoClone = YumRepoComponent(true);


const RepoSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  content: Yup.string().required('Required'),
  description: Yup.string().required('Required')
});


export const YumRepoList = (props) => {
  const location = props.location;

  const backend = new Backend();

  const { data: listRepos, error: errorListRepos, isLoading: loadingListRepos } = useQuery(
    'yumrepos_listview', async () => {
      let repos = await backend.fetchData('/api/v2/internal/yumrepos');
      return repos;
    }
  );

  const { data: listTags, error: errorListTags, isLoading: loadingListTags } = useQuery(
    'yumrepos_listview_tags', async () => {
      let tags = await backend.fetchData('/api/v2/internal/ostags');
      return tags;
    }
  );

  const { data: isTenantSchema, isLoading: loadingIsTenantSchema } = useQuery(
    'session_istenantschema', async () => {
      let schema = await backend.isTenantSchema();
      return schema;
    }
  );

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%',
    },
    {
      Header: 'Name',
      accessor: 'name',
      column_width: '20%',
      Cell: e =>
        <Link to={`/ui/${isTenantSchema ? 'administration/' : ''}yumrepos/${e.value}-${e.row.original.tag.replace(/\s/g, '').toLowerCase()}`}>{e.value}</Link>,
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Description',
      accessor: 'description',
      column_width: '68%',
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Tag',
      accessor: 'tag',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>,
      Filter: SelectColumnFilter,
      filterList: listTags
    }
  ]);

  if (loadingListRepos || loadingListTags || loadingIsTenantSchema)
    return (<LoadingAnim/>);

  else if (errorListRepos)
    return (<ErrorComponent error={errorListRepos}/>);

  else if (errorListTags)
    return (<ErrorComponent error={errorListTags}/>);

  else if (!loadingListRepos && !loadingListTags && !loadingIsTenantSchema && listRepos) {
    return (
      <BaseArgoView
        resourcename='YUM repo'
        location={location}
        listview={true}
        addnew={!isTenantSchema}
      >
        <BaseArgoTable
          data={listRepos}
          columns={columns}
          className='-highlight'
          page_size={20}
          resourcename='repos'
          filter={true}
        />
      </BaseArgoView>
    )
  }
  else
    return null;
};


function YumRepoComponent(cloneview=false) {
  return class extends Component {
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
        modalMsg: undefined,
        error: null
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

      if (!this.addview || cloneview) {
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

    async doChange(values, actions) {
      if (this.addview || cloneview) {
        let response = await this.backend.addObject(
          '/api/v2/internal/yumrepos/',
          {
            name: values.name,
            tag: values.tag,
            content: values.content,
            description: values.description
          }
        );
        if (!response.ok) {
          let add_msg = '';
          try {
            let json = await response.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Error adding YUM repo';
          };
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: add_msg
          });
        } else {
          NotifyOk({
            msg: 'YUM repo successfully added',
            title: 'Added',
            callback: () => this.history.push('/ui/yumrepos')
          });
        };
      } else {
        let response = await this.backend.changeObject(
          '/api/v2/internal/yumrepos/',
          {
            id: values.id,
            name: values.name,
            tag: values.tag,
            content: values.content,
            description: values.description
          }
        );
        if (!response.ok) {
          let change_msg = '';
          try {
            let json = await response.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Error changing YUM repo';
          };
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: change_msg
          });
        } else {
          NotifyOk({
            msg: 'YUM repo successfully changed',
            title: 'Changed',
            callback: () => this.history.push('/ui/yumrepos')
          });
        };
      };
    };

    async doDelete(name, tag) {
      let response = await this.backend.deleteObject(`/api/v2/internal/yumrepos/${name}/${tag}`);
      if (!response.ok) {
        let msg = '';
        try {
          let json = await response.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Error deleting YUM repo';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: msg
        });
      } else {
        NotifyOk({
          msg: 'YUM repo successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/yumrepos')
        });
      };
    };

    async componentDidMount() {
      this.setState({loading: true});

      try {
        let tags = await this.backend.fetchData('/api/v2/internal/ostags');
        if (!this.addview) {
          let json = await this.backend.fetchData(`/api/v2/internal/yumrepos/${this.name}/${this.tag}`);
          this.setState({
            repo: json,
            tagslist: tags,
            loading: false
          });
        } else {
          this.setState({
            tagslist: tags,
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
      const { repo, tagslist, loading, error } = this.state;

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && repo) {
        return (
          <BaseArgoView
            resourcename='YUM repo'
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
                                className='form-control custom-select'
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
                        (!this.addview && !cloneview) ?
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
};
