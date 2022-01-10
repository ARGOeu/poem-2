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
  CustomError,
  CustomReactSelect
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
  InputGroupText
} from 'reactstrap';
import * as Yup from 'yup';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { fetchYumRepos, fetchOStags } from './QueryFunctions';


const RepoSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  tag: Yup.string().required('Required'),
  content: Yup.string().required('Required'),
  description: Yup.string().required('Required')
});


export const YumRepoList = (props) => {
  const location = props.location;
  const isTenantSchema = props.isTenantSchema;

  const { data: repos, error: errorRepos, status: statusRepos } = useQuery(
    'yumrepo', () => fetchYumRepos()
  );

  const { data: tags, error: errorTags, status: statusTags } = useQuery(
    'ostags', async () => fetchOStags()
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
      filterList: tags
    }
  ], [isTenantSchema, tags]);

  if (statusRepos === 'loading' || statusTags === 'loading')
    return (<LoadingAnim/>);

  else if (statusRepos === 'error')
    return (<ErrorComponent error={errorRepos}/>);

  else if (statusTags === 'error')
    return (<ErrorComponent error={errorTags}/>);

  else if (repos && tags) {
    return (
      <BaseArgoView
        resourcename='YUM repo'
        location={location}
        listview={true}
        addnew={!isTenantSchema}
      >
        <BaseArgoTable
          data={repos}
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

  const queryClient = useQueryClient();
  const changeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/yumrepos/', values));
  const addMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/yumrepos/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/yumrepos/${name}/${tag}`))

  const { data: repo, error: errorRepo, status: statusRepo } = useQuery(
    ['yumrepo', name, tag], async () => {
      if (!addview) {
        return await backend.fetchData(`/api/v2/internal/yumrepos/${name}/${tag}`);
      }
    },
    {
      enabled: !addview,
      initialData: () => {
        return queryClient.getQueryData('yumrepo')?.find(repo => repo.name === name && repo.tag === tag)
      }
    }
  );

  const { data: tags, error: errorTags, status: statusTags } = useQuery(
    'ostags', () => fetchOStags()
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

  function doChange() {
    const sendValues = new Object({
      name: formValues.name,
      tag: formValues.tag,
      content: formValues.content,
      description: formValues.description
    })

    if (addview || cloneview) {
      addMutation.mutate(sendValues, {
        onSuccess: () => {
          queryClient.invalidateQueries('yumrepo');
          NotifyOk({
            msg: 'YUM repo successfully added',
            title: 'Added',
            callback: () => history.push('/ui/yumrepos')
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error adding YUM repo'
          })
        }
      });
    } else {
      const sendValuesChange = new Object({
          ...sendValues,
          id: formValues.id,
      })
      changeMutation.mutate(sendValuesChange, {
        onSuccess: () => {
          queryClient.invalidateQueries('yumrepo');
          NotifyOk({
            msg: 'YUM repo successfully changed',
            title: 'Changed',
            callback: () => history.push('/ui/yumrepos')
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error changing YUM repo'
          })
        }
      })
    }
  }

  function doDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries('yumrepo');
        NotifyOk({
          msg: 'YUM repo successfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/yumrepos')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting YUM repo'
        })
      }
    })
  }

  if (statusRepo === 'loading' || statusTags === 'loading')
    return (<LoadingAnim/>);

  else if (statusRepo === 'error')
    return (<ErrorComponent error={errorRepo}/>);

  else if (statusTags === 'error')
    return (<ErrorComponent error={errorTags}/>);

  else if (tags && statusRepo !== 'loading' && statusRepo !== 'error') {
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
            tag: repo ? repo.tag : '',
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
                      <InputGroupText>Name</InputGroupText>
                      <Field
                        type='text'
                        name='name'
                        className={`form-control ${props.errors.name && 'border-danger'}`}
                        id='name'
                        data-testid='name'
                        disabled={disabled}
                      />
                    </InputGroup>
                    <CustomError error={props.errors.name} />
                    <FormText color='muted'>
                      Name of YUM repo file.
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <InputGroup>
                      <InputGroupText>Tag</InputGroupText>
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
                          <div className='react-select form-control p-0'>
                            <CustomReactSelect
                              name='tag'
                              id='tag'
                              isClearable={ false }
                              inputgroup={ true }
                              error={ props.errors.tag }
                              onChange={ e => props.setFieldValue('tag', e.value) }
                              options={ tags.map(tag => new Object({ label: tag, value: tag })) }
                              value={ props.values.tag ?
                                { label: props.values.tag, value: props.values.tag }
                                : undefined
                              }
                            />
                          </div>
                      }
                    </InputGroup>
                    <CustomError error={props.errors.tag} />
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
                      disabled={disabled}
                    />
                    <CustomError error={props.errors.content} />
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
                      disabled={disabled}
                    />
                    <CustomError error={props.errors.description} />
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
