import json

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
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from tenant_schemas.utils import get_public_schema_name, schema_context


class ListMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrictemplates = admin_models.MetricTemplate.objects.filter(
                name=name
            )
            if metrictemplates.count() == 0:
                raise NotFound(status=404, detail='Metric template not found')
        else:
            metrictemplates = admin_models.MetricTemplate.objects.all()

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

            if metrictemplate.probekey:
                probeversion = metrictemplate.probekey.__str__()
            else:
                probeversion = ''

            results.append(dict(
                id=metrictemplate.id,
                name=metrictemplate.name,
                mtype=metrictemplate.mtype.name,
                ostag=ostag,
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
        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        try:
            if request.data['mtype'] == 'Active':
                probe_name = request.data['probeversion'].split(' ')[0]
                probe_version = request.data['probeversion'].split(' ')[1][1:-1]
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
                    attribute=inline_metric_for_db(request.data['attribute']),
                    dependency=inline_metric_for_db(request.data['dependency']),
                    flags=inline_metric_for_db(request.data['flags']),
                    files=inline_metric_for_db(request.data['files']),
                    parameter=inline_metric_for_db(request.data['parameter']),
                    fileparameter=inline_metric_for_db(
                        request.data['fileparameter']
                    )
                )
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
            return Response(
                {'detail':
                 'Metric template with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except admin_models.ProbeHistory.DoesNotExist:
            return Response(
                {'detail': 'You should choose existing probe version!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IndexError:
            return Response(
                {'detail': 'You should specify the version of the probe!'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=request.data['id']
        )
        old_name = metrictemplate.name
        old_probekey = metrictemplate.probekey

        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        if request.data['probeversion']:
            try:
                probe_name = request.data['probeversion'].split(' ')[0]
                probe_version = request.data['probeversion'].split(' ')[1][1:-1]
                new_probekey = admin_models.ProbeHistory.objects.get(
                    name=probe_name,
                    package__version=probe_version
                )

            except admin_models.ProbeHistory.DoesNotExist:
                return Response(
                    {'detail': 'You should choose existing probe version!'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            except IndexError:
                return Response(
                    {'detail': 'You should specify the version of the probe!'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            new_probekey = None

        try:
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

                mt = admin_models.MetricTemplate.objects.get(
                    pk=request.data['id']
                )

                msgs = update_metrics(mt, old_name, old_probekey)

                if msgs:
                    return Response(
                        {'detail': '\n'.join(msgs)},
                        status=status.HTTP_418_IM_A_TEAPOT
                    )

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail': 'Metric template with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, name=None):
        schemas = list(Tenant.objects.all().values_list('schema_name',
                                                        flat=True))
        schemas.remove(get_public_schema_name())
        if name:
            try:
                mt = admin_models.MetricTemplate.objects.get(name=name)
                for schema in schemas:
                    with schema_context(schema):
                        try:
                            admin_models.History.objects.filter(
                                object_id=mt.id,
                                content_type=ContentType.objects.get_for_model(
                                    mt)
                            ).delete()
                            m = Metric.objects.get(name=name)
                            TenantHistory.objects.filter(
                                object_id=m.id,
                                content_type=ContentType.objects.get_for_model(
                                    m
                                )
                            ).delete()
                            m.delete()
                        except Metric.DoesNotExist:
                            pass

                mt.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except admin_models.MetricTemplate.DoesNotExist:
                raise NotFound(status=404, detail='Metric template not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


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

                inter = set(metrictemplates).intersection(set(list(mip.keys())))
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
                                    profiles.update({p: profiles[p] + [key]})
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
                                '{}: {} not deleted from profile {}: {}'.format(
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


class ListPublicMetricTemplatesForProbeVersion(ListMetricTemplatesForProbeVersion):
    authentication_classes = ()
    permission_classes = ()


class ListMetricTemplateTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = admin_models.MetricTemplateType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)


class ListMetricTags(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        tags = admin_models.MetricTags.objects.all().order_by('name')
        tags_list = [tag.name for tag in tags]
        return Response(tags_list)
