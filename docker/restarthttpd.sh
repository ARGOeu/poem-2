#!/bin/bash

scl enable httpd24 'killall httpd; sleep 2; httpd'
