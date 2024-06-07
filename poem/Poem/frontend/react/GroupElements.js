import React, { useState } from 'react';
import { Backend } from './DataManager';
import {
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  Icon,
  SearchField,
  BaseArgoTable
} from './UIElements';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  FormGroup,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupText,
  Input,
  Form,
  FormFeedback,
  Table
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { fetchUserGroups } from './QueryFunctions';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from "yup";
import { 
  ChangeViewPlaceholder,
  InputPlaceholder,
  ListViewPlaceholder 
} from './Placeholders';


const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("This field is required")
    .matches(/^[a-zA-Z][A-Za-z0-9\-_]*$/, "Name can contain alphanumeric characters, dash and underscore, but must always begin with a letter")
})


export const GroupList = (props) => {
  const name = props.name;
  const location = useLocation();
  const id = props.id;
  const group = props.group;

  const { data: groups, error: error, status: status} = useQuery(
    'usergroups', () => fetchUserGroups(true)
  )

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: name.charAt(0).toUpperCase() + name.slice(1),
        accessor: e =>
          <Link to={`/ui/administration/${id}/${e}`}>
            {e}
          </Link>,
        column_width: '98%'
      }
    ], [name, id]
  );

  if (status === 'loading')
    return (<ListViewPlaceholder resourcename={ name } />);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (groups)
    return (
      <BaseArgoView
        resourcename={name}
        location={location}
        listview={true}>
        <BaseArgoTable
          data={groups[group]}
          columns={columns}
          page_size={10}
          resourcename='groups'
        />
      </BaseArgoView>
    );

  else
    return null;
};


