import json

from Poem.api import serializers
from Poem.api.internal_views.utils import one_value_inline, two_value_inline, \
    inline_metric_for_db
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history, update_comment
from Poem.helpers.metrics_helpers import update_metrics, \
    get_metrics_in_profiles, delete_metrics_from_profile
from Poem.poem.models import Metric, TenantHistory
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError
from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        public_tenant = None
        importable = None
        if name:
            metrictemplates = admin_models.MetricTemplate.objects.filter(
                name=name
            )
            if metrictemplates.count() == 0:
                raise NotFound(status=404, detail='Metric template not found')
        else:
            public_tenant = Tenant.objects.get(
                schema_name=get_public_schema_name()
            )
            metrictemplates = admin_models.MetricTemplate.objects.all()
            if request.tenant != public_tenant:
                avail_metrics = Metric.objects.all().values_list(
                    'name', flat=True
                )
                importable = dict()
                for metrictemplate in metrictemplates:
                    if metrictemplate.name in avail_metrics:
                        importable[metrictemplate.name] = False
                    else:
                        importable[metrictemplate.name] = True

        results = []
        for metrictemplate in metrictemplates:
            config = two_value_inline(metrictemplate.config)
            parent = one_value_inline(metrictemplate.parent)
            probeexecutable = one_value_inline(metrictemplate.probeexecutable)
            attribute = two_value_inline(metrictemplate.attribute)
            dependency = two_value_inline(metrictemplate.dependency)
            flags = two_value_inline(metrictemplate.flags)
            files = two_value_inline(metrictemplate.files)
            parameter = two_value_inline(metrictemplate.parameter)
            fileparameter = two_value_inline(metrictemplate.fileparameter)

            ostag = []
            if metrictemplate.probekey:
                for repo in metrictemplate.probekey.package.repos.all():
                    ostag.append(repo.tag.name)

            tags = []
            for tag in metrictemplate.tags.all():
                tags.append(tag.name)

            if metrictemplate.probekey:
                probeversion = metrictemplate.probekey.__str__()
            else:
                probeversion = ''

            if not name and request.tenant != public_tenant:
                results.append(dict(
                    id=metrictemplate.id,
                    name=metrictemplate.name,
                    importable=importable[metrictemplate.name],
                    mtype=metrictemplate.mtype.name,
                    ostag=ostag,
                    tags=sorted(tags),
                    probeversion=probeversion,
                    description=metrictemplate.description,
                    parent=parent,
                    probeexecutable=probeexecutable,
                    config=config,
                    attribute=attribute,
                    dependency=dependency,
                    flags=flags,
                    files=files,
                    parameter=parameter,
                    fileparameter=fileparameter
                ))
            else:
                results.append(dict(
                    id=metrictemplate.id,
                    name=metrictemplate.name,
                    mtype=metrictemplate.mtype.name,
                    ostag=ostag,
                    tags=sorted(tags),
                    probeversion=probeversion,
                    description=metrictemplate.description,
                    parent=parent,
                    probeexecutable=probeexecutable,
                    config=config,
                    attribute=attribute,
                    dependency=dependency,
                    flags=flags,
                    files=files,
                    parameter=parameter,
                    fileparameter=fileparameter
                ))

        results = sorted(results, key=lambda k: k['name'])

        if name:
            del results[0]['ostag']
            return Response(results[0])
        else:
            return Response(results)

    def post(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                if request.data['parent']:
                    parent = json.dumps([request.data['parent']])
                else:
                    parent = ''

                if request.data['probeexecutable']:
                    probeexecutable = json.dumps(
                        [request.data['probeexecutable']]
                    )
                else:
                    probeexecutable = ''

                if request.data['mtype'] == 'Active':
                    probe_name = request.data['probeversion'].split(' ')[0]
                    probe_version = request.data[
                                        'probeversion'
                                    ].split(' ')[1][1:-1]
                    mt = admin_models.MetricTemplate.objects.create(
                        name=request.data['name'],
                        mtype=admin_models.MetricTemplateType.objects.get(
                            name=request.data['mtype']
                        ),
                        probekey=admin_models.ProbeHistory.objects.get(
                            name=probe_name,  package__version=probe_version
                        ),
                        description=request.data['description'],
                        parent=parent,
                        probeexecutable=probeexecutable,
                        config=inline_metric_for_db(request.data['config']),
                        attribute=inline_metric_for_db(
                            request.data['attribute']
                        ),
                        dependency=inline_metric_for_db(
                            request.data['dependency']
                        ),
                        flags=inline_metric_for_db(request.data['flags']),
                        files=inline_metric_for_db(request.data['files']),
                        parameter=inline_metric_for_db(
                            request.data['parameter']
                        ),
                        fileparameter=inline_metric_for_db(
                            request.data['fileparameter']
                        )
                    )
                    if 'tags' in dict(request.data):
                        for tag_name in dict(request.data)['tags']:
                            try:
                                tag = admin_models.MetricTags.objects.get(
                                    name=tag_name
                                )

                            except admin_models.MetricTags.DoesNotExist:
                                tag = admin_models.MetricTags.objects.create(
                                    name=tag_name
                                )
                            mt.tags.add(tag)
                else:
                    mt = admin_models.MetricTemplate.objects.create(
                        name=request.data['name'],
                        mtype=admin_models.MetricTemplateType.objects.get(
                            name=request.data['mtype']
                        ),
                        description=request.data['description'],
                        parent=parent,
                        flags=inline_metric_for_db(request.data['flags'])
                    )

                if request.data['cloned_from']:
                    clone = admin_models.MetricTemplate.objects.get(
                        id=request.data['cloned_from']
                    )
                    comment = 'Derived from ' + clone.name
                    create_history(mt, request.user.username, comment=comment)
                else:
                    create_history(mt, request.user.username)

                return Response(status=status.HTTP_201_CREATED)

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Metric template with this name already exists.'
                )

            except admin_models.ProbeHistory.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe version does not exist.'
                )

            except IndexError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe version not specified.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add metric templates.'
            )

    def put(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                metrictemplate = admin_models.MetricTemplate.objects.get(
                    id=request.data['id']
                )
                old_name = metrictemplate.name
                old_probekey = metrictemplate.probekey
                old_tags = set([tag.name for tag in metrictemplate.tags.all()])

                if request.data['parent']:
                    parent = json.dumps([request.data['parent']])
                else:
                    parent = ''

                if request.data['probeexecutable']:
                    probeexecutable = json.dumps(
                        [request.data['probeexecutable']]
                    )
                else:
                    probeexecutable = ''

                new_tags = set()
                if 'tags' in dict(request.data):
                    new_tags = set(dict(request.data)['tags'])

                if request.data['probeversion']:
                    probe_name = request.data['probeversion'].split(' ')[0]
                    probe_version = request.data[
                                        'probeversion'
                                    ].split(' ')[1][1:-1]
                    new_probekey = admin_models.ProbeHistory.objects.get(
                        name=probe_name,
                        package__version=probe_version
                    )

                else:
                    new_probekey = None

                if request.data['mtype'] == 'Active' and \
                        old_probekey != new_probekey:
                    metrictemplate.name = request.data['name']
                    metrictemplate.probekey = new_probekey
                    metrictemplate.description = request.data['description']
                    metrictemplate.parent = parent
                    metrictemplate.probeexecutable = probeexecutable
                    metrictemplate.config = inline_metric_for_db(
                        request.data['config']
                    )
                    metrictemplate.attribute = inline_metric_for_db(
                        request.data['attribute']
                    )
                    metrictemplate.dependency = inline_metric_for_db(
                        request.data['dependency']
                    )
                    metrictemplate.flags = inline_metric_for_db(
                        request.data['flags']
                    )
                    metrictemplate.files = inline_metric_for_db(
                        request.data['files']
                    )
                    metrictemplate.parameter = inline_metric_for_db(
                        request.data['parameter']
                    )
                    metrictemplate.fileparameter = inline_metric_for_db(
                        request.data['fileparameter']
                    )
                    metrictemplate.save()

                    if old_tags.difference(new_tags):
                        for tag in old_tags.difference(new_tags):
                            metrictemplate.tags.remove(
                                admin_models.MetricTags.objects.get(name=tag)
                            )

                    if new_tags.difference(old_tags):
                        for tag in new_tags.difference(old_tags):
                            try:
                                mtag = admin_models.MetricTags.objects.get(
                                    name=tag
                                )

                            except admin_models.MetricTags.DoesNotExist:
                                mtag = admin_models.MetricTags.objects.create(
                                    name=tag
                                )
                            metrictemplate.tags.add(mtag)

                    create_history(metrictemplate, request.user.username)

                else:
                    new_data = {
                        'name': request.data['name'],
                        'probekey': new_probekey,
                        'mtype': admin_models.MetricTemplateType.objects.get(
                            name=request.data['mtype']
                        ),
                        'description': request.data['description'],
                        'parent': parent,
                        'probeexecutable': probeexecutable,
                        'config': inline_metric_for_db(request.data['config']),
                        'attribute': inline_metric_for_db(
                            request.data['attribute']
                        ),
                        'dependency': inline_metric_for_db(
                            request.data['dependency']
                        ),
                        'flags': inline_metric_for_db(request.data['flags']),
                        'files': inline_metric_for_db(request.data['files']),
                        'parameter': inline_metric_for_db(
                            request.data['parameter']
                        ),
                        'fileparameter': inline_metric_for_db(
                            request.data['fileparameter']
                        )
                    }
                    admin_models.MetricTemplate.objects.filter(
                        id=request.data['id']
                    ).update(**new_data)

                    mt = admin_models.MetricTemplate.objects.get(
                        pk=request.data['id']
                    )

                    tags_to_remove = None
                    if old_tags.difference(new_tags):
                        tags_to_remove = admin_models.MetricTags.objects.filter(
                            name__in=old_tags.difference(new_tags)
                        )
                        for tag in tags_to_remove:
                            mt.tags.remove(tag)

                    tags_to_add = None
                    if new_tags.difference(old_tags):
                        tags_to_add = []
                        for tag in new_tags.difference(old_tags):
                            try:
                                mtag = admin_models.MetricTags.objects.get(
                                    name=tag
                                )

                            except admin_models.MetricTags.DoesNotExist:
                                mtag = admin_models.MetricTags.objects.create(
                                    name=tag
                                )
                            tags_to_add.append(mtag)
                            mt.tags.add(mtag)

                    new_data.update({
                        'version_comment': update_comment(
                            admin_models.MetricTemplate.objects.get(
                                id=request.data['id']
                            )
                        )
                    })

                    admin_models.MetricTemplateHistory.objects.filter(
                        name=old_name, probekey=old_probekey
                    ).update(**new_data)

                    history = admin_models.MetricTemplateHistory.objects.get(
                        name=request.data['name'], probekey=new_probekey
                    )

                    if tags_to_remove:
                        for tag in tags_to_remove:
                            history.tags.remove(tag)

                    if tags_to_add:
                        for tag in tags_to_add:
                            history.tags.add(tag)

                    msgs = update_metrics(mt, old_name, old_probekey)

                    if msgs:
                        return error_response(
                            detail='\n'.join(msgs),
                            status_code=status.HTTP_418_IM_A_TEAPOT
                        )

                return Response(status=status.HTTP_201_CREATED)

            except admin_models.MetricTemplate.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Metric template does not exist.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

            except admin_models.ProbeHistory.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe version does not exist.'
                )

            except IndexError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe version not specified.'
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Metric template with this name already exists.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change metric templates.'
            )

    def delete(self, request, name=None):
        schemas = list(
            Tenant.objects.all().values_list('schema_name', flat=True)
        )
        schemas.remove(get_public_schema_name())
        metric_ct = ContentType.objects.get_for_model(Metric)
        template_ct = ContentType.objects.get_for_model(
            admin_models.MetricTemplate
        )

        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            if name:
                try:
                    mt = admin_models.MetricTemplate.objects.get(name=name)
                    for schema in schemas:
                        with schema_context(schema):
                            try:
                                admin_models.History.objects.filter(
                                    object_id=mt.id,
                                    content_type=template_ct
                                ).delete()
                                m = Metric.objects.get(name=name)
                                TenantHistory.objects.filter(
                                    object_id=m.id,
                                    content_type=metric_ct
                                ).delete()
                                m.delete()
                            except Metric.DoesNotExist:
                                pass

                    mt.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)

                except admin_models.MetricTemplate.DoesNotExist:
                    return error_response(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail='Metric template does not exist.'
                    )

            else:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Metric template name not specified.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete metric templates.'
            )


