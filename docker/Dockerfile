FROM rockylinux:9
MAINTAINER dvrcic@srce.hr
ADD https://repository.egi.eu/sw/production/cas/1/current/repo-files/egi-trustanchors.repo /etc/yum.repos.d/
RUN groupadd user -g 1000 && useradd -u 1000 -g 1000 user -m -d /home/user
RUN passwd -d root
RUN sed -i -r 's/bash/zsh/' /etc/passwd; sed -i -r 's/^tsflags/# tsflags/' /etc/yum.conf
RUN dnf -y makecache; dnf -y update; dnf clean all
RUN dnf -y install epel-release rocky-repos && \
    dnf -y install \
      ack \
      ca-policy-egi-core \
      ctags \
      ca-certificates \
      git \
      htop \
      make \
      net-tools \
      nmap \
      psmisc \
      sudo \
      telnet \
      tmux \
      unzip \
      vim \
      wget \
      which \
      zsh
RUN dnf -y makecache
RUN dnf -y install \
      cronie \
      crontabs \
      supervisor \
      xmlsec1 \
      xmlsec1-openssl
#RUN yum -y makecache && yum -y install \
      #httpd24-mod_ssl \
      #rh-python36-mod_wsgi \
      #rh-python36-python-pip
#RUN passwd -d apache; usermod --shell /bin/bash apache
#RUN scl enable rh-python36 'pip install -U pip' && \
    #scl enable rh-python36 'pip3 install virtualenv virtualenvwrapper'
#COPY venv_poem.sh /etc/profile.d/
#COPY scl-psql.sh /etc/profile.d/
#RUN scl enable rh-python36 'source /etc/profile.d/venv_poem.sh; \
    #mkdir -p $WORKON_HOME; \
    #mkvirtualenv poem'
#WORKDIR /home/user
#ADD https://github.com/ARGOeu/poem-2/archive/devel.zip poem-devel.zip
#RUN unzip poem-devel.zip
#WORKDIR poem-2-devel
#RUN source /etc/profile.d/venv_poem.sh; \
    #workon poem; \
    #make wheel-devel; \
    #pip3 install dist/*;
#ADD https://cacerts.digicert.com/TERENAeScienceSSLCA3.crt.pem /etc/pki/tls/certs/
#RUN yum -y install ca-policy-egi-core; \
    #rm -rf /etc/pki/ca-trust/source/anchors/*; \
    #cp /etc/pki/tls/certs/TERENAeScienceSSLCA3.crt.pem /etc/pki/ca-trust/source/anchors; \
    #cp /etc/grid-security/certificates/*.pem /etc/pki/ca-trust/source/anchors; \
    #update-ca-trust
#ADD hostcert.pem hostkey.pem /etc/grid-security/
COPY \
	entrypoint.sh \
	/home/user/
#COPY apache/poem-apache.ini /etc/supervisord.d/
#COPY apache/poem.conf /opt/rh/httpd24/root/etc/httpd/conf.d/
#RUN sed -r -i 's/(^SSLCertificate.*)/# \1/' /opt/rh/httpd24/root/etc/httpd/conf.d/ssl.conf; \
    #sed -r -i 's/(^SSLCACertificate.*)/# \1/' /opt/rh/httpd24/root/etc/httpd/conf.d/ssl.conf
#RUN ./setup.sh
RUN echo "user ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers
USER user
WORKDIR /home/user
RUN sudo python3.9 -m venv /opt/poem
RUN curl -sfL https://git.io/chezmoi | sh
COPY chezmoi-config-apply.sh /home/user
ENTRYPOINT ["/home/user/entrypoint.sh"]
