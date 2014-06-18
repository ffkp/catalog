/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:user'); // jshint ignore:line

// External modules


// Common modules
var command = require('../../../lib/command');
var gravatar = require('../../../lib/gravatar');


// Core modules
var db = require('./db');


/*
 * Return a function that can be put last in a promise chain to turn a
 * User object into something that can be shared with the rest of the
 * app.
 *
 * TODO: perhaps should use a transform instead, passing the context
 * in the toObject() options?
 * http://mongoosejs.com/docs/api.html#document_Document-toObject
 */
var userFilter = function(context) {
    return function(user) {
        var obj = user.toObject();

        delete obj._id;
        obj.id = user.id;

        if (context.userId !== user.id) {
            // Only user may see the gravatar_email
            delete obj.gravatar_email;
        }

        return obj;
    };
};


/* Error raised when a User object is not found.
 */
var UserNotFoundError = exports.UserNotFoundError = function UserNotFoundError(id) {
    this.message = 'core.User not found: ' + id;
    this.name = "UserNotFoundError";
    Error.captureStackTrace(this, UserNotFoundError);
};

UserNotFoundError.prototype = Object.create(Error.prototype);
UserNotFoundError.prototype.constructor = UserNotFoundError;


/* All command methods return { obj: User(), event: CoreEvent() }.
 *
 * They are exported here just to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a User object.
 *
 * Returns a promise that resolves to the user or null if not found.
 */
exports.get_user = function get_user(context, userId) {
    return db.User.findByIdAsync(userId)
        .then(function(user) {
            if (!user) {
                debug('core.User not found: %s', userId);
                throw new UserNotFoundError(userId);
            }

            return user;
        })
        .then(userFilter(context));
};


/* Create a new User object from a source object with the same
 * properties.
 *
 * An _id property must be included in src, to link users to an
 * already created auth.UserAccess object.
 *
 * Returns a promise that resolves to the new user
 */
exports.create_user = function create_user(context, src) {
    return command.execute(cmd.create, context, src)
        .then(userFilter(context));
};

cmd.create = function command_create_user(context, src) {
    if (!src._id) {
        throw new command.CommandError('src._id missing');
    }

    var dest = {
        _id: src._id,
        added_by: context.userId,
        updated_by: context.userId,
        profile: {},
    };

    command.copyIfSet(src, dest, 'alias');
    command.copyIfSet(src.profile, dest.profile, 'name');
    command.copyIfSet(src.profile, dest.profile, 'email');
    command.copyIfSet(src.profile, dest.profile, 'location');
    command.copyIfSet(src.profile, dest.profile, 'website');
    command.copyIfSet(src.profile, dest.profile, 'gravatar_email');

    // Always set gravatar hash, falling back on object ID
    dest.profile.gravatar_hash = gravatar.emailHash(
        dest.profile.gravatar_email || dest._id.toString());

    var user = new db.User(dest);
    var event = new db.CoreEvent({
        user: user.id,
        type: 'core.User',
        object: user.id,
        events: [{
            type: 'user.created',
            param: { user: user.toObject() },
        }],
    });

    debug('creating new user: %j', user.toObject());

    return { obj: user, event: event };
};


/* Update a User object from a source object.
 *
 * Returns a promise that resolves to the updated user.
 */
exports.update_user = function update_user(context, userId, src) {
    return db.User.findByIdAsync(userId)
        .then(function(user) {
            if (!user) {
                debug('core.User not found: %s', userId);
                throw new UserNotFoundError(userId);
            }

            return command.execute(cmd.update, context, user, src);
        })
        .then(userFilter(context));
};


cmd.update = function command_update_user(context, user, src) {
    // Check permissions
    if (context.userId.toString() !== user.id.toString()) {
        throw new command.PermissionError(context.userId, user.id);
    }

    command.checkVersionConflict(context, user);

    // OK to apply update, so get a new version
    user.increment();

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.User',
        object: user.id,
        events: [],
    });

    command.updateProperty(src, user, 'alias', event, 'user.%s.changed');

    if (typeof src.profile === 'object') {
        command.updateProperty(src.profile, user.profile, 'name',
                               event, 'user.profile.%s.changed');
        command.updateProperty(src.profile, user.profile, 'email',
                               event, 'user.profile.%s.changed');
        command.updateProperty(src.profile, user.profile, 'location',
                               event, 'user.profile.%s.changed');
        command.updateProperty(src.profile, user.profile, 'website',
                               event, 'user.profile.%s.changed');
        if (command.updateProperty(src.profile, user.profile, 'gravatar_email',
                                   event, 'user.profile.%s.changed')) {

            // Update the gravatar hash on email changes
            user.profile.gravatar_hash = gravatar.emailHash(
                user.profile.gravatar_email || user.id);
        }
    }

    return { obj: user, event: event };
};
