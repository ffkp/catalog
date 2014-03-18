This is very early proof-of-concept work on the Commons Machinery metadata catalog. Nothing interesting here so far.

Requirements
============

* Python 2.7, virtualenv, pip
* RabbitMQ
* Node.js
* GCC (to build Redis)
* Redland

The catalog uses celery and redis internally. Those are built and installed locally under build/backend

Installing prerequisites
------------------------

On Ubuntu:

    sudo apt-get install rabbitmq-server python-virtualenv build-essential python2.7-dev librdf0-dev swig autoconf automake libtool curl

Make sure that Node.js is installed to run the frontend.

Deploying locally
=================

Run the following command to setup virtualenv under build/backend with all the required dependencies.

    sh ./bootstrap.sh

Backend
-------

To enter virtualenv (set certain environment variables) use:

    source build/backend/bin/activate

Install the backend inside virtualenv:

    cd backend
    python setup.py install
    cd ..

Run `./run_local.sh` to simultaneously start frontend and backend, or run them separately:

    celery -A catalog worker --loglevel=info

Data and event log will be saved under `./data`.

Frontend
--------

Install all the frontend dependencies:

    cd frontend
    npm install
    ./volo

Run it using `./run_local.sh` to start the frontend together with backend or use the command below
in a separate shell:

    node server.js


Using
=====

REST API
--------

List works:

    curl -H 'Accept: application/json' http://localhost:8004/works

Filter works:

    curl -H http://localhost:8004/works?visibility=public

Create a work (the subject in the metadata will be rewritten to the
generated subject):

    curl -v -X POST -d '{"visibility":"public", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "Example Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' http://localhost:8004/works

Get a work:

    curl -H 'Accept: application/json' http://localhost:8004/works/1392318412903

Update a work:

    curl -X PUT -d '{"state":"published", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "New Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' -H 'Accept: application/json' http://localhost:8004/works/1392318412903

Delete a work:

    curl -v -X DELETE http://localhost:8004/works/1392318412903

Add a source:

    curl -v -X POST -d '{"metadataGraph": { "about:resource": { "http://purl.org/dc/terms/provenance":[{"value":"Old Conditions Here","type": "literal"} ] } } }' -H 'Content-type: application/json' http://localhost:8004/works/1392318412903/sources

Update a source:

    curl -X PUT -d '{"metadataGraph": {"about:resource": {"http://purl.org/dc/terms/provenance":[{"value":"New Conditions Here","type": "literal"}]}}}' http://localhost:8004/works/1392318412903/sources/1

Add post:

    curl -v -X POST -d '{"resource":"http://example.com/post1"}' -H 'Content-type: application/json' http://localhost:8004/works/1392318412903/posts

Delete source or post:

     curl -v -X DELETE http://localhost:8004/works/1392318412903/sources/12345
     curl -v -X DELETE http://localhost:8004/works/1392318412903/posts/12345

Query SPARQL endpoint:

    curl -g -H 'Accept: application/json' 'http://localhost:8004/sparql?query=SELECT+?s+?p+?o+WHERE+{?s+?p+?o}+LIMIT+50'
