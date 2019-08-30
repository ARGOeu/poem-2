from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework_api_key.models import APIKey
from rest_framework import status

from rest_framework_api_key import models as api_models

from queue import Queue

from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import Probe, ExtRevision
from Poem.users.models import CustUser
from Poem.poem.saml2.config import tenant_from_request, saml_login_string, get_schemaname

from reversion.models import Version, Revision

from .views import NotFound
from . import serializers

from Poem import settings

import datetime
import requests
import json


def sync_webapi(api, model):
    token = APIKey.objects.get(client_id="WEB-API")

    headers = dict()
    headers = {'Accept': 'application/json', 'x-api-key': token.token}
    response = requests.get(api,
                            headers=headers,
                            timeout=180)
    response.raise_for_status()
    data = response.json()['data']

    data_api = set([p['id'] for p in data])
    data_db = set(model.objects.all().values_list('apiid', flat=True))
    entries_not_indb = data_api.difference(data_db)

    new_entries = []
    for p in data:
        if p['id'] in entries_not_indb:
            new_entries.append(model(name=p['name'], apiid=p['id'], groupname=''))
    if new_entries:
        model.objects.bulk_create(new_entries)

    entries_deleted_onapi = data_db.difference(data_api)
    for p in entries_deleted_onapi:
        model.objects.get(apiid=p).delete()


def get_groups_for_user(user):
    groupsofaggregations = user.userprofile.groupsofaggregations.all().values_list('name', flat=True)
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = user.userprofile.groupsofmetrics.all().values_list('name', flat=True)
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = user.userprofile.groupsofmetricprofiles.all().values_list('name', flat=True)
    results.update({'metricprofiles': groupsofmetricprofiles})

    return results


def get_all_groups():
    groupsofaggregations = poem_models.GroupOfAggregations.objects.all().values_list('name', flat=True)
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = poem_models.GroupOfMetrics.objects.all().values_list('name', flat=True)
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = poem_models.GroupOfMetricProfiles.objects.all().values_list('name', flat=True)
    results.update({'metricprofiles': groupsofmetricprofiles})

    return results


def one_value_inline(input):
    if input:
        return json.loads(input)[0]
    else:
        return ''


def two_value_inline(input):
    results = []

    if input:
        data = json.loads(input)

        for item in data:
            results.append(({'key': item.split(' ')[0],
                             'value': item.split(' ')[1]}))

    return results


def inline_metric_for_db(input):
    result = []

    for item in input:
        result.append('{} {}'.format(item['key'], item['value']))

    return result


class Tree(object):
    class Node:
        def __init__(self, nodename):
            self._nodename = nodename
            self._child = []

        def parent(self):
            return self._parent

        def child(self, i):
            return self._child[i]

        def childs(self):
            return self._child

        def numchilds(self):
            return len(self._child)

        def find(self, nodename):
            length = len(self._child)
            if length > 0:
                for i in range(length):
                    if self._child[i].name() == nodename:
                        return i
            return -1

        def name(self):
            return self._nodename

        def is_leaf(self):
            if self.numchilds() == 0:
                return True
            else:
                return False

        def __str__(self):
            return self._nodename

    def __init__(self):
        self.root = None
        self._size = 0

    def __len__(self):
        return self._size

    def addroot(self, e):
        self.root = self.Node(e)
        return self.root

    def breadthfirst(self):
        fringe = Queue()
        fringe.put(self.root)
        while not fringe.empty():
            p = fringe.get()
            yield p
            for c in p.childs():
                fringe.put(c)

    def addchild(self, e, p):
        c = self.Node(e)
        c._parent = p
        p._child.append(c)
        self._size += 1
        return c

    def is_empty(self):
        return len(self) == 0

    def preorder(self, n=None):
        if n is None:
            n = self.root
        for p in self._subtree_preorder(n):
            yield p

    def _subtree_preorder(self, p):
        yield p
        for c in p.childs():
            if c.is_leaf():
                yield c
            else:
                for other in self._subtree_preorder(c):
                    yield other

    def postorder(self, n=None):
        if n is None:
            n = self.root
        for p in self._subtree_postorder(n):
            yield p

    def _subtree_postorder(self, p):
        for c in p.childs():
            if c.is_leaf():
                yield c
            else:
                for other in self._subtree_postorder(c):
                    yield other
        yield p


