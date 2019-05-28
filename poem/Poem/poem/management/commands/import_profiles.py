from optparse import make_option
import sys
import Poem.django_logging
import logging

from django.core.management.base import BaseCommand, CommandError

from Poem.poem.management.update_profile import PoemSync
from Poem.poem.models import Profile

logging.basicConfig(format='poem-importprofiles[%(process)s]: %(levelname)s %(message)s')
logger = logging.getLogger('POEMIMPORTPROFILES')

class Command(BaseCommand):
    args = '[<space separated list of profiles to import>]'
    help = 'Import profiles to POEM (from URL containing JSON encoded List)'

    def add_arguments(self, parser):
        parser.add_argument('--url',
                             action='store',
                             help='URL containing JSON encoded list of profiles',
                             dest='url',
                             default=None)
        parser.add_argument('--initial',
                             action='store_true',
                             help='Only import profiles if poem database is empty',
                             dest='is_initial',
                             default=False)

    def handle(self, *args, **options):
        if not options.get('url'):
            raise CommandError('Usage is --url <url> %s' % self.args)

        logger.info( "Running synchronizer for POEM sync (%s)" % options.get('url'))

        if options.get('is_initial') and Profile.objects.all():
            logger.warning('Database already contains profiles .. skipping.')
            sys.exit(0)

        try:
            sync_ob = PoemSync(profile_list=args)
            sync_ob.sync_profile_list_from_url(url=options.get('url'))
        except Exception as e:
            logger.error('Exception occured while trying to import profiles (%s)' % str(e))
            sys.exit(2)
