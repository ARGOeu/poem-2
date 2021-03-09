import React, { useState } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable,
  CustomErrorMessage
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
  ], [isTenantSchema, listTags]);

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


export const YumRepoComponent = (props) => {
  var name = undefined;
  var tag = undefined;
  if (props.match.params.name) {
    tag = props.match.params.name.split('-')[props.match.params.name.split('-').length - 1];
    name = props.match.params.name.replace('-' + tag, '');
  }

  const addview = props.addview;
  const cloneview = props.cloneview;
  const disabled = props.disabled;
  const location = props.location;
  const history = props.history;

  const backend = new Backend();

  const { data: repo, error: errorRepo, isLoading: loadingRepo } = useQuery(
    `yumrepo_${name}_${tag}_${cloneview ? 'cloneview' : 'changeview'}`,
    async () => {
      if (!addview) {
        let repo = await backend.fetchData(`/api/v2/internal/yumrepos/${name}/${tag}`);

        return repo;
      }
    },
    { enabled: !addview }
  );

  const { data: tags, error: errorTags, isLoading: loadingTags } = useQuery(
    'yumrepo_changeview_tags', async () => {
      let tags = await backend.fetchData('/api/v2/internal/ostags');
      return tags;
    }
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} YUM repo?`;
    let title = `${addview || cloneview ? 'Add' : 'Change'} YUM repo`;

    setModalMsg(msg);
    setModalTitle(title);
    setModalFlag('submit');
    setFormValues(values);
    toggleAreYouSure();
  }

  async function doChange() {
    if (addview || cloneview) {
      let response = await backend.addObject(
        '/api/v2/internal/yumrepos/',
        {
          name: formValues.name,
          tag: formValues.tag,
          content: formValues.content,
          description: formValues.description
        }
      );
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = json.detail;
        } catch(err) {
          add_msg = 'Error adding YUM repo';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        NotifyOk({
          msg: 'YUM repo successfully added',
          title: 'Added',
          callback: () => history.push('/ui/yumrepos')
        });
      }
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/yumrepos/',
        {
          id: formValues.id,
          name: formValues.name,
          tag: formValues.tag,
          content: formValues.content,
          description: formValues.description
        }
      );
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = json.detail;
        } catch(err) {
          change_msg = 'Error changing YUM repo';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        NotifyOk({
          msg: 'YUM repo successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/yumrepos')
        });
      }
    }
  }

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/yumrepos/${name}/${tag}`);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting YUM repo';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      NotifyOk({
        msg: 'YUM repo successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/yumrepos')
      });
    }
  }

  if (loadingRepo || loadingTags)
    return (<LoadingAnim/>);

  else if (errorRepo)
    return (<ErrorComponent error={errorRepo}/>);

  else if (errorTags)
    return (<ErrorComponent error={errorTags}/>);

  else if (!loadingRepo && !loadingTags && tags) {
    return (
      <BaseArgoView
        resourcename={`${disabled ? 'YUM repo details' : 'YUM repo'}`}
        location={location}
        addview={addview}
        cloneview={cloneview}
        infoview={disabled}
        clone={!disabled}
        history={false}
        modal={true}
        state={{
          areYouSureModal,
          modalTitle,
          modalMsg,
          'modalFunc': modalFlag === 'submit' ?
            doChange
          :
            modalFlag === 'delete' ?
              doDelete
            :
              undefined
        }}
        toggle={toggleAreYouSure}
      >
        <Formik
          initialValues = {{
            id: repo ? repo.id : '',
            name: repo ? repo.name : '',
            tag: repo ? repo.tag : 'CentOS 6',
            content: repo ? repo.content : '',
            description: repo ? repo.description : ''
          }}
          onSubmit = {(values) => onSubmitHandle(values)}
          validationSchema={RepoSchema}
          enableReinitialize={true}
        >
          {props => (
            <Form>
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        className={`form-control ${props.errors.name && props.touched.name && 'border-danger'}`}
                        id='name'
                        data-testid='name'
                        disabled={disabled}
                      />
                    </InputGroup>
                    <CustomErrorMessage name='name' />
                    <FormText color='muted'>
                      Name of YUM repo file.
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Tag</InputGroupAddon>
                      {
                        disabled ?
                          <Field
                            type='text'
                            name='tag'
                            className='form-control'
                            id='tag'
                            data-testid='tag'
                            disabled={true}
                          />
                        :
                          <Field
                            component='select'
                            name='tag'
                            className='form-control custom-select'
                            data-testid='tag'
                            id='tag'
                          >
                            {
                              tags.map((name, i) =>
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
                      className={`form-control ${props.errors.content && props.touched.content && 'border-danger'}`}
                      id='content'
                      disabled={disabled}
                    />
                    <CustomErrorMessage name='content' />
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
                      className={`form-control ${props.errors.description && props.touched.description && 'border-danger'}`}
                      id='description'
                      disabled={disabled}
                    />
                    <CustomErrorMessage name='description' />
                    <FormText color='muted'>
                      Short free text description.
                    </FormText>
                  </Col>
                </Row>
              </FormGroup>
              {
                (!disabled) &&
                <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                  {
                    (!addview && !cloneview) ?
                      <Button
                        color='danger'
                        onClick={() => {
                          setModalMsg('Are you sure you want to delete YUM repo?');
                          setModalTitle('Delete YUM repo');
                          setModalFlag('delete');
                          toggleAreYouSure();
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
        </Formik>
      </BaseArgoView>
    )
  } else
    return null;
};
