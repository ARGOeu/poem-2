import React, { useState } from 'react';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  Icon,
  SearchField,
  BaseArgoTable
} from './UIElements';
import { Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupAddon} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { fetchUserGroups } from './QueryFunctions';
import { useQuery, useMutation, useQueryClient } from 'react-query';


export const GroupList = (props) => {
  const location = props.location;
  const name = props.name;
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
    return (<LoadingAnim/>);

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


export const GroupChange = (props) => {
  const [searchItem, setSearchItem] = useState('');
  const [newItems, setNewItems] = useState([]);
  const [areYouSureModal, setAreYouSureModal] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const groupname = props.match.params.name;
  const group = props.group;
  const id = props.id;
  const title = props.title;
  const addview = props.addview;

  const location = props.location;
  const history = props.history;

  const queryClient = useQueryClient();

  const backend = new Backend();

  const changeMutation = useMutation(async (values) => await backend.changeObject(`/api/v2/internal/${group}group/`, values));
  const addMutation = useMutation(async (values) => await backend.addObject(`/api/v2/internal/${group}group/`, values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/${group}group/${groupname}`));

  const { data: items, error: errorItems, isLoading: loadingItems } = useQuery(
    [`${group}group`, groupname], async () => {
      return await backend.fetchResult(`/api/v2/internal/${group}group/${groupname}`);
    },
    { enabled: !addview }
  )

  const { data: freeItems, error: errorFreeItems, isLoading: loadingFreeItems } = useQuery(
    `${group}group`, async () => {
      return await backend.fetchResult(`/api/v2/internal/${group}group`);
    }
  )

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    setModalMsg(`Are you sure you want to ${addview ? 'add' : 'change'} group of ${title}?`);
    setModalTitle(`${addview ? 'Add' : 'Change'} group of ${title}`);
    setModalFlag('submit');
    setFormValues(values);
    toggleAreYouSure();
  }

  function onDeleteHandle() {
    setModalMsg(`Are you sure you want to delete group of ${title}?`);
    setModalTitle(`Delete group of ${title}`);
    setModalFlag('delete');
    toggleAreYouSure();
  }

  function doChange() {
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
            callback: () => history.push(`/ui/administration/${id}`)
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
            callback: () => history.push(`/ui/administration/${id}`)
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
          callback: () => history.push(`/ui/administration/${id}`)
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

  if (loadingItems || loadingFreeItems)
    return (<LoadingAnim/>);

  else if (errorItems)
    return (<ErrorComponent error={errorItems} />);

  else if (errorFreeItems)
    return(<ErrorComponent error={errorFreeItems} />)

  else if (freeItems) {
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
        <Formik
          initialValues = {{
            name: !addview ? groupname : '',
            items: items ? items : [],
            freeItems: freeItems.map(itm => new Object({ value: itm, label: itm })),
          }}
          onSubmit = {(values) => onSubmitHandle(values)}
        >
          {(props) => (
            <Form>
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        data-testid='name'
                        required={true}
                        className='form-control'
                        id='groupname'
                        disabled={!addview}
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
                      options={props.values.freeItems}
                    />
                  </Col>
                  <Col md={2}>
                    <Button
                      color='success'
                      onClick={() => {
                        let itms = props.values.items;
                        let fitms = props.values.freeItems;
                        for (let i = 0; i < fitms.length; i++) {
                          if (newItems.includes(fitms[i])) {
                            fitms.splice(i, 1);
                            i--;
                          }
                        }
                        newItems.forEach(i => itms.push(i.value));
                        props.setFieldValue('items', itms.sort());
                        props.setFieldValue('freeItems', fitms)
                        setNewItems([]);
                      }}
                    >
                      {`Add new ${title} to group`}
                    </Button>
                  </Col>
                </Row>
                <table className='table table-bordered table-sm table-hover' style={{width: '85%'}}>
                  <thead className='table-active'>
                    <tr>
                      <th className='align-middle text-center' style={{width: '5%'}}>#</th>
                      <th style={{width: '90%'}}><Icon i={group === 'aggregations' ? 'aggregationprofiles' : group}/> {`${title.charAt(0).toUpperCase() + title.slice(1)} in group`}</th>
                      <th style={{width: '5%'}}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{background: '#ECECEC'}}>
                      <td className='align-middle text-center'>
                        <FontAwesomeIcon icon={faSearch}/>
                      </td>
                      <td>
                        <Field
                          type='text'
                          name='search_items'
                          data-testid='search_items'
                          className='form-control'
                          onChange={(e) => setSearchItem(e.target.value)}
                          component={SearchField}
                        />
                      </td>
                      <td>{''}</td>
                    </tr>
                    {
                      props.values.items.filter(
                        filteredRow => filteredRow.toLowerCase().includes(searchItem.toLowerCase())
                        ).map((item, index) =>
                          <React.Fragment key={index}>
                            <tr key={index}>
                              <td className='align-middle text-center'>
                                {index + 1}
                              </td>
                              <td>{item}</td>
                              <td className='align-middle pl-3'>
                                <Button
                                  size='sm'
                                  color='light'
                                  type='button'
                                  onClick={() => {
                                    let updatedItems = props.values.items.filter(updatedRow => updatedRow !== item);
                                    let fitms = props.values.freeItems;
                                    fitms.push({value: item, label: item});
                                    let sorted_fitms = fitms.sort((a, b) => {
                                      let comparison = 0
                                      if (a.value.toLowerCase() > b.value.toLowerCase())
                                        comparison = 1;

                                      else if (a.value.toLowerCase() < b.value.toLowerCase())
                                        comparison = -1;

                                      return comparison;
                                    });
                                    props.setFieldValue('items', updatedItems);
                                    props.setFieldValue('freeItems', sorted_fitms);
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
          )}
        </Formik>
      </BaseArgoView>
    );
  }
  else
    return null;
};
