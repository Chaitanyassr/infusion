/*
Copyright 2015 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt

*/

/* global fluid, jqUnit, speechSynthesis */

(function () {
    "use strict";

    fluid.registerNamespace("fluid.tests");

    fluid.defaults("fluid.tests.textToSpeech", {
        gradeNames: ["fluid.textToSpeech"],
        model: {
            utteranceOpts: {
                // not all speech synthesizers will respect this setting
                volume: 0
            }
        },
        listeners: {
            "onCreate.cleanUp": "fluid.tests.textToSpeech.cleanUp"
        }
    });

    fluid.tests.textToSpeech.cleanUp = function () {
        if(fluid.textToSpeech.isSupported()) {
            speechSynthesis.cancel();
        }
    };

    fluid.defaults("fluid.tests.textToSpeech.ttsTestEnvironment", {
        gradeNames: "fluid.test.testEnvironment",
        components: {
            tts: {
                type: "fluid.tests.textToSpeech",
                createOnEvent: "{ttsTester}.events.onTestCaseStart"
            },
            ttsTester: {
                type: "fluid.tests.textToSpeech.ttsTester"
            }
        }
    });

    fluid.defaults("fluid.tests.textToSpeech.ttsTester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [
            {
                name: "Initialization",
                tests: [{
                    expect: 4,
                    name: "Test initialization",
                    sequence:
                    [{
                        func: "fluid.tests.textToSpeech.testInitialization",
                        args: ["{tts}"]
                    }]
                }],

            },
            {
                name: "Start and Stop Events",
                tests: [{
                    expect: 10,
                    name: "Test Start and Stop Events",
                    sequence:
                    [{
                        func: "{tts}.queueSpeech",
                        args: "Testing start and end events"
                    }, {
                        listener: "fluid.tests.textToSpeech.testStart",
                        args: ["{tts}"],
                        event: "{tts}.events.onStart"
                    }, {
                        listener: "fluid.tests.textToSpeech.testStop",
                        args: ["{tts}"],
                        event: "{tts}.events.onStop"
                    }]
                }]
            },
            {
                name: "Test Including Pause and Resume Events",
                tests: [{
                    expect: 13,
                    name: "Test Including Pause and Resume Events",
                    sequence:
                    [
                        {
                            func: "{tts}.queueSpeech",
                            args: "Testing pause and resume events"
                        },
                        // This is necessary or {tts}.pause can be called
                        // before the speech event has actually started,
                        // which messes up the sequencing
                        {
                            listener: "fluid.tests.textToSpeech.asyncSpeechControl",
                            args: ["{tts}.pause", 0.05],
                            event: "{tts}.events.onStart"
                        },
                        {
                            listener: "fluid.tests.textToSpeech.testPause",
                            args: ["{tts}"],
                            event: "{tts}.events.onPause"
                        },
                        {
                            func: "fluid.tests.textToSpeech.asyncSpeechControl",
                            args: ["{tts}.resume", 0.05]
                        }, {
                            listener: "fluid.tests.textToSpeech.testResume",
                            args: ["{tts}"],
                            event: "{tts}.events.onResume"
                        },
                        // Test on stop to make sure IoC harness doesn't try
                        // and destroy too early for the asynchronous onStop
                        // event to fire and cause issues
                        {
                            listener: "fluid.tests.textToSpeech.testStop",
                            args: ["{tts}"],
                            event: "{tts}.events.onStop"
                        }
                    ]
                }]
            }]
    });

    //  We need to issue controls asynchronously to manage race conditions,
    // since speech events themselves are asynchronous
    // this also simulates the typical scenario of user interaction
    // with speech controls through a UI
    fluid.tests.textToSpeech.asyncSpeechControl = function (control, delay) {
        setTimeout(control, delay);
    };

    fluid.tests.textToSpeech.testInitialization = function (tts) {
        var that = tts;
        jqUnit.assertTrue("The Text to Speech component should have initialized", that);
        jqUnit.assertFalse("Nothing should be speaking", that.model.speaking);
        jqUnit.assertFalse("Nothing should be pending", that.model.pending);
        jqUnit.assertFalse("Shouldn't be paused", that.model.paused);
    };

    fluid.tests.textToSpeech.testStart = function (tts) {
        var that = tts;
        jqUnit.assert("The onStart event should have fired");
        jqUnit.assertTrue("Should be speaking", that.model.speaking);
        jqUnit.assertFalse("Nothing should be pending", that.model.pending);
        jqUnit.assertFalse("Shouldn't be paused", that.model.paused);
        jqUnit.assertDeepEq("The queue should be empty", [], that.queue);
    };

    fluid.tests.textToSpeech.testStop = function (tts) {
        var that = tts;
        jqUnit.assert("The onStop event should have fired");
        jqUnit.assertFalse("Should not be speaking", that.model.speaking);
        jqUnit.assertFalse("Nothing should be pending", that.model.pending);
        jqUnit.assertFalse("Shouldn't be paused", that.model.paused);
        jqUnit.assertDeepEq("The queue should be empty", [], that.queue);
        that.cancel();
    };

    fluid.tests.textToSpeech.testPause = function (tts) {
        var that = tts;
        jqUnit.assert("The pause event should have fired");
        jqUnit.assertTrue("Should be speaking", that.model.speaking);
        jqUnit.assertFalse("Nothing should be pending", that.model.pending);
        jqUnit.assertTrue("Should be paused", that.model.paused);
    };

    fluid.tests.textToSpeech.testResume = function (tts) {
        var that = tts;
        jqUnit.assert("The resume event should have fired");
        jqUnit.assertTrue("Should be speaking", that.model.speaking);
        jqUnit.assertFalse("Nothing should be pending", that.model.pending);
        jqUnit.assertFalse("Shouldn't be paused", that.model.paused);
    };

    fluid.tests.textToSpeech.issueTest = function (testFunc) {
        var runTests = fluid.textToSpeech.checkTTSSupport();
        runTests.then(function () {
            testFunc();
        }, fluid.tests.textToSpeech.bypassTest);
    };

    fluid.tests.textToSpeech.bypassTest = function () {
        jqUnit.test("Tests were skipped - browser does not appear to support TTS", function () {
            jqUnit.assert("TESTS SKIPPED - browser does not support SpeechSynthesis");
        });
    };

    fluid.tests.textToSpeech.issueTest(fluid.tests.textToSpeech.ttsTestEnvironment);

})();
