import React, { useState, useEffect } from 'react';
import { MetricForm} from './Metrics';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  NotifyWarn,
  ErrorComponent
} from './UIElements';
import { Formik, Form } from 'formik';
import { Button } from 'reactstrap';
import * as Yup from 'yup';
import { useQuery, useQueryClient } from 'react-query';
import { fetchMetricTags, fetchMetricTemplates, fetchMetricTemplateTypes, fetchProbeVersions } from './QueryFunctions';


const MetricTemplateSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  type: Yup.string(),
  probeversion: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  }),
  probeexecutable: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  })
});


export const MetricTemplateComponent = (props) => {
  const probeview = props.probeview;

  var name = undefined;
  if (probeview)
    name = props.match.params.metrictemplatename;
  else
    name = props.match.params.name;

  const location = props.location;
  const addview = props.addview;
  const cloneview = props.cloneview;
  const publicView = props.publicView;
  const tenantview = props.tenantview;
  const history = props.history;

  const backend = new Backend();
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const { data: types, error: typesError, isLoading: typesLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictemplatestypes`,
    () => fetchMetricTemplateTypes(publicView)
  );

  const { data: tags, error: tagsError, isLoading: tagsLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictags`,
    () => fetchMetricTags(publicView)
  );

  const { data: probeVersions, error: probeVersionsError, isLoading: probeVersionsLoading } = useQuery(
    [`${publicView ? 'public_' : ''}probe`, 'version'],
    () => fetchProbeVersions(publicView)
  );

  const { data: metricTemplates, error: metricTemplatesError, isLoading: metricTemplatesLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictemplate`,
    () => fetchMetricTemplates(publicView)
  );

  const {data: metricTemplate, error: metricTemplateError, isLoading: metricTemplateLoading } = useQuery(
    [`${publicView ? 'public_' : ''}_metrictemplate`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates/${name}`);
    },
    {
      enabled: !addview,
      initialData: () => {
        return queryClient.getQueryData(`${publicView ? 'public_' : ''}metrictemplate`)?.find(met => met.name === name)
      }
    }
  );

  const emptyConfig = [
    { 'key': 'maxCheckAttempts', 'value': '' },
    { 'key': 'timeout', 'value': '' },
    { 'key': 'path', 'value': '' },
    { 'key': 'interval', 'value': '' },
    { 'key': 'retryInterval', 'value': '' }
  ];

  const emptyEntry = [ { 'key': '', 'value': '' }];

  function togglePopOver() {
    setPopoverOpen(!popoverOpen);
  }

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    setModalMsg(`Are you sure you want to ${addview || cloneview ? 'add' : 'change'} metric template?`)
    setModalTitle(`${addview || cloneview ? 'Add' : 'Change'} metric template`)
    setModalFlag('submit');
    setFormValues(values);
    toggleAreYouSure();
  }

  async function doChange() {
    function onlyUnique(value, index, self) {
      return self.indexOf(value) == index;
    }

    let tagNames = [];
    formValues.tags.forEach(tag => tagNames.push(tag.value));
    let unique = tagNames.filter( onlyUnique );

    const empty_field = [{ key: '', value: '' }];

    if (addview || cloneview) {
      let cloned_from = undefined;
      if (cloneview) {
        cloned_from = formValues.id;
      } else {
        cloned_from = '';
      }

      let response = await backend.addObject(
        '/api/v2/internal/metrictemplates/',
        {
          cloned_from: cloned_from,
          name: formValues.name,
          probeversion: formValues.type === 'Active' ? formValues.probeversion : '',
          mtype: formValues.type,
          tags: unique,
          description: formValues.description,
          probeexecutable: formValues.type === 'Active' ? formValues.probeexecutable : '',
          parent: formValues.parent,
          config: formValues.type === 'Active' ? formValues.config : empty_field,
          attribute: formValues.type === 'Active' ? formValues.attributes : empty_field,
          dependency: formValues.type === 'Active' ? formValues.dependency : empty_field,
          parameter: formValues.type === 'Active' ? formValues.parameter : empty_field,
          flags: formValues.flags,
          files: formValues.type === 'Active' ? formValues.file_attributes : empty_field,
          fileparameter: formValues.type === 'Active' ? formValues.file_parameters : empty_field
        }
      );

      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = json.detail;
        } catch(err) {
          add_msg = 'Error adding metric template';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        NotifyOk({
          msg: 'Metric template successfully added',
          title: 'Added',
          callback: () => history.push('/ui/metrictemplates')
        });
      }
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/metrictemplates/',
        {
          id: formValues.id,
          name: formValues.name,
          probeversion: formValues.type === 'Active' ? formValues.probeversion : '',
          mtype: formValues.type,
          tags: unique,
          description: formValues.description,
          probeexecutable: formValues.type === 'Active' ? formValues.probeexecutable : '',
          parent: formValues.parent,
          config: formValues.type === 'Active' ? formValues.config : empty_field,
          attribute: formValues.type === 'Active' ? formValues.attributes : empty_field,
          dependency: formValues.type === 'Active' ? formValues.dependency : empty_field,
          parameter: formValues.type === 'Active' ? formValues.parameter : empty_field,
          flags: formValues.flags,
          files: formValues.type === 'Active' ? formValues.file_attributes : empty_field,
          fileparameter: formValues.type === 'Active' ? formValues.file_parameters : empty_field

        }
      );

      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = json.detail;
        } catch(err) {
          change_msg = 'Error changing metric template';
        }
        (response.status == '418') ?
          NotifyWarn({
            title: `Warning: ${response.status} ${response.statusText}`,
            msg: change_msg
          })
        :
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: change_msg
          })
      } else {
        NotifyOk({
          msg: 'Metric template successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/metrictemplates')
        });
      }
    }
  }

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/metrictemplates/${name}`);
    if (response.ok)
      NotifyOk({
        msg: 'Metric template successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/metrictemplates')
      });
    else {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting metric template';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    }
  }

  if ((metricTemplateLoading) || typesLoading || tagsLoading || probeVersionsLoading || metricTemplatesLoading)
    return (<LoadingAnim/>)

  else if (metricTemplateError)
    return (<ErrorComponent error={metricTemplateError.message}/>);

  else if (typesError)
    return (<ErrorComponent error={typesError.message}/>);

  else if (tagsError)
    return (<ErrorComponent error={tagsError.message}/>);

  else if (probeVersionsError)
    return (<ErrorComponent error={probeVersionsError.message}/>);

  else if (metricTemplatesError)
    return (<ErrorComponent error={metricTemplatesError.message}/>);

  else {
    var tagsMT = [];
    if (metricTemplate)
      metricTemplate.tags.forEach(tag => tagsMT.push({ value: tag, label: tag }));

    var allTags = [];
    tags.forEach(tag => allTags.push({ value: tag, label: tag }))

    return (
      <BaseArgoView
        resourcename={(tenantview || publicView) ? 'Metric template details' : 'metric template'}
        location={location}
        addview={addview}
        tenantview={tenantview}
        publicview={publicView}
        history={!probeview}
        cloneview={cloneview}
        clone={!publicView}
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
            id: metricTemplate ? metricTemplate.id : '',
            name: metricTemplate ? metricTemplate.name : '',
            probeversion: metricTemplate ? metricTemplate.probeversion : '',
            type: metricTemplate ? metricTemplate.mtype : 'Active',
            description: metricTemplate ? metricTemplate.description : '',
            probeexecutable: metricTemplate ? metricTemplate.probeexecutable : '',
            parent: metricTemplate ? metricTemplate.parent : '',
            config: metricTemplate ? metricTemplate.config : emptyConfig,
            attributes: metricTemplate && metricTemplate.attribute.length > 0 ? metricTemplate.attribute : emptyEntry,
            dependency: metricTemplate && metricTemplate.dependency.length > 0 ? metricTemplate.dependency : emptyEntry,
            parameter: metricTemplate && metricTemplate.parameter.length > 0 ? metricTemplate.parameter : emptyEntry,
            flags: metricTemplate && metricTemplate.flags.length > 0 ? metricTemplate.flags : emptyEntry,
            file_attributes: metricTemplate && metricTemplate.files.length > 0 ? metricTemplate.files : emptyEntry,
            file_parameters: metricTemplate && metricTemplate.fileparameter.length > 0 ? metricTemplate.fileparameter : emptyEntry,
            tags: tagsMT,
            probe: metricTemplate && metricTemplate.probeversion  ? probeVersions.find(prv => prv.object_repr === metricTemplate.probeversion).fields : {'package': ''}
          }}
          onSubmit = {(values) => onSubmitHandle(values)}
          validationSchema={MetricTemplateSchema}
          enableReinitialize={true}
        >
          {props => (
            <Form data-testid='metric-form'>
              <MetricForm
                {...props}
                obj_label='metrictemplate'
                isTenantSchema={tenantview}
                publicView={publicView}
                addview={addview}
                popoverOpen={popoverOpen}
                togglePopOver={togglePopOver}
                types={types}
                alltags={allTags}
                probeversions={probeVersions}
                metrictemplatelist={metricTemplates.map(met => met.name)}
              />
              {
                (!tenantview && !publicView) &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                    {
                      (!addview && !cloneview) ?
                        <Button
                          color="danger"
                          onClick={() => {
                            setModalMsg('Are you sure you want to delete metric template?');
                            setModalTitle('Delete metric template');
                            setModalFlag('delete');
                            toggleAreYouSure();
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
        </Formik>
      </BaseArgoView>
    );
  }
}


export const MetricTemplateVersionDetails = (props) => {
  const name = props.match.params.name;
  const version = props.match.params.version;
  const publicView = props.publicView;

  const [metricTemplate, setMetricTemplate] = useState(null);
  const [probe, setProbe] = useState({'package': ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const backend = new Backend();
    setLoading(true);

    async function fetchData() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/metrictemplate/${name}`);
        json.forEach(async (e) => {
          if (e.version == version) {
            let probes = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe/${e.fields.probeversion.split(' ')[0]}`);
            probes.forEach(prb => {
              if (prb.object_repr === e.fields.probeversion)
                setProbe(prb.fields);
            });
            let mt = e.fields;
            mt.date_created = e.date_created;
            setMetricTemplate(mt);
          }
        });
      } catch(err) {
        setError(err);
      }

      setLoading(false);
    }

    fetchData();
  }, [publicView, name, version]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && metricTemplate) {
    return (
      <BaseArgoView
        resourcename={`${name} ${metricTemplate.probeversion && `[${metricTemplate.probeversion}]`}`}
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: metricTemplate.name,
            probeversion: metricTemplate.probeversion,
            type: metricTemplate.mtype,
            probeexecutable: metricTemplate.probeexecutable,
            description: metricTemplate.description,
            parent: metricTemplate.parent,
            config: metricTemplate.config,
            attributes: metricTemplate.attribute,
            dependency: metricTemplate.dependency,
            parameter: metricTemplate.parameter,
            flags: metricTemplate.flags,
            file_attributes: metricTemplate.files,
            file_parameters: metricTemplate.fileparameter,
            probe: probe,
            tags: metricTemplate.tags
          }}
        >
          {props => (
            <Form>
              <MetricForm
                {...props}
                obj_label='metrictemplate'
                isHistory={true}
              />
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    );
  } else
    return null;
};
