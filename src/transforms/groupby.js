/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

// var Lib = require('@src/lib');
var Lib = require('../lib');

/* eslint no-unused-vars: 0*/


// so that Plotly.register knows what to do with it
exports.moduleType = 'transform';

// determines to link between transform type and transform module
exports.name = 'groupby';

// ... as trace attributes
exports.attributes = {
    active: {
        valType: 'boolean',
        dflt: true
    },
    groups: {
        valType: 'data_array',
        dflt: []
    },
    style: {
        valType: 'any',
        dflt: {}
    }
};

/**
 * Supply transform attributes defaults
 *
 * @param {object} transformIn
 *  object linked to trace.transforms[i] with 'type' set to exports.name
 * @param {object} fullData
 *  the plot's full data
 * @param {object} layout
 *  the plot's (not-so-full) layout
 *
 * @return {object} transformOut
 *  copy of transformIn that contains attribute defaults
 */
exports.supplyDefaults = function(transformIn, fullData, layout) {
    var transformOut = {};

    function coerce(attr, dflt) {
        return Lib.coerce(transformIn, transformOut, exports.attributes, attr, dflt);
    }

    var active = coerce('active');

    if(!active) return transformOut;

    coerce('groups');
    coerce('style');

    // or some more complex logic using fullData and layout

    return transformOut;
};

/**
 * Apply transform !!!
 *
 * @param {array} data
 *  array of transformed traces (is [fullTrace] upon first transform)
 *
 * @param {object} state
 *  state object which includes:
 *      - transform {object} full transform attributes
 *      - fullTrace {object} full trace object which is being transformed
 *      - fullData {array} full pre-transform(s) data array
 *      - layout {object} the plot's (not-so-full) layout
 *
 * @return {object} newData
 *  array of transformed traces
 */
exports.transform = function(data, state) {

    // one-to-many case

    var newData = [];

    data.forEach(function(trace, i) {

        newData = newData.concat(transformOne(trace, state, state.attributeSets[i]));
    });

    return newData;
};

function transformOne(trace, state, attributeSet) {

    var opts = state.transform;
    var groups = trace.transforms[state.transformIndex].groups;

    var groupNames = groups.filter(function(g, i, self) {
        return self.indexOf(g) === i;
    });

    var newData = new Array(groupNames.length);
    var len = groups.length;

    var style = opts.style || {};

    var topLevelAttributes = attributeSet
        .filter(function(array) {return Array.isArray(getDeepProp(trace, array));});

    var initializeArray = function(newTrace, a) {
        setDeepProp(newTrace, a, []);
    };

    var pasteArray = function(newTrace, trace, j, a) {
        getDeepProp(newTrace, a).push(getDeepProp(trace, a)[j]);
    };

    // fixme the O(n**3) complexity
    for(var i = 0; i < groupNames.length; i++) {
        var groupName = groupNames[i];

        // TODO is this the best pattern ???
        // maybe we could abstract this out
        var newTrace = newData[i] = Lib.extendDeep({}, trace);

        topLevelAttributes.forEach(initializeArray.bind(null, newTrace));

        for(var j = 0; j < len; j++) {
            if(groups[j] !== groupName) continue;

            topLevelAttributes.forEach(pasteArray.bind(0, newTrace, trace, j));
        }

        newTrace.name = groupName;

        //  there's no need to coerce style[groupName] here
        // as another round of supplyDefaults is done on the transformed traces
        newTrace = Lib.extendDeep(newTrace, style[groupName] || {});
    }

    return newData;
}

function getDeepProp(thing, propArray) {
    var result = thing;
    var i;
    for(i = 0; i < propArray.length; i++) {
        result = result[propArray[i]];
        if(result === void(0)) {
            return result;
        }
    }
    return result;
}

function setDeepProp(thing, propArray, value) {
    var current = thing;
    var i;
    for(i = 0; i < propArray.length - 1; i++) {
        if(current[propArray[i]] === void(0)) {
            current[propArray[i]] = {};
        }
        current = current[propArray[i]];
    }
    current[propArray[propArray.length - 1]] = value;
}
