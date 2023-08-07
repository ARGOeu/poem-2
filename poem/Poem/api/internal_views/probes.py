import datetime
import json

from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history, update_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from django.conf import settings
from django.core.mail import EmailMessage
from django.db import IntegrityError
from django_tenants.utils import schema_context, get_public_schema_name
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListProbes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                probe = admin_models.Probe.objects.get(name=name)

                if probe.datetime:
                    probe_datetime = datetime.datetime.strftime(
                        probe.datetime, '%Y-%m-%dT%H:%M:%S.%f'
                    )
                else:
                    probe_datetime = ''

                result = dict(
                    id=probe.id,
                    name=probe.name,
                    version=probe.package.version,
                    package=probe.package.__str__(),
                    docurl=probe.docurl,
                    description=probe.description,
                    comment=probe.comment,
                    repository=probe.repository,
                    user=probe.user,
                    datetime=probe_datetime
                )

                return Response(result)

            except admin_models.Probe.DoesNotExist:
                raise NotFound(status=404, detail='Probe not found')

        else:
            probes = admin_models.Probe.objects.all()

            results = []
            for probe in probes:
                # number of probe revisions
                nv = admin_models.ProbeHistory.objects.filter(
                    object_id=probe
                ).count()

                results.append(
                    dict(
                        name=probe.name,
                        version=probe.package.version,
                        package=probe.package.__str__(),
                        docurl=probe.docurl,
                        description=probe.description,
                        comment=probe.comment,
                        repository=probe.repository,
                        nv=nv
                    )
                )

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)

    def put(self, request):
        schemas = list(
            Tenant.objects.all().values_list('schema_name', flat=True)
        )
        schemas.remove(get_public_schema_name())

        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                probe = admin_models.Probe.objects.get(id=request.data['id'])
                old_name = probe.name
                package_name = request.data['package'].split(' ')[0]
                package_version = request.data['package'].split(' ')[1][1:-1]
                package = admin_models.Package.objects.get(
                    name=package_name, version=package_version
                )

                old_version = probe.package.version

                if package.version != old_version:
                    probe.name = request.data['name']
                    probe.package = package
                    probe.repository = request.data['repository']
                    probe.docurl = request.data['docurl']
                    probe.description = request.data['description']
                    probe.comment = request.data['comment']
                    probe.user = request.user.username

                    probe.save()
                    create_history(probe, probe.user)

                    if request.data['update_metrics'] in [True, 'true', 'True']:
                        metrictemplates = \
                            admin_models.MetricTemplate.objects.filter(
                                probekey__name=old_name,
                                probekey__package__version=old_version
                            )

                        for metrictemplate in metrictemplates:
                            metrictemplate.probekey = \
                                admin_models.ProbeHistory.objects.get(
                                    name=probe.name,
                                    package__version=probe.package.version
                                )
                            metrictemplate.save()
                            create_history(
                                metrictemplate, request.user.username
                            )

                else:
                    history = admin_models.ProbeHistory.objects.filter(
                        name=old_name, package__version=old_version
                    )
                    new_data = {
                        'name': request.data['name'],
                        'package': package,
                        'description': request.data['description'],
                        'comment': request.data['comment'],
                        'repository': request.data['repository'],
                        'docurl': request.data['docurl'],
                        'user': request.user.username
                    }
                    admin_models.Probe.objects.filter(pk=probe.id).update(
                        **new_data
                    )

                    del new_data['user']
                    new_data.update({
                        'version_comment': update_comment(
                            admin_models.Probe.objects.get(
                                id=request.data['id']
                            )
                        )
                    })
                    history.update(**new_data)

                    # update Metric history in case probe name has changed:
                    if request.data['name'] != old_name:
                        for schema in schemas:
                            with schema_context(schema):
                                metrics = poem_models.Metric.objects.filter(
                                    probeversion=f"{old_name} ({old_version})"
                                )

                                for metric in metrics:
                                    metric.probeversion = \
                                        f"{request.data['name']} " \
                                        f"({old_version})"
                                    metric.save()

                                    vers = \
                                        poem_models.TenantHistory.objects.filter(
                                            object_id=metric.id
                                        )

                                    for ver in vers:
                                        serialized_data = json.loads(
                                            ver.serialized_data
                                        )

                                        serialized_data[0]['fields'][
                                            'probekey'
                                        ] = \
                                            [request.data['name'],
                                             package.version]

                                        ver.serialized_data = json.dumps(
                                            serialized_data
                                        )
                                        ver.save()

                return Response(status=status.HTTP_201_CREATED)

            except admin_models.Probe.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Probe does not exist.'
                )

            except IndexError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Package version should be specified.'
                )

            except admin_models.Package.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Package does not exist.'
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe with this name already exists.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change probes.'
            )

    def post(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                package_name = request.data['package'].split(' ')[0]
                package_version = request.data['package'].split(' ')[1][1:-1]
                probe = admin_models.Probe(
                    name=request.data['name'],
                    package=admin_models.Package.objects.get(
                        name=package_name, version=package_version
                    ),
                    repository=request.data['repository'],
                    docurl=request.data['docurl'],
                    description=request.data['description'],
                    comment=request.data['comment'],
                    user=request.user.username,
                    datetime=datetime.datetime.now()
                )

                if 'cloned_from' in request.data and \
                        request.data['cloned_from']:
                    try:
                        clone = admin_models.Probe.objects.get(
                            id=request.data['cloned_from']
                        )
                        comment = 'Derived from {} ({}).'.format(
                            clone.name, clone.package.version
                        )
                        probe.save()
                        create_history(probe, probe.user, comment=comment)

                    except admin_models.Probe.DoesNotExist:
                        return error_response(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail='Probe from which to clone does not exist.'
                        )

                else:
                    probe.save()
                    create_history(probe, probe.user)

                return Response(status=status.HTTP_201_CREATED)

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe with this name already exists.'
                )

            except admin_models.Package.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Package does not exist.'
                )

            except IndexError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Package version should be specified.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add probes.'
            )

    def delete(self, request, name=None):
        schemas = list(
            Tenant.objects.all().values_list('schema_name', flat=True)
        )
        schemas.remove(get_public_schema_name())
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            if name:
                try:
                    probe = admin_models.Probe.objects.get(name=name)
                    mt = admin_models.MetricTemplate.objects.filter(
                        probekey=admin_models.ProbeHistory.objects.get(
                            name=probe.name,
                            package__version=probe.package.version
                        )
                    )
                    if len(mt) == 0:
                        for schema in schemas:
                            # need to iterate through schemas because of foreign
                            # key in Metric model
                            with schema_context(schema):
                                admin_models.ProbeHistory.objects.filter(
                                    object_id=probe
                                ).delete()
                        probe.delete()
                        return Response(status=status.HTTP_204_NO_CONTENT)
                    else:
                        return error_response(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail='You cannot delete probe that is associated '
                                   'to metric templates.'
                        )

                except admin_models.Probe.DoesNotExist:
                    raise NotFound(status=404, detail='Probe does not exist.')

            else:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Probe name not specified.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete probes.'
            )


