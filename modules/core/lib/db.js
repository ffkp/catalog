/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:db'); // jshint ignore:line

// External libs
var _ = require('underscore');

// Common libs
var config = require('../../../lib/config');
var mongo = require('../../../lib/mongo');

// Modules
var event = require('../../event/event');

var ObjectId = mongo.Schema.Types.ObjectId;

// We need a connection, but not necessarily an open one, to
// define the models
var conn = mongo.connection();

// Common fields in Entry objects
var entry = {
    added_by: { type: ObjectId, required: true, ref: 'User' },
    added_at: { type: Date, default: Date.now },
    updated_by: { type: ObjectId, required: true, ref: 'User' },
    updated_at: { type: Date, default: Date.now },
};


// Subdocuments

var profile = {
    name: 'string',
    email: 'string',
    location: 'string',
    website: 'string',
    gravatar_email: 'string',
    gravatar_hash: { type: 'string', required: true },
};

/*var property = {
    propertyName: { type: 'string', required: true },
    value: { type: 'string', required: true },
    language: 'string',
    sourceFormat: 'string',
    fragmentIdentifier: 'string',
    mappingType: 'string',
    extended: ,
};*/

var annotation = {
    updated_by: { type: ObjectId, required: true, ref: 'User' },
    updated_at: { type: Date, default: Date.now },
    score: 'number',
    property: {
        type: mongo.Types.Mixed,
        validate: [{
            validator: function(property) {
                return property.hasOwnProperty('propertyName');
            }, msg: 'property.propertyName is required.',
        }, {
            validator: function(property) {
                return property.hasOwnProperty('value');
            }, msg: 'property.value is required.'
        }]
    },
};

// Core models

exports.CoreEvent = conn.model('CoreEvent', event.EventBatchSchema);

exports.User = conn.model(
    'User',
    mongo.schema(_.extend({}, entry, {
        alias: {
            type: String,
            index: {
                unique: true,
                sparse: true,
            }
        },

        profile: profile,
    }))
);

exports.Media = conn.model(
    'Media',
    mongo.schema({
        added_by: { type: ObjectId, required: true, ref: 'User' },
        added_at: { type: Date, default: Date.now },
        replaces: { type: ObjectId, ref: 'Media',
            index: {
                sparse: true,
            }
        },
        annotations: [annotation],
        metadata: {
            rdf: String,
            exif: Buffer,
            xmp: String,
            oembed: String,
        },
    })
);

// Connect, returning a promise that resolve when connected

exports.connect = function connect() {
    return mongo.openConnection(conn, config.core.db).return(true);
};
