import React, { useState } from 'react';
import { Backend } from './DataManager';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable,
  DropdownWithFormText
} from './UIElements';
import {
  FormGroup,
  Label,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupText,
  Form,
  Input,
  FormFeedback
} from 'reactstrap';
import * as Yup from 'yup';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { fetchYumRepos, fetchOStags } from './QueryFunctions';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';


const RepoSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  tag: Yup.string().required('Required'),
  content: Yup.string().required('Required'),
  description: Yup.string().required('Required')
});


export const YumRepoList = (props) => {
  const location = useLocation();
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


const YumRepoForm = ({ repo, tags, name, tag, addview, cloneview, disabled, location }) => {
  const backend = new Backend()
  const queryClient = useQueryClient()
  const navigate = useNavigate();

  const { control, getValues, setValue, handleSubmit, trigger, formState: { errors } } = useForm({
    defaultValues: {
      id: repo ? repo.id : '',
      name: repo ? repo.name : '',
      tag: repo ? repo.tag : '',
      content: repo ? repo.content : '',
      description: repo ? repo.description : ''
    },
    resolver: yupResolver(RepoSchema),
    mode: "onChange"
  })

  const changeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/yumrepos/', values))
  const addMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/yumrepos/', values))
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/yumrepos/${name}/${tag}`))

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalFlag, setModalFlag] = useState(undefined)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal)
  }

  function onSubmitHandle() {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} YUM repo?`
    let title = `${addview || cloneview ? 'Add' : 'Change'} YUM repo`

    setModalMsg(msg)
    setModalTitle(title)
    setModalFlag('submit')
    toggleAreYouSure()
  }

  function doChange() {
    let formValues = getValues()

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
            callback: () => navigate('/ui/yumrepos')
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
            callback: () => navigate('/ui/yumrepos')
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
          callback: () => navigate('/ui/yumrepos')
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
      <Form onSubmit={ handleSubmit(onSubmitHandle) }>
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      className={`form-control ${errors?.name && "is-invalid"}`}
                      data-testid='name'
                      disabled={disabled}
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="name"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
              <FormText color='muted'>
                Name of YUM repo file.
              </FormText>
            </Col>
            <Col md={2}>
              <InputGroup>
                <InputGroupText>Tag</InputGroupText>
                <Controller
                  name="tag"
                  control={ control }
                  render={ ({ field }) =>
                    disabled ?
                      <Input
                        { ...field }
                        className='form-control'
                        data-testid='tag'
                        disabled={true}
                      />
                    :
                      <DropdownWithFormText
                        forwardedRef={ field.ref }
                        error={ errors.tag }
                        onChange={ e => {
                          setValue("tag", e.value)
                          trigger("tag")
                        }}
                        options={ tags }
                        value={ field.value }
                      />
                  }
                />
              </InputGroup>
              {
                errors?.tag &&
                  <div style={{ color: "#dc3545", fontSize: "small" }}>
                    { errors.tag.message }
                  </div>
              }
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
              <Controller
                name="content"
                control={ control }
                render={ ({ field }) =>
                  <textarea
                    { ...field }
                    rows="20"
                    id="content"
                    className={`form-control ${errors?.content && "is-invalid"}`}
                    disabled={disabled}
                  />
                }
              />
              <ErrorMessage
                errors={ errors }
                name="content"
                render={ ({ message }) =>
                  <FormFeedback invalid="true" className="end-0">
                    { message }
                  </FormFeedback>
                }
              />
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
              <Controller
                name="description"
                control={ control }
                render={ ({ field }) =>
                  <textarea
                    { ...field }
                    id="description"
                    rows="5"
                    className={`form-control ${errors?.description && "is-invalid"}`}
                    disabled={disabled}
                  />
                }
              />
              <ErrorMessage
                errors={ errors }
                name="description"
                render={ ({ message }) =>
                  <FormFeedback invalid="true" className="end-0">
                    { message }
                  </FormFeedback>
                }
              />
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
    </BaseArgoView>
  )
}


export const YumRepoComponent = (props) => {
  let { name } = useParams()
  var tag = undefined;

  if (name) {
    tag = name.split('-')[name.split('-').length - 1];
    name = name.replace('-' + tag, '');
  }

  const addview = props.addview;
  const cloneview = props.cloneview;
  const disabled = props.disabled;
  const location = useLocation();

  const backend = new Backend();

  const queryClient = useQueryClient();

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
  )

  const { data: tags, error: errorTags, status: statusTags } = useQuery(
    'ostags', () => fetchOStags()
  )

  if (statusRepo === 'loading' || statusTags === 'loading')
    return (<LoadingAnim/>)

  else if (statusRepo === 'error')
    return (<ErrorComponent error={errorRepo}/>)

  else if (statusTags === 'error')
    return (<ErrorComponent error={errorTags}/>)

  else if (tags && statusRepo !== 'loading' && statusRepo !== 'error') {
    return (
      <YumRepoForm
        repo={repo}
        tags={tags}
        name={name}
        tag={tag}
        addview={addview}
        cloneview={cloneview}
        disabled={disabled}
        location={location}
      />
    )
  } else
    return null
}
