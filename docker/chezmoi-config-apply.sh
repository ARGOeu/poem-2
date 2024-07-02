#!/bin/bash

bin/chezmoi init git@github.com:vrdel/dotfiles
bin/chezmoi apply
rm -rf .local/share/chezmoi
