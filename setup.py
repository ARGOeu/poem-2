from setuptools import setup, find_packages
import os

NAME = 'poem'


def get_files(install_prefix, directory):
    files = []
    for root, _, filenames in os.walk(directory):
        subdir_files = []
        for filename in filenames:
            subdir_files.append(os.path.join(root, filename))
        if filenames and subdir_files:
            files.append((os.path.join(install_prefix, root), subdir_files))
    return files


setup(name=NAME,
      version='3.3.2',
      description='Reports, Profiles, Probes and Metric Configuration Management (POEM) for ARGO Monitoring framework.',
      author='SRCE',
      author_email='dvrcic@srce.hr, kzailac@srce.hr',
      license='Apache License 2.0',
      long_description=open('README.md').read(),
      long_description_content_type='text/markdown',
      url='https://github.com/ARGOeu/poem-2',
      classifiers=(
          "Programming Language :: Python :: 3",
          "License :: OSI Approved :: Apache Software License",
          "Operating System :: POSIX :: Linux",
      ),
      scripts=['bin/poem-syncservtype', 'bin/poem-db', 'bin/poem-genseckey',
               'bin/poem-manage', 'bin/poem-token', 'bin/poem-tenant',
               'bin/poem-clearsessions'],
      data_files=[
          ('etc/poem', ['etc/poem.conf.template', 'etc/poem_logging.conf']),
          ('etc/cron.d/', ['cron/poem-sync', 'cron/poem-clearsessions', 'cron/poem-db_backup']),
          ('etc/logrotate.d/', ['logrotate.d/poem-db_backup']),
          ('etc/httpd/conf.d', ['poem/apache/poem.conf']),
          ('usr/share/poem/apache', ['poem/apache/poem.wsgi']),
          ('var/log/poem', ['helpers/empty']),
          ('var/lib/poem', ['helpers/empty']),
          ('var/db_backups', ['helpers/empty']),
      ] + get_files('usr/share/', 'poem/static'),
      include_package_data=True,
      package_dir={'Poem': 'poem/Poem'},
      packages=find_packages('poem/'),
)