class ListPublicMetricTemplates(ListMetricTemplates):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request):
        return self._denied()

    def delete(self, request, name):
        return self._denied()


class ListMetricTemplatesForImport(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        metrictemplates = admin_models.MetricTemplate.objects.all().order_by(
            'name'
        )

        results = []
        for mt in metrictemplates:
            vers = admin_models.MetricTemplateHistory.objects.filter(
                object_id=mt
            ).order_by('-date_created')
            if mt.probekey:
                probeversion = mt.probekey.__str__()
                tags = set()
                probeversion_dict = dict()
                for ver in vers:
                    for repo in ver.probekey.package.repos.all():
                        tags.add(repo.tag.name)
                        if repo.tag.name not in probeversion_dict:
                            probeversion_dict.update(
                                {
                                    repo.tag.name: ver.probekey.__str__()
                                }
                            )

                tags = list(tags)

                if 'CentOS 6' in probeversion_dict:
                    centos6_probeversion = probeversion_dict['CentOS 6']
                else:
                    centos6_probeversion = ''

                if 'CentOS 7' in probeversion_dict:
                    centos7_probeversion = probeversion_dict['CentOS 7']
                else:
                    centos7_probeversion = ''

            else:
                tags = list(admin_models.OSTag.objects.all().values_list(
                    'name', flat=True
                ))
                probeversion = ''
                centos6_probeversion = ''
                centos7_probeversion = ''

            tags.sort()
            results.append(
                dict(
                    name=mt.name,
                    mtype=mt.mtype.name,
                    tags=sorted([tag.name for tag in mt.tags.all()]),
                    probeversion=probeversion,
                    centos6_probeversion=centos6_probeversion,
                    centos7_probeversion=centos7_probeversion,
                    ostag=tags
                )
            )

        return Response(results)


class ListMetricTemplatesForProbeVersion(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, probeversion):
        if probeversion:
            metrics = admin_models.MetricTemplate.objects.filter(
                probekey__name=probeversion.split('(')[0],
                probekey__package__version=probeversion.split('(')[1][0:-1]
            )

            return Response(
                metrics.order_by('name').values_list('name', flat=True)
            )


class BulkDeleteMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            metrictemplates = dict(request.data)['metrictemplates']

            schemas = list(
                Tenant.objects.all().values_list('schema_name', flat=True)
            )
            schemas.remove(get_public_schema_name())

            warning_message = []
            for schema in schemas:
                with schema_context(schema):
                    try:
                        mip = get_metrics_in_profiles(schema)
                    except Exception as e:
                        warning_message.append(
                            '{}: Metrics are not removed from metric profiles. '
                            'Unable to get metric profiles: {}'.format(
                                schema, str(e)
                            )
                        )
                        continue

                    inter = set(metrictemplates).intersection(
                        set(list(mip.keys()))
                    )
                    profiles = dict()
                    for metric in metrictemplates:
                        try:
                            instance = Metric.objects.get(name=metric)
                            TenantHistory.objects.filter(
                                object_id=instance.id
                            ).delete()
                            instance.delete()

                        except Metric.DoesNotExist:
                            continue

                        for key, value in mip.items():
                            if metric in inter and key == metric:
                                for p in value:
                                    if p in profiles:
                                        profiles.update(
                                            {p: profiles[p] + [key]}
                                        )
                                    else:
                                        profiles.update({p: [key]})

                    if profiles:
                        for key, value in profiles.items():
                            try:
                                delete_metrics_from_profile(key, value)

                            except Exception as e:
                                if len(value) > 1:
                                    noun = 'Metrics {}'.format(', '.join(value))
                                else:
                                    noun = 'Metric {}'.format(value[0])

                                warning_message.append(
                                    '{}: {} not deleted from '
                                    'profile {}: {}'.format(
                                        schema, noun, key, str(e)
                                    )
                                )

            response_message = dict()
            mt = admin_models.MetricTemplate.objects.filter(
                name__in=metrictemplates
            )

            mt.delete()

            if len(metrictemplates) > 1:
                msg = 'Metric templates {}'.format(', '.join(metrictemplates))

            else:
                msg = 'Metric template {}'.format(metrictemplates[0])

            response_message.update({
                'info': '{} successfully deleted.'.format(msg)
            })

            if warning_message:
                response_message.update({'warning': '; '.join(warning_message)})

            return Response(
                data=response_message, status=status.HTTP_200_OK
            )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete metric templates.'
            )


