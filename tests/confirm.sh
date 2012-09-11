#!/bin/bash

cd -P `dirname "$0"`

if [ ! -f .online-confirmed ]; then
    echo "WARNING! The online tests will delete ALL ElasticSearch indices on"
    echo "localhost to ensure a clean testing environment."
    echo
    read -p "Do you want to continue and delete all indices? (yes/no): " reply

    if [ "$reply" == "yes" ]; then
        touch .online-confirmed
    else
        echo
        echo "Online tests aborted. Your indices are safe."
        exit 1
    fi
fi
