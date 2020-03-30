from queue import Queue

from Poem.poem import models as poem_models

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication


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


class ListServices(APIView):
    authentication_classes = (SessionAuthentication,)

    def __init__(self):
        super().__init__()
        self.tree = Tree()

    def _is_one_probe_found(self, metrics):
        found_metrics = poem_models.Metric.objects.filter(name__in=metrics)

        for metric in found_metrics:
            if metric.probekey:
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
                    data['service_type'].append((st.name(),
                                                 self._count_leaves(st)))
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

        for (service_category, service_name, service_type) in \
                poem_models.Service.objects.all().values_list(
                    'service_category', 'service_name', 'service_type'):
            metricinstances = poem_models.MetricInstance.objects.filter(
                service_flavour=service_type
            )
            unique_metrics = sorted(list(set(
                m.metric for m in metricinstances
            )))

            if unique_metrics and self._is_one_probe_found(unique_metrics):
                found_metrics = poem_models.Metric.objects.filter(
                    name__in=unique_metrics
                )

                sat = self._get_or_create(r, service_category)
                snt = self._get_or_create(sat, service_name)
                stt = self._get_or_create(snt, service_type)

                for metric in found_metrics:
                    if metric.probekey:
                        mt = self.tree.addchild(metric.name, stt)
                        self.tree.addchild(metric.probekey.__str__(), mt)

        nleaves = self._count_leaves(r)
        nleaves_perelem = self._count_leaves_per_element(r)
        table_rows = self._create_empty_table_rows(nleaves)
        self._fill_rows(table_rows, nleaves_perelem, nleaves)

        return Response({'result': {
            'rows': table_rows,
            'rowspan': nleaves_perelem
        }})
