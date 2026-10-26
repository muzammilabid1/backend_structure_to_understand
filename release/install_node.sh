#!/bin/bash
cd /var/lwp

if ! command -v n &> /dev/null
then
    # install and set up n
    for i in {1..5}; do curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s auto && break || sleep 15; done
else
    # try up to 5 times to load n
    # known codebuild issue: see https://github.com/tj/n/issues/784
    for i in {1..5}; do n auto && break || sleep 15; done
fi

npm install -g yarn