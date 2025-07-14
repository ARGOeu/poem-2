import React, { useState } from 'react';
import { MetricForm } from './Metrics';
import { Backend } from './DataManager';
import {
  NotifyOk,
  NotifyError,
  NotifyWarn,
  ErrorComponent
} from './UIElements';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchMetricTags, fetchMetricTemplates, fetchMetricTemplateTypes, fetchMetricTemplateVersion, fetchProbeVersion, fetchProbeVersions } from './QueryFunctions';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MetricFormPlaceholder
} from './Placeholders';


export const MetricTemplateComponent = (props) => {
  let { name, metrictemplatename } = useParams();
  const probeview = props.probeview;

  if (probeview) {
    name = metrictemplatename;
  }
  else {
    name;
  }

  const addview = props.addview;
  const cloneview = props.cloneview;
  const publicView = props.publicView;
  const tenantview = props.tenantview;
  const navigate = useNavigate();

  const backend = new Backend();
  const queryClient = useQueryClient();

  const addMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/metrictemplates/', values));
  const changeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/metrictemplates/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/metrictemplates/${name}`));

  const [formValues, setFormValues] = useState(undefined);

  const saveFormValues = (values) => {
    setFormValues(values)
  }

  const emptyConfig = [
    { 'key': 'maxCheckAttempts', 'value': '' },
    { 'key': 'timeout', 'value': '' },
    { 'key': 'path', 'value': '' },
    { 'key': 'interval', 'value': '' },
    { 'key': 'retryInterval', 'value': '' }
  ];

  const emptyEntry = [ { 'key': '', 'value': '' }];

  const { data: types, error: typesError, isLoading: typesLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictemplatestypes`,
    () => fetchMetricTemplateTypes(publicView),
    { enabled: !publicView && !tenantview }
  );

  const { data: tags, error: tagsError, isLoading: tagsLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictags`,
    () => fetchMetricTags(publicView),
    { enabled: !publicView && !tenantview }
  )

  const { data: probeVersions, error: probeVersionsError, isLoading: probeVersionsLoading } = useQuery(
    [`${publicView ? 'public_' : ''}probe`, 'version'],
    () => fetchProbeVersions(publicView)
  );

  const { data: metricTemplates, error: metricTemplatesError, isLoading: metricTemplatesLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictemplate`,
    () => fetchMetricTemplates(publicView),
    { enabled: !publicView && !tenantview }
  );

  const {data: metricTemplate, error: metricTemplateError, isLoading: metricTemplateLoading } = useQuery(
    [`${publicView ? 'public_' : ''}metrictemplate`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates/${name}`);
    },
    {
      enabled: !addview,
      initialData: () => {
        return queryClient.getQueryData(`${publicView ? 'public_' : ''}metrictemplate`)?.find(met => met.name === name)
      }
    }
  );

  function doChange() {
    function onlyUnique(value, index, self) {
      return self.indexOf(value) == index;
    }

    const empty_field = [{ key: '', value: '' }];

    const sendValues = new Object({
      name: formValues.name,
      probeversion: formValues.type === 'Active' ? formValues.probeversion : '',
      mtype: formValues.type,
      tags: formValues.tags.map(tag => tag.value).filter( onlyUnique ),
      description: formValues.description,
      probeexecutable: formValues.type === 'Active' ? formValues.probeexecutable : '',
      parent: formValues.parent,
      config: formValues.type === 'Active' ? formValues.config : empty_field,
      attribute: formValues.type === 'Active' ? formValues.attributes : empty_field,
      dependency: formValues.type === 'Active' ? formValues.dependency : empty_field,
      parameter: formValues.type === 'Active' ? formValues.parameter : empty_field,
      flags: formValues.flags
    })

    if (addview || cloneview) {
      let cloned_from = undefined;
      if (cloneview) {
        cloned_from = formValues.id;
      } else {
        cloned_from = '';
      }

      addMutation.mutate({ ...sendValues, cloned_from: cloned_from }, {
        onSuccess: (data) => {
          queryClient.invalidateQueries('public_metrictemplate');
          queryClient.invalidateQueries('metrictemplate');
          NotifyOk({
            msg: 'Metric template successfully added',
            title: 'Added',
            callback: () => navigate('/ui/metrictemplates')
          })

          if (data && "warning" in data)
            NotifyWarn({ msg: data.warning, title: "Warning" })
        },
        onError: (error) => {
          NotifyError({
            msg: error.message ? error.message : 'Error adding metric template',
            title: 'Error'
          })
        }
      })
    } else {
      changeMutation.mutate({ ...sendValues, id: formValues.id }, {
        onSuccess: (data) => {
          queryClient.invalidateQueries('public_metrictemplate');
          queryClient.invalidateQueries('metrictemplate');
          NotifyOk({
            msg: 'Metric template successfully changed',
            title: 'Changed',
            callback: () => navigate('/ui/metrictemplates')
          })

          if (data && "warning" in data)
            NotifyWarn({ msg: data.warning, title: "Warning" })
        },
        onError: (error) => {
          if (error.message && error.message.includes('418')) {
            queryClient.invalidateQueries('metrictemplate');
            queryClient.invalidateQueries('public_metrictemplate');
            NotifyWarn({
              title: 'Warning',
              msg: error.message
            })
          }
          else
            NotifyError({
              title: 'Error',
              msg: error.message ? error.message : 'Error changing metric template'
            })
        }
      })
    }
  }

  function doDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries('metrictemplate');
        queryClient.invalidateQueries('public_metrictemplate');
        NotifyOk({
          msg: 'Metric template successfully deleted',
          title: 'Deleted',
          callback: () => navigate('/ui/metrictemplates')
        });
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting metric template'
        });
      }
    })
  }

  if ((metricTemplateLoading) || typesLoading || tagsLoading || probeVersionsLoading || metricTemplatesLoading) 
    return (<MetricFormPlaceholder obj_label="metrictemplate" { ...props } />)

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

  else if ((addview || metricTemplate) && (publicView || tenantview || (metricTemplates && types && tags)) && probeVersions) {
    return (
      <MetricForm
        { ...props }
        obj_label='metrictemplate'
        resourcename={ (tenantview || publicView) ? 'Metric template details' : 'metric template' }
        initValues = {{
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
          tags: metricTemplate ? metricTemplate.tags.map(item => new Object({ value: item, label: item })) : [],
          probe: metricTemplate && metricTemplate.probeversion ? probeVersions.find(prv => prv.object_repr === metricTemplate.probeversion).fields : {'package': ''}
        }}
        isTenantSchema={ tenantview }
        saveFormValues={ (val) => saveFormValues(val) }
        doChange={ doChange }
        doDelete={ doDelete }
        types={ types ? types : [] }
        alltags={ tags ? tags.map(tag => new Object({ value: tag.name, label: tag.name })) : [] }
        probeversions={ probeVersions }
        metrictemplatelist={ metricTemplates ? metricTemplates.map(met => met.name) : [] }
      />
    );
  } else
    return null
}


export const MetricTemplateVersionDetails = (props) => {
  const { name, version } = useParams();
  const publicView = props.publicView;

  const { data: mts, error: errorMts, isLoading: loadingMts } = useQuery(
    [`${publicView ? 'public_' : ''}metrictemplate`, 'version', name],
    () => fetchMetricTemplateVersion(publicView, name)
  )

  const mtProbe = mts?.find(met => met.version === version).fields.probeversion.split(' ')[0];

  const { data: probes, error: errorProbes, isLoading: loadingProbes } = useQuery(
    [`${publicView ? 'public_' : ''}probe`, 'version', mtProbe],
    () => fetchProbeVersion(publicView, mtProbe),
    { enabled: !!mtProbe }
  )

  if (loadingMts || loadingProbes) 
    return (
      <MetricFormPlaceholder 
        obj_label='metrictemplate'
        title={ `${name} [${version}]`}
        historyview={ true }
      />
    )

  else if (errorMts)
    return (<ErrorComponent error={errorMts}/>);

  else if (errorProbes)
    return (<ErrorComponent error={errorProbes} />)

  else if (mts) {
    const mtVer = mts.find(met => met.version == version);
    const metricTemplate = {
      ...mtVer.fields,
      date_created: mtVer.date_created
    };
    const probe = probes ?
      probes.find(prb => prb.object_repr === mtVer.fields.probeversion).fields
    :
      { package : '' };

    return (
      <MetricForm
        {...props}
        initValues={{
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
          probe: probe,
          tags: metricTemplate.tags
        }}
        obj_label='metrictemplate'
        resourcename={ `${name} ${metricTemplate.probeversion && `[${metricTemplate.probeversion}]`}` }
        isHistory={ true }
      />
    )
  } else
    return null;
};
