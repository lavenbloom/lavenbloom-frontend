#!/bin/sh
echo "window.__env__ = {" > /usr/share/nginx/html/env-config.js
env | grep REACT_APP_ | while read line; do
key=$(echo "$line" | cut -d '=' -f1)
value=$(echo "$line" | cut -d '=' -f2-)
echo "  $key: \"$value\"," >> /usr/share/nginx/html/env-config.js
done
echo "};" >> /usr/share/nginx/html/env-config.js
