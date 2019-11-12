
from setuptools import setup, find_packages
import os
import sys

NAME='poem'

def get_files(install_prefix, directory):
    files = []
    for root, _, filenames in os.walk(directory):
        subdir_files = []
        for filename in filenames:
            subdir_files.append(os.path.join(root, filename))
        if filenames and subdir_files:
            files.append((os.path.join(install_prefix, root), subdir_files))
    return files

poem_media_files = get_files("usr/share", "poem/media") + get_files("usr/share/", "poem/static")

setup(name=NAME,
    version='3.0.0',
    description='Profiles, Probes and Metric Configuration Management (POEM) for ARGO Monitoring framework.',
    author='SRCE',
    author_email='dvrcic@srce.hr, kzailac@srce.hr',
    license='Apache License 2.0',
    long_description=open('README.md').read(),
    long_description_content_type = 'text/markdown',
    url='https://github.com/ARGOeu/poem',
    classifiers=(
          "Programming Language :: Python :: 3",
          "License :: OSI Approved :: Apache Software License",
          "Operating System :: POSIX :: Linux",
      ),
    scripts = ['bin/poem-syncmetricinstances', 'bin/poem-syncservtype',
               'bin/poem-db', 'bin/poem-genseckey',
               'bin/poem-token', 'bin/poem-syncservices', 'bin/poem-tenant'],
    data_files = [
        ('etc/poem', ['etc/poem.conf', 'etc/poem_logging.conf']),
        ('etc/cron.d/', ['cron/poem-sync', 'cron/poem-clearsessions']),
        ('etc/httpd/conf.d', ['poem/apache/poem.conf']),
        ('usr/share/poem/apache', ['poem/apache/poem.wsgi']),
        ('var/log/poem', ['helpers/empty']),
        ('var/lib/poem', ['helpers/empty']),
    ] + poem_media_files,
    include_package_data=True,
    package_dir = {'Poem': 'poem/Poem'},
    packages=find_packages('poem/'),
)