class ListPublicProbes(ListProbes):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request):
        return self._denied()

    def post(self, request):
        return self._denied()

    def delete(self, request, name):
        return self._denied()


class ListProbeCandidates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, cid=None):
        if request.user.is_superuser:
            if cid:
                try:
                    candidate = poem_models.ProbeCandidate.objects.get(id=cid)
                    results = {
                        "id": candidate.id,
                        "name": candidate.name,
                        "description": candidate.description,
                        "docurl": candidate.docurl,
                        "rpm": candidate.rpm,
                        "yum_baseurl": candidate.yum_baseurl,
                        "command": candidate.command,
                        "contact": candidate.contact,
                        "status": candidate.status.name,
                        "service_type": candidate.service_type if
                        candidate.service_type else "",
                        "devel_url": candidate.devel_url if candidate.devel_url
                        else "",
                        "production_url": candidate.production_url if
                        candidate.production_url else "",
                        "created":
                            candidate.created.strftime("%Y-%m-%d %H:%M:%S"),
                        "last_update":
                            candidate.last_update.strftime("%Y-%m-%d %H:%M:%S")
                    }

                except poem_models.ProbeCandidate.DoesNotExist:
                    return error_response(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Probe candidate not found"
                    )

            else:
                candidates = poem_models.ProbeCandidate.objects.all()

                results = list()
                for candidate in candidates:
                    results.append({
                        "id": candidate.id,
                        "name": candidate.name,
                        "description": candidate.description,
                        "docurl": candidate.docurl,
                        "rpm": candidate.rpm,
                        "yum_baseurl": candidate.yum_baseurl,
                        "command": candidate.command,
                        "contact": candidate.contact,
                        "status": candidate.status.name,
                        "service_type": candidate.service_type if
                        candidate.service_type else "",
                        "devel_url": candidate.devel_url if candidate.devel_url
                        else "",
                        "production_url": candidate.production_url if
                        candidate.production_url else "",
                        "created":
                            candidate.created.strftime("%Y-%m-%d %H:%M:%S"),
                        "last_update":
                            candidate.last_update.strftime("%Y-%m-%d %H:%M:%S")
                    })

                results = sorted(results, key=lambda k: k["name"])

            return Response(results)

        else:
            return error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view probe candidates"
            )

    def put(self, request):
        if request.user.is_superuser:
            try:
                candidate = poem_models.ProbeCandidate.objects.get(
                    id=request.data["id"]
                )

                for key in [
                    "name", "description", "docurl", "command", "status"
                ]:
                    if not request.data[key]:
                        return error_response(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"{key.capitalize()} is mandatory"
                        )

                if request.data["status"] == "deployed" and \
                        not request.data["production_url"]:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Production URL is mandatory when probe status "
                               "is 'deployed'"
                    )

                if request.data["status"] == "processing" and \
                        not request.data["service_type"]:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Service type is mandatory when probe status is "
                               "'processing'"
                    )

                if request.data["status"] == "testing" and \
                        not request.data["devel_url"]:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Devel URL is mandatory when probe status is "
                               "'testing'"
                    )

                candidate.name = request.data["name"]
                candidate.description = request.data["description"]
                candidate.docurl = request.data["docurl"]
                candidate.rpm = request.data["rpm"]
                candidate.yum_baseurl = request.data["yum_baseurl"]
                candidate.command = request.data["command"]
                candidate.status = poem_models.ProbeCandidateStatus.objects.get(
                    name=request.data["status"]
                )
                candidate.service_type = request.data["service_type"]
                candidate.devel_url = request.data["devel_url"]
                candidate.production_url = request.data["production_url"]
                candidate.rejection_reason = request.data["rejection_reason"]
                candidate.save()

                subject = ""
                body = ""

                if request.data["status"] == "deployed":
                    subject = "[ARGO Monitoring] Probe deployed"
                    body = f"""
Dear madam/sir,

the probe '{request.data["name"]}' has been deployed to production.

You can see the results here: {request.data["production_url"]}

Best regards,
ARGO Monitoring team
"""

                elif request.data["status"] == "processing":
                    subject = "[ARGO Monitoring] Probe processing"
                    body = f"""
Dear madam/sir,

we have started setting up the probe '{request.data["name"]}' for testing.

Please add a new monitoring extension for your service with service type {request.data["service_type"]} in https://providers.eosc-portal.eu

You will receive more information after the probe has been deployed to devel infrastructure.

Best regards,
ARGO Monitoring team
"""

                elif request.data["status"] == "testing":
                    subject = "[ARGO Monitoring] Probe testing"
                    body = f"""
Dear madam/sir,

the probe '{request.data["name"]}' has been deployed to devel infrastructure.

You can see the results here: {request.data["devel_url"]}

The probe will be running in the devel infrastructure for a couple of days, and will be moved to production once we make sure it is working properly.

You will receive final email once the probe has been deployed to production infrastructure.

Best regards,
ARGO Monitoring team
"""

                elif request.data["status"] == "rejected":
                    subject = "[ARGO Monitoring] Probe rejected"
                    body = f"""
Dear madam/sir,

the probe '{request.data["name"]}' has been rejected for the following reason:

{request.data["rejection_reason"]}

If you make the necessary changes to the probe, please submit the new version.

Best regards,
ARGO Monitoring team
"""

                if subject and body:
                    try:
                        mail = EmailMessage(
                            subject,
                            body,
                            settings.EMAILFROM,
                            [request.data["contact"]],
                            [settings.EMAILUS]
                        )

                        mail.send(fail_silently=False)

                    except Exception as e:
                        return Response({
                            "warning": f"Probe candidate has been successfully "
                                       f"modified, but the email was not sent: "
                                       f"{str(e)}"
                        }, status=status.HTTP_201_CREATED)

                return Response(status=status.HTTP_201_CREATED)

            except poem_models.ProbeCandidate.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Probe candidate not found"
                )

            except poem_models.ProbeCandidateStatus.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Probe candidate status not found"
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing data key: {e.args[0]}"
                )

        else:
            return error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify probe candidates"
            )


class ListProbeCandidateStatuses(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        if request.user.is_superuser:
            statuses = poem_models.ProbeCandidateStatus.objects.all()

            results = sorted([s.name for s in statuses])

            return Response(results)

        else:
            return error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view probe candidate "
                       "statuses"
            )
