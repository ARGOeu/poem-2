#!/bin/bash

let tokauthn=0
let keyauthn=1

usage()
{
  printf "Usage: %s [argument]\n" $(basename $0) >&2
  printf "       [-t]        - Github token authn\n" >&2
  printf "       [-k]        - Github SSH key authn (.ssh/id_rsa)\n" >&2
  printf "       [-h]        - usage\n" >&2
  exit 2
}

if [[ $# == 0 ]]
then
    usage
fi

while getopts 'tk' OPTION
do
    case $OPTION in
        t)
            tokauthn=1
            ;;
        k)
            keyauthn=1
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ "${tokauthn}" -gt 0 ]
then
  ssh-keyscan github.com >> .ssh/known_hosts
  bin/chezmoi init https://github.com/vrdel/dotfiles
  bin/chezmoi apply
  rm -rf .local/share/chezmoi
else
  ssh-keyscan github.com >> .ssh/known_hosts
  bin/chezmoi init git@github.com:vrdel/dotfiles
  bin/chezmoi apply
  rm -rf .local/share/chezmoi
fi