class ListPublicMetricTemplatesForProbeVersion(
    ListMetricTemplatesForProbeVersion
):
    authentication_classes = ()
    permission_classes = ()


class ListMetricTemplateTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = admin_models.MetricTemplateType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)


class ListPublicMetricTemplateTypes(ListMetricTemplateTypes):
    authentication_classes = ()
    permission_classes = ()


class ListMetricTags(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                tag = admin_models.MetricTags.objects.get(name=name)
                serializer = serializers.MetricTagsSerializer(tag)
                return Response(serializer.data)

            except admin_models.MetricTags.DoesNotExist:
                return Response(
                    {"detail": "Requested tag not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        else:
            tags = admin_models.MetricTags.objects.all().order_by('name')
            serializer = serializers.MetricTagsSerializer(tags, many=True)
            return Response(serializer.data)

    def post(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:

            try:
                if not request.data["name"]:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You must specify metric tag name."
                    )

                else:
                    tag = admin_models.MetricTags.objects.create(
                        name=request.data["name"]
                    )

                    missing_metrics = set()
                    try:
                        metric_names = dict(request.data)["metrics"]
                        for metric_name in metric_names:
                            try:
                                mt = \
                                    admin_models.MetricTemplate.objects.get(
                                        name=metric_name
                                    )
                                mt_history = \
                                    admin_models.MetricTemplateHistory.objects.filter(
                                        object_id=mt
                                    ).order_by("-date_created")[0]
                                mt.tags.add(tag)
                                mt_history.tags.add(tag)

                                update_metrics(mt, mt.name, mt.probekey)

                            except admin_models.MetricTemplate.DoesNotExist:
                                missing_metrics.add(metric_name)

                    except KeyError:
                        pass

                    if len(missing_metrics) > 0:
                        if len(missing_metrics) == 1:
                            warn_msg = \
                                f"Metric {list(missing_metrics)[0]} " \
                                f"does not exist."

                        else:
                            warn_msg = "Metrics {} do not exist.".format(
                                ", ".join(sorted(list(missing_metrics)))
                            )

                        return Response(
                            {"detail": warn_msg},
                            status=status.HTTP_201_CREATED,
                        )

                    else:
                        return Response(status=status.HTTP_201_CREATED)

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing data key: {e.args[0]}."
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Metric tag with this name already exists."
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="You do not have permission to add metric tags."
            )

    def put(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                if request.data["id"]:
                    tag = admin_models.MetricTags.objects.get(
                        id=request.data["id"]
                    )
                    if request.data["name"]:
                        tag.name = request.data["name"]
                        tag.save()

                        old_metrics = set(
                            admin_models.MetricTemplate.objects.filter(
                                tags__name=tag.name
                            ).values_list("name", flat=True)
                        )

                        missing_metrics = set()
                        try:
                            new_metrics = set(dict(request.data)["metrics"])

                            for metric_name in old_metrics.difference(
                                    new_metrics
                            ):
                                try:
                                    mt = admin_models.MetricTemplate.objects.get(
                                        name=metric_name
                                    )
                                    mt.tags.remove(tag)

                                    mt_hist = admin_models.MetricTemplateHistory.objects.filter(
                                        object_id=mt
                                    ).order_by("-date_created")[0]
                                    mt_hist.tags.remove(tag)
                                    update_metrics(mt, mt.name, mt.probekey)

                                except admin_models.MetricTemplate.DoesNotExist:
                                    missing_metrics.add(metric_name)

                            for metric_name in new_metrics.difference(
                                    old_metrics
                            ):
                                try:
                                    mt = admin_models.MetricTemplate.objects.get(
                                        name=metric_name
                                    )
                                    mt.tags.add(tag)
                                    mt_hist = admin_models.MetricTemplateHistory.objects.filter(
                                        object_id=mt
                                    ).order_by("-date_created")[0]
                                    mt_hist.tags.add(tag)
                                    update_metrics(mt, mt.name, mt.probekey)

                                except admin_models.MetricTemplate.DoesNotExist:
                                    missing_metrics.add(metric_name)

                        except KeyError:
                            pass

                        if len(missing_metrics) > 0:
                            if len(missing_metrics) == 1:
                                warn_msg = \
                                    f"Metric {list(missing_metrics)[0]} " \
                                    f"does not exist."

                            else:
                                warn_msg = \
                                    "Metrics {} do not exist.".format(
                                        ", ".join(
                                            sorted(list(missing_metrics))
                                        )
                                    )

                            return Response(
                                {"detail": warn_msg},
                                status=status.HTTP_201_CREATED
                            )

                        else:
                            return Response(status=status.HTTP_201_CREATED)

                    else:
                        return error_response(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You must specify metric tag name."
                        )

                else:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You must specify metric tag ID."
                    )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing data key: {e.args[0]}."
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Metric tag with this name already exists."
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="You do not have permission to change metric tags."
            )

    def delete(self, request, tag):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                admin_models.MetricTags.objects.get(name=tag).delete()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except admin_models.MetricTags.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="The requested metric tag does not exist."
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="You do not have permission to delete metric tags."
            )


class ListMetricTemplates4Tag(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, tag):
        try:
            admin_models.MetricTags.objects.get(name=tag)
            mts = admin_models.MetricTemplate.objects.filter(tags__name=tag)

            return Response(sorted([mt.name for mt in mts]))

        except admin_models.MetricTags.DoesNotExist:
            return Response(
                {"detail": "Requested tag not found."},
                status=status.HTTP_404_NOT_FOUND
            )


class ListPublicMetricTags(ListMetricTags):
    authentication_classes = ()
    permission_classes = ()


class ListMetricTemplates4Tag(ListMetricTemplates4Tag):
    authentication_classes = ()
    permission_classes = ()