class GetConfigOptions(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        options = dict()

        tenant = tenant_from_request(request)
        options.update(saml_login_string=saml_login_string(tenant))

        options.update(webapimetric=settings.WEBAPI_METRIC)
        options.update(webapiaggregation=settings.WEBAPI_AGGREGATION)
        options.update(tenant_name=tenant)

        return Response({'result': options})


class ListMetricsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            metrics = poem_models.Metrics.objects.filter(
                groupofmetrics__name__exact=group
            )
        else:
            metrics = poem_models.Metrics.objects.filter(
                groupofmetrics__exact=None
            )
        results = []
        for item in metrics:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfMetrics.objects.filter(
                           name__exact=group)):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group not found')

    def put(self, request):
        group = poem_models.GroupOfMetrics.objects.get(
            name=request.data['name']
        )

        for metric in request.data['items']:
            group.metrics.add(poem_models.Metrics.objects.get(name=metric))

        # remove the metrics that existed before, and now were removed
        for metric in group.metrics.all():
            if metric.name not in request.data['items']:
                group.metrics.remove(
                    poem_models.Metrics.objects.get(name=metric)
                )

        return Response(status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetrics.objects.create(
                name=request.data['name']
            )

            for metric in request.data['items']:
                group.metrics.add(poem_models.Metrics.objects.get(name=metric))

        except Exception:
            return Response(status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                group = poem_models.GroupOfMetrics.objects.get(name=group)
                group.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfMetrics.DoesNotExist:
                raise(NotFound(status=404, detail='Group of metrics not found'))

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListAllMetrics(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        metrics = poem_models.Metrics.objects.all()
        serializer = serializers.MetricsSerializer(metrics, many=True)
        return Response(serializer.data)


class ListAllServiceFlavours(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        service_flavours = poem_models.ServiceFlavour.objects.all()
        serializer = serializers.ServiceFlavourSerializer(service_flavours, many=True)
        return Response(serializer.data)


class ListTokens(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                token = api_models.APIKey.objects.get(client_id=name)
                api_format = dict(
                    name=token.client_id,
                    token=token.token,
                    created=datetime.datetime.strftime(token.created,
                                                       '%Y-%m-%d %H:%M:%S'),
                    revoked=token.revoked
                )

            except api_models.APIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            tokens = api_models.APIKey.objects.all()
            api_format = [
                dict(name=e.client_id,
                     token=e.token,
                     created=datetime.datetime.strftime(e.created,
                                                        '%Y-%m-%d %H:%M:%S'),
                     revoked=e.revoked) for e in tokens]

        return Response(api_format)


class ListTokenForTenant(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name):
        try:
            e = api_models.APIKey.objects.get(client_id=name)

            return Response(e.token)

        except api_models.APIKey.DoesNotExist:
            raise NotFound(status=404,
                           detail='Tenant not found')


class ListUsers(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)
                serializer = serializers.UsersSerializer(user)
                return Response(serializer.data)

            except CustUser.DoesNotExist:
                raise NotFound(status=404,
                            detail='User not found')

        else:
            users = CustUser.objects.all()
            serializer = serializers.UsersSerializer(users, many=True)

            return Response(serializer.data)

    def put(self, request):
        user = CustUser.objects.get(username=request.data['username'])
        user.first_name = request.data['first_name']
        user.last_name = request.data['last_name']
        user.email = request.data['email']
        user.is_superuser = request.data['is_superuser']
        user.is_staff = request.data['is_staff']
        user.is_active = request.data['is_active']
        user.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            CustUser.objects.create_user(
                username=request.data['username'],
                password=request.data['password'],
                email=request.data['password'],
                first_name=request.data['first_name'],
                last_name=request.data['last_name'],
                is_superuser=request.data['is_superuser'],
                is_staff=request.data['is_staff'],
                is_active=request.data['is_active']
            )
            user = CustUser.objects.get(username=request.data['username'])

            userprofile = poem_models.UserProfile(
                user=user,
                displayname=request.data['displayname'],
                subject=request.data['subject'],
                egiid=request.data['egiid']
            )
            userprofile.save()

            for group in request.data['groupsofaggregations']:
                userprofile.groupsofaggregations.add(poem_models.GroupOfAggregations.objects.get(name=group))

            for group in request.data['groupsofmetrics']:
                userprofile.groupsofmetrics.add(poem_models.GroupOfMetrics.objects.get(name=group))

            for group in request.data['groupsofmetricprofiles']:
                userprofile.groupsofmetricprofiles.add(poem_models.GroupOfMetricProfiles.objects.get(name=group))

            return Response(status.HTTP_201_CREATED)
        except Exception:
            return Response(status.HTTP_400_BAD_REQUEST)

    def delete(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)
                user.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except CustUser.DoesNotExist:
                raise(NotFound(status=404, detail='User not found'))

        else:
            Response(status=status.HTTP_400_BAD_REQUEST)


class ListGroupsForUser(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        user = request.user

        if user.is_superuser:
            results = get_all_groups()

        else:
            results = get_groups_for_user(user)

        if group:
            return Response(results[group.lower()])
        else:
            return Response({'result': results})


class ListAggregations(APIView):
    authentication_classes= (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.AggregationProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            groupaggr = poem_models.GroupOfAggregations.objects.get(name=request.data['groupname'])
            aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
            groupaggr.aggregations.add(aggr)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
        aggr.groupname = request.data['groupname']
        aggr.save()

        groupaggr = poem_models.GroupOfAggregations.objects.get(name=request.data['groupname'])
        groupaggr.aggregations.add(aggr)

        return Response(status=status.HTTP_201_CREATED)

    def get(self, request, aggregation_name=None):
        sync_webapi(settings.WEBAPI_AGGREGATION, poem_models.Aggregation)

        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(name=aggregation_name)
                serializer = serializers.AggregationProfileSerializer(aggregation)
                return Response(serializer.data)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                            detail='Aggregation not found')

        else:
            aggregations = poem_models.Aggregation.objects.all()
            serializer = serializers.AggregationProfileSerializer(aggregations, many=True)
            return Response(serializer.data)

    def delete(self, request, aggregation_name):
        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(apiid=aggregation_name)
                aggregation.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                            detail='Aggregation not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListMetricProfiles(APIView):
    authentication_classes= (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.MetricProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            groupprofile = poem_models.GroupOfMetricProfiles.objects.get(name=request.data['groupname'])
            profile = poem_models.MetricProfiles.objects.get(apiid=request.data['apiid'])
            groupprofile.metricprofiles.add(profile)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, profile_name=None):
        sync_webapi(settings.WEBAPI_METRIC, poem_models.MetricProfiles)

        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(name=profile_name)
                serializer = serializers.MetricProfileSerializer(profile)
                return Response(serializer.data)

            except poem_models.MetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                            detail='Metric profile not found')

        else:
            profiles = poem_models.MetricProfiles.objects.all()
            serializer = serializers.MetricProfileSerializer(profiles, many=True)
            return Response(serializer.data)

    def put(self, request):
        profile = poem_models.MetricProfiles.objects.get(apiid=request.data['apiid'])
        profile.groupname = request.data['groupname']
        profile.save()

        groupprofile = poem_models.GroupOfMetricProfiles.objects.get(name=request.data['groupname'])
        groupprofile.metricprofiles.add(profile)

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, profile_name=None):
        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(name=profile_name)
                profile.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.MetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                            detail='Metric profile not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListProbes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                probe = Probe.objects.get(name=name)
                serializer = serializers.ProbeSerializer(probe)

                return Response(serializer.data)

            except Probe.DoesNotExist:
                raise NotFound(status=404, detail='Probe not found')

        else:
            probes = Probe.objects.all()

            results = []
            for probe in probes:
                # number of probe revisions
                nv = ExtRevision.objects.filter(probeid=probe.id).count()
                results.append(
                    dict(
                        name=probe.name,
                        version=probe.version,
                        docurl=probe.docurl,
                        description=probe.description,
                        comment=probe.comment,
                        repository=probe.repository,
                        nv=nv
                    )
                )

            return Response(results)


class ListServices(APIView):
    authentication_classes = (SessionAuthentication,)

    def __init__(self):
        super().__init__()
        self.tree = Tree()

    def _is_one_probe_found(self, metrics):
        found_metrics = poem_models.Metric.objects.filter(name__in=metrics)

        for metric in found_metrics:
            if metric.probeversion:
                return True

        return False

    def _get_or_create(self, root, node):
        fn = root.find(node)
        if fn > -1:
            return root.child(fn)
        else:
            return self.tree.addchild(node, root)

    def _count_leaves(self, root):
        count = 0

        for node in self.tree.postorder(root):
            if node.is_leaf():
                count += 1

        return count

    def _count_leaves_per_element(self, root):
        data = {
            'service_category': list(),
            'service_name': list(),
            'service_type': list(),
            'metric': list(),
            'probe': list(),
        }

        for sa in root.childs():
            data['service_category'].append((sa.name(), self._count_leaves(sa)))
            for sn in sa.childs():
                data['service_name'].append((sn.name(), self._count_leaves(sn)))
                for st in sn.childs():
                    data['service_type'].append((st.name(), self._count_leaves(st)))
                    for m in st.childs():
                        data['metric'].append((m.name(), 1))
                        data['probe'].append((m.childs()[0].name(), 1))

        return data

    def _create_empty_table_rows(self, nleaves):
        data = [{
            'service_category': None,
            'service_name': None,
            'service_type': None,
            'metric': None,
            'probe': None
        } for i in range(nleaves)]

        return data

    def _fill_rows(self, table_rows, nleaves_perelem, nleaves):
        for type in table_rows[0].keys():
            next, s, skip = 0, 1, False
            for i in range(nleaves):
                name = nleaves_perelem[type][next][0]
                rowspan = nleaves_perelem[type][next][1]
                if rowspan > 1:
                    if not skip:
                        table_rows[i][type] = name
                        skip = True
                    else:
                        table_rows[i][type] = ''
                    if s < rowspan:
                        s += 1
                    else:
                        next += 1
                        s = 1
                        skip = False
                elif rowspan == 1:
                    table_rows[i][type] = name
                    next += 1
                    skip = False

    def get(self, request):
        r = self.tree.addroot('root')
        id_metrics, id_probes = dict(), dict()

        for (service_category, service_name, service_type) in \
                poem_models.Service.objects.all().values_list('service_category', 'service_name', 'service_type'):
            metricinstances = poem_models.MetricInstance.objects.filter(service_flavour=service_type)
            unique_metrics = sorted(list(set(m.metric for m in metricinstances)))

            if unique_metrics and self._is_one_probe_found(unique_metrics):
                found_metrics = poem_models.Metric.objects.filter(name__in=unique_metrics)

                sat = self._get_or_create(r, service_category)
                snt = self._get_or_create(sat, service_name)
                stt = self._get_or_create(snt, service_type)

                for metric in found_metrics:
                    if metric.probeversion:
                        mt = self.tree.addchild(metric.name, stt)
                        self.tree.addchild(metric.probeversion, mt)
                        id_metrics.update({metric.name: metric.id})
                        probe_id = Probe.objects.get(nameversion=metric.probeversion).id
                        id_probes.update({metric.probeversion: probe_id})

        nleaves = self._count_leaves(r)
        nleaves_perelem = self._count_leaves_per_element(r)
        table_rows = self._create_empty_table_rows(nleaves)
        self._fill_rows(table_rows, nleaves_perelem, nleaves)

        return Response({'result': {
            'rows': table_rows,
            'rowspan': nleaves_perelem,
            'id_metrics': id_metrics,
            'id_probes': id_probes
        }})


class Saml2Login(APIView):
    authentication_classes = (SessionAuthentication,)
    keys = ['username', 'first_name', 'last_name', 'is_superuser']

    def _prefix(self, keys):
        return ['{}_saml2_'.format(get_schemaname()) + key for key in keys]

    def _remove_prefix(self, keys):
        new_keys = dict()

        for k, v in keys.items():
            new_keys[k.split('{}_saml2_'.format(get_schemaname()))[1]] = v

        return new_keys

    def get(self, request):
        result = cache.get_many(self._prefix(self.keys))

        return Response(self._remove_prefix(result))

    def delete(self, request):
        cache.delete_many(self._prefix(self.keys))

        return Response(status=status.HTTP_204_NO_CONTENT)


class GetUserprofileForUsername(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username):
        try:
            user = CustUser.objects.get(username=username)
        except CustUser.DoesNotExist:
            raise NotFound(status=404, detail='User not found')
        else:
            try:
                user_profile = poem_models.UserProfile.objects.get(user=user)
                serializer = serializers.UserProfileSerializer(user_profile)
                return Response(serializer.data)

            except poem_models.UserProfile.DoesNotExist:
                raise NotFound(status=404, detail='User profile not found')

    def put(self, request):
        user = CustUser.objects.get(username=request.data['username'])
        userprofile = poem_models.UserProfile.objects.get(user=user)
        userprofile.displayname = request.data['displayname']
        userprofile.subject = request.data['subject']
        userprofile.egiid = request.data['egiid']
        userprofile.save()

        for group in request.data['groupsofaggregations']:
            userprofile.groupsofaggregations.add(poem_models.GroupOfAggregations.objects.get(name=group))

        for group in request.data['groupsofmetrics']:
            userprofile.groupsofmetrics.add(poem_models.GroupOfMetrics.objects.get(name=group))

        for group in request.data['groupsofmetricprofiles']:
            userprofile.groupsofmetricprofiles.add(poem_models.GroupOfMetricProfiles.objects.get(name=group))

        # remove the groups that existed before, and now were removed:
        for group in userprofile.groupsofaggregations.all():
            if group.name not in request.data['groupsofaggregations']:
                userprofile.groupsofaggregations.remove(poem_models.GroupOfAggregations.objects.get(name=group))

        for group in userprofile.groupsofmetrics.all():
            if group.name not in request.data['groupsofmetrics']:
                userprofile.groupsofmetrics.remove(poem_models.GroupOfMetrics.objects.get(name=group))

        for group in userprofile.groupsofmetricprofiles.all():
            if group.name not in request.data['groupsofmetricprofiles']:
                userprofile.groupsofmetricprofiles.remove(poem_models.GroupOfMetricProfiles.objects.get(name=group))

        return Response(status.HTTP_201_CREATED)


class ListGroupsForGivenUser(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)

            except CustUser.DoesNotExist:
                raise NotFound(status=404, detail='User not found')

            else:
                results = get_groups_for_user(user)

        else:
            results = get_all_groups()

        return Response({'result': results})


class ListAggregationsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            aggr = poem_models.Aggregation.objects.filter(
                groupofaggregations__name__exact=group
            )
        else:
            aggr = poem_models.Aggregation.objects.filter(
                groupofaggregations__exact=None
            )

        results = []
        for item in aggr:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfAggregations.objects.filter(
                           name__exact=group
                       )):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group not found')

    def put(self, request):
        group = poem_models.GroupOfAggregations.objects.get(
            name=request.data['name']
        )

        for aggr in request.data['items']:
            ag = poem_models.Aggregation.objects.get(name=aggr)
            group.aggregations.add(ag)
            ag.groupname = group.name
            ag.save()

        # remove removed aggregations:
        for aggr in group.aggregations.all():
            if aggr.name not in request.data['items']:
                group.aggregations.remove(aggr)
                aggr.groupname = ''
                aggr.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfAggregations.objects.create(
                name=request.data['name']
            )

            for aggr in request.data['items']:
                ag = poem_models.Aggregation.objects.get(name=aggr)
                group.aggregations.add(ag)
                ag.groupname = group.name
                ag.save()

        except Exception:
            return Response(status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfAggregations.objects.get(name=group)
                gr.delete()

                for aggr in poem_models.Aggregation.objects.filter(
                        groupname=group
                ):
                    aggr.groupname = ''
                    aggr.save()

                return Response(status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfAggregations.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of aggregations not found')

        else:
            return Response(status.HTTP_400_BAD_REQUEST)


class ListMetricProfilesInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            mp = poem_models.MetricProfiles.objects.filter(
                groupofmetricprofiles__name__exact=group
            )
        else:
            mp = poem_models.MetricProfiles.objects.filter(
                groupofmetricprofiles__exact=None
            )

        results = []
        for item in mp:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfMetricProfiles.objects.filter(
                           name__exact=group
                       )):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group of metric profiles not found')

    def put(self, request):
        group = poem_models.GroupOfMetricProfiles.objects.get(
            name=request.data['name']
        )

        for item in request.data['items']:
            mp = poem_models.MetricProfiles.objects.get(name=item)
            group.metricprofiles.add(mp)
            mp.groupname = group.name
            mp.save()

        # remove removed metric profiles
        for mp in group.metricprofiles.all():
            if mp.name not in request.data['items']:
                group.metricprofiles.remove(mp)
                mp.groupname = ''
                mp.save()

        return Response(status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetricProfiles.objects.create(
                name=request.data['name']
            )

            for item in request.data['items']:
                mp = poem_models.MetricProfiles.objects.get(name=item)
                group.metricprofiles.add(mp)
                mp.groupname = group.name
                mp.save()

        except Exception:
            return Response(status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfMetricProfiles.objects.get(
                    name=group
                )
                gr.delete()

                for mp in poem_models.MetricProfiles.objects.filter(
                    groupname=group
                ):
                    mp.groupname = ''
                    mp.save()

                return Response(status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfMetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of metric profiles not found')

            else:
                return Response(status.HTTP_400_BAD_REQUEST)


class ListMetric(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                metrics = poem_models.Metric.objects.filter(name=name)
            except poem_models.Metric.DoesNotExist:
                raise NotFound(status=404,
                               detail='Metric not found')
        else:
            metrics = poem_models.Metric.objects.all()

        results = []
        for metric in metrics:
            config = two_value_inline(metric.config)
            parent = one_value_inline(metric.parent)
            probeexecutable = one_value_inline(metric.probeexecutable)
            attribute = two_value_inline(metric.attribute)
            dependancy = two_value_inline(metric.dependancy)
            flags = two_value_inline(metric.flags)
            files = two_value_inline(metric.files)
            parameter = two_value_inline(metric.parameter)
            fileparameter = two_value_inline(metric.fileparameter)

            if metric.probekey:
                probekey = metric.probekey.id
            else:
                probekey = ''

            results.append(dict(
                id=metric.id,
                name=metric.name,
                tag=metric.tag.name,
                mtype=metric.mtype.name,
                probeversion=metric.probeversion,
                probekey=probekey,
                group=metric.group.name,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependancy=dependancy,
                flags=flags,
                files=files,
                parameter=parameter,
                fileparameter=fileparameter
            ))

            results = sorted(results, key=lambda k: k['name'])

        if name:
            return Response(results[0])
        else:
            return Response(results)

    def put(self, request):
        metric = poem_models.Metric.objects.get(name=request.data['name'])
        config = inline_metric_for_db(request.data['config'])

        if request.data['group'] != metric.group.name:
            metric.group = poem_models.GroupOfMetrics.objects.get(
                name=request.data['group']
            )

        if request.data['tag'] != metric.tag.name:
            metric.tag = poem_models.Tags.objects.get(
                name=request.data['tag']
            )

        if set(config) != set(json.loads(metric.config)):
            metric.config = json.dumps(config)

        metric.save()

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, name):
        if name:
            try:
                metric = poem_models.Metric.objects.get(name=name)
                metric.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Metric.DoesNotExist:
                raise NotFound(status=404, detail='Metric not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListTags(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        tags = poem_models.Tags.objects.all().values_list('name', flat=True)
        return Response(tags)


class ListMetricTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = poem_models.MetricType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)


class ListProbeVersionInfo(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, probekey):
        try:
            version = Version.objects.get(id=probekey)
            data = json.loads(version.serialized_data)[0]['fields']

            return Response(data)

        except Version.DoesNotExist:
            raise NotFound(status=404, detail='Probe version not found')


class ListVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name):
        models = {'probe': Probe}

        try:
            obj = models[obj].objects.get(name=name)
            ct = ContentType.objects.get_for_model(obj)
            vers = Version.objects.filter(object_id=obj.id,
                                          content_type_id=ct.id)

            results = []
            for ver in vers:
                rev = Revision.objects.get(id=ver.revision_id)
                comment = new_comment(rev.comment, obj_id=obj.id,
                                      version_id=ver.id, ctt_id=ct.id)

                results.append(dict(
                    id=ver.id,
                    object_repr=ver.object_repr,
                    fields=json.loads(ver.serialized_data)[0]['fields'],
                    user=json.loads(ver.serialized_data)[0]['fields']['user'],
                    date_created=datetime.datetime.strftime(
                        rev.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    comment=comment,
                    version=json.loads(ver.serialized_data)[0]['fields']['version']
                ))

            results = sorted(results, key=lambda k: k['id'], reverse=True)
            return Response(results)

        except Version.DoesNotExist:
            raise NotFound(status=404, detail='Version not found')
