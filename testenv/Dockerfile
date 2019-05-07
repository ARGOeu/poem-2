FROM centos:7
MAINTAINER dvrcic@srce.hr 
RUN yum -y install \
      git \
      unzip \
      psmisc \
      which
RUN yum -y install \
      centos-release-scl \
      cronie \
      crontabs \
      scl-utils \
      xmlsec1 \
      xmlsec1-openssl
RUN yum -y makecache && yum -y install \
      rh-python36-python-pip \
      rh-python36-mod_wsgi \
      httpd24-mod_ssl
RUN scl enable rh-python36 'pip install -U pip' && \
    scl enable rh-python36 'pip3 install virtualenv virtualenvwrapper'
COPY venv_poem.sh /etc/profile.d/
RUN scl enable rh-python36 'source /etc/profile.d/venv_poem.sh; \
    mkdir -p $WORKON_HOME; \
    mkvirtualenv poem'      
WORKDIR /root
COPY secret_key ./ 
COPY poem.conf ./ 
COPY settings.py ./ 
COPY setup_test.sh ./
COPY execute-tests /usr/bin/ 
