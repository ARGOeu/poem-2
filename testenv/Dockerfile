FROM centos:7
MAINTAINER dvrcic@srce.hr

RUN yum -y install epel-release
RUN yum -y makecache; yum -y update
RUN yum install -y \
        git \
        python3 \
        python3-devel \
        python3-pip
RUN pip3 install -U pip
RUN pip3 install -U 'django==2.*'
