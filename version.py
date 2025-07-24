import os

VERSION = "3.5.1"

build_ver = os.environ.get('BUILD_VER')

if build_ver:
    vernum = build_ver
else:
    vernum = VERSION
