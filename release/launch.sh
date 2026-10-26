#!/bin/bash

if [ "$LWP_BUILD_TYPE" = "production" ]
then
  ./release/prod/launch.sh;
elif [ "$LWP_BUILD_TYPE" = "stage" ]
then
  ./release/stage/launch.sh;
else
  ./release/dev/launch.sh;
fi