const GroupChangeForm = ({ id, items, freeItems, group, groupname, title, addview, location }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const backend = new Backend();

  const changeMutation = useMutation(async (values) => await backend.changeObject(`/api/v2/internal/${group}group/`, values));
  const addMutation = useMutation(async (values) => await backend.addObject(`/api/v2/internal/${group}group/`, values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/${group}group/${groupname}`));

  const [newItems, setNewItems] = useState([]);
  const [areYouSureModal, setAreYouSureModal] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);

  const { control, getValues, setValue, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: !addview ? groupname : "",
      items: items ? items : [],
      freeItems: freeItems.map(itm => new Object({ value: itm, label: itm })),
      searchItems: ""
    },
    resolver: yupResolver(validationSchema)
  })

  const searchItems = useWatch({ control, name: "searchItems" })
  const watchedItems = useWatch({ control, name: "items" })

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle() {
    setModalMsg(`Are you sure you want to ${addview ? 'add' : 'change'} group of ${title}?`)
    setModalTitle(`${addview ? 'Add' : 'Change'} group of ${title}`)
    setModalFlag('submit')
    toggleAreYouSure()
  }

  function onDeleteHandle() {
    setModalMsg(`Are you sure you want to delete group of ${title}?`)
    setModalTitle(`Delete group of ${title}`)
    setModalFlag('delete')
    toggleAreYouSure()
  }

  function doChange() {
    let formValues = getValues()

    const sendValues = new Object({
      name: formValues.name,
      items: formValues.items
    })
    if (!addview) {
      changeMutation.mutate(sendValues, {
        onSuccess: () => {
          queryClient.invalidateQueries(`${group}group`);
          queryClient.invalidateQueries('metric');
          queryClient.invalidateQueries('public_metric');
          NotifyOk({
            msg: `Group of ${title} successfully changed`,
            title: 'Changed',
            callback: () => navigate(`/ui/administration/${id}`)
          });
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : `Error changing group of ${title}`
          })
        }
      })
    } else {
      addMutation.mutate(sendValues, {
        onSuccess: () => {
          queryClient.invalidateQueries(`${group}group`);
          queryClient.invalidateQueries('metric');
          queryClient.invalidateQueries('public_metric');
          NotifyOk({
            msg: `Group of ${title} successfully added`,
            title: 'Added',
            callback: () => navigate(`/ui/administration/${id}`)
          });
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : `Error adding group of ${title}`
          })
        }
      })
    }
  }

  function doDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries(`${group}group`)
        queryClient.invalidateQueries('metric');
        queryClient.invalidateQueries('public_metric');
        NotifyOk({
          msg: `Group of ${title} successfully deleted`,
          title: 'Deleted',
          callback: () => navigate(`/ui/administration/${id}`)
        });
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : `Error deleting group of ${title}`
        })
      }
    })
  }

  return (
    <BaseArgoView
      resourcename={`group of ${title}`}
      location={location}
      addview={addview}
      history={false}
      modal={true}
      state={{
        areYouSureModal,
        'modalFunc': modalFlag === 'delete' ?
          doDelete
        :
          modalFlag === 'submit' ?
            doChange
          :
            undefined,
        modalTitle,
        modalMsg
      }}
      toggle={toggleAreYouSure}
    >
      <Form onSubmit={handleSubmit(onSubmitHandle)}>
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={  ({ field }) =>
                    <Input
                      {...field}
                      data-testid="name"
                      className={`form-control ${errors?.name && "is-invalid"}`}
                      disabled={ !addview }
                    />
                  }
                />
                <ErrorMessage
                  errors={errors}
                  name="name"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title={title}/>
          <Row className='mb-2'>
            <Col md={8} data-testid='available_metrics' >
              <Select
                closeMenuOnSelect={false}
                placeholder={`Search available ${title}`}
                noOptionsMessage={() => `No available ${title}`}
                isMulti
                onChange={e => setNewItems(e)}
                openMenuOnClick={true}
                value={newItems}
                options={getValues("freeItems")}
              />
            </Col>
            <Col md={2}>
              <Button
                color='success'
                onClick={() => {
                  let itms = getValues("items")
                  let fitms = getValues("freeItems")
                  for (let i = 0; i < fitms.length; i++) {
                    if (newItems.includes(fitms[i])) {
                      fitms.splice(i, 1);
                      i--;
                    }
                  }
                  newItems.forEach(i => itms.push(i.value));
                  setValue("items", itms.sort());
                  setValue("freeItems", fitms)
                  setNewItems([]);
                }}
              >
                {`Add new ${title} to group`}
              </Button>
            </Col>
          </Row>
          <table className='table table-bordered table-sm table-hover' style={{ width: '85%' }}>
            <thead className='table-active'>
              <tr>
                <th className='align-middle text-center' style={{ width: '5%' }}>#</th>
                <th style={{ width: '90%' }}><Icon i={group === 'aggregations' ? 'aggregationprofiles' : group}/> {`${title.charAt(0).toUpperCase() + title.slice(1)} in group`}</th>
                <th style={{ width: '5%' }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#ECECEC' }}>
                <td className='align-middle text-center'>
                  <FontAwesomeIcon icon={faSearch}/>
                </td>
                <td>
                  <Controller
                    name="searchItems"
                    control={ control }
                    render={ ({ field }) =>
                      <SearchField
                        field={ field }
                        data-testid='search_items'
                        forwardedRef={ field.ref }
                        className="form-control"
                      />
                    }
                  />
                </td>
                <td>{''}</td>
              </tr>
              {
                watchedItems.filter(
                  e => e.toLowerCase().includes(searchItems.toLowerCase())
                ).map((item, index) =>
                  <React.Fragment key={index}>
                    <tr key={index}>
                      <td className='align-middle text-center'>
                        {index + 1}
                      </td>
                      <td>{item}</td>
                      <td className='align-middle ps-3'>
                        <Button
                          size='sm'
                          color='light'
                          type='button'
                          onClick={() => {
                            let updatedItems = getValues("items").filter(updatedRow => updatedRow !== item)
                            let fitms = getValues("freeItems")
                            fitms.push({value: item, label: item})
                            let sorted_fitms = fitms.sort((a, b) => {
                              let comparison = 0
                              if (a.value.toLowerCase() > b.value.toLowerCase())
                                comparison = 1

                              else if (a.value.toLowerCase() < b.value.toLowerCase())
                                comparison = -1

                              return comparison
                            });
                            setValue("items", updatedItems);
                            setValue("freeItems", sorted_fitms);
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes}/>
                        </Button>
                      </td>
                    </tr>
                  </React.Fragment>
                )
              }
            </tbody>
          </table>
        </FormGroup>
        {
          <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
            {
              !addview ?
                <Button
                  color='danger'
                  onClick={() => onDeleteHandle()}
                >
                  Delete
                </Button>
              :
                <div></div>
            }
            <Button
              color='success'
              id='submit-button'
              type='submit'
            >
              Save
            </Button>
          </div>
        }
      </Form>
    </BaseArgoView>
  )
}


export const GroupChange = (props) => {
  const { name: groupname } = useParams();
  const group = props.group;
  const id = props.id;
  const title = props.title;
  const addview = props.addview;

  const location = useLocation();

  const backend = new Backend()

  const { data: items, error: errorItems, isLoading: loadingItems } = useQuery(
    [`${group}group`, groupname], async () => {
      return await backend.fetchResult(`/api/v2/internal/${group}group/${groupname}`);
    },
    {
      enabled: !addview,
      staleTime: Infinity
    }
  )

  const { data: freeItems, error: errorFreeItems, isLoading: loadingFreeItems } = useQuery(
    `${group}group`, async () => {
      return await backend.fetchResult(`/api/v2/internal/${group}group`);
    },
    { staleTime: Infinity }
  )

  if (loadingItems || loadingFreeItems)
    return (
      <ChangeViewPlaceholder
        resourcename={ `group of ${title}` }
        addview={ addview }
      >
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputPlaceholder width="100%" />
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title={title}/>
          <Row className='mb-2'>
            <Col md={8} data-testid='available_metrics' >
              <InputPlaceholder width="100%" />
            </Col>
            <Col md={2}>
              <Button
                color="success"
              >
                { `Add new ${ title } to group` }
              </Button>
            </Col>
          </Row>
          <Table className="placeholder rounded" style={{ height: "400px" }} />
        </FormGroup>
      </ChangeViewPlaceholder>
    )

  else if (errorItems)
    return (<ErrorComponent error={errorItems} />);

  else if (errorFreeItems)
    return(<ErrorComponent error={errorFreeItems} />)

  else if ((items || addview) && freeItems) {
    return (
      <GroupChangeForm id={id} items={items} freeItems={freeItems} group={group} groupname={groupname} title={title} addview={addview} location={location} />
    )
  }
  else
    return null;
}
